/**
 * Server-only BookingQube HTTP client.
 * Prefers full GET/POST URLs from admin settings; falls back to legacy base + endpoints.
 */
import "server-only";

import type { BookingQubeCustomEndpoint, BookingQubeHttpMethod } from "@/lib/bookingqube.constants";
import {
  formatBookingQubeSubmitErrorSummary,
  isFlatRegistrationsArray,
  sanitizeSubmitRequestBody,
  type BookingQubeSchemaField,
  type SubmitRegistrationPayload,
} from "@/lib/bookingqube.mapping";
import { buildBookingQubeUrl, resolveBookingQubeFullUrl } from "@/lib/bookingqube.urls";

export { BOOKINGQUBE_API_KEY_HINT } from "@/lib/bookingqube.constants";

/** Resolve API key: stored settings value, optional inline override, then env. */
export function resolveBookingQubeApiKeyFromConfig(
  config: Pick<BookingQubeConfig, "apiKey">,
  inlineKey?: string | null,
): string | null {
  return inlineKey?.trim() || config.apiKey?.trim() || null;
}

/** No-op — API key is optional; auth headers are added only when a key is set. */
export function assertBookingQubeApiKey(_apiKey: string | null | undefined): void {}

export type { SubmitRegistrationPayload } from "@/lib/bookingqube.mapping";

export type BookingQubeFormField = {
  id: string;
  label: string;
  type?: string;
  name?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
};

export type BookingQubeFormSchema = {
  eventId?: string;
  slug?: string;
  title?: string;
  fields: BookingQubeFormField[];
  /** Set when GET succeeded with event metadata but no form fields in the payload. */
  fieldsWarning?: string;
  raw: unknown;
};

export type BookingQubeConfig = {
  getApiUrl: string | null;
  postApiUrl: string | null;
  registrationEventSlug: string | null;
  apiKey: string | null;
  /** @deprecated Legacy base URL + version + custom endpoints */
  baseUrl: string;
  defaultFormId: string | null;
  apiVersion: string;
  endpoints: BookingQubeCustomEndpoint[];
};

const DEFAULT_FORM_FETCH_PATH = "/registration-form/{formId}";
const DEFAULT_SUBMIT_PATH = "/registration-form/submit";

function endpointByRole(
  endpoints: BookingQubeCustomEndpoint[],
  role: BookingQubeCustomEndpoint["role"],
): BookingQubeCustomEndpoint | undefined {
  return endpoints.find((e) => e.role === role);
}

function resolvePathTemplate(path: string, vars: Record<string, string>): string {
  let out = path;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, encodeURIComponent(value));
  }
  return out;
}

function authHeaders(apiKey: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (apiKey?.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
    headers["X-API-Key"] = apiKey.trim();
  }
  return headers;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function normalizeField(raw: unknown, index: number): BookingQubeFormField | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id =
    pickString(o, ["id", "field_id", "fieldId", "name", "key"]) ?? `field_${index}`;
  const label =
    pickString(o, ["label", "title", "field_label", "fieldLabel", "field_name", "name"]) ?? id;
  const type = pickString(o, ["type", "field_type", "fieldType"]);
  const name = pickString(o, ["name", "field_name", "key"]);
  const required = o.required === true || o.is_required === true;
  let options: BookingQubeFormField["options"];
  const opts = o.options ?? o.choices ?? o.values;
  if (Array.isArray(opts)) {
    options = opts
      .map((opt, i) => {
        const r = asRecord(opt);
        if (r) {
          const value = pickString(r, ["value", "id", "key"]) ?? String(i);
          const optLabel = pickString(r, ["label", "title", "name"]) ?? value;
          return { value, label: optLabel };
        }
        if (typeof opt === "string") return { value: opt, label: opt };
        return null;
      })
      .filter(Boolean) as BookingQubeFormField["options"];
  }
  return { id, label, type, name, required, options };
}

function firstNonEmptyArray(candidates: unknown[]): unknown[] {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

/** True when normalized schema includes event metadata from a GET payload. */
export function schemaHasEventMetadata(schema: Pick<BookingQubeFormSchema, "eventId" | "slug" | "title">): boolean {
  return Boolean(schema.eventId?.trim() || schema.slug?.trim() || schema.title?.trim());
}

/** Normalize GET response — shape may vary; we accept several common layouts. */
export function normalizeFormSchema(body: unknown): BookingQubeFormSchema {
  const root = asRecord(body) ?? {};
  const data = asRecord(root.data) ?? root;
  const eventBlock =
    asRecord(data.event) ??
    asRecord(data.form) ??
    asRecord(root.event) ??
    asRecord(root.form);
  const eventForm = eventBlock ? asRecord(eventBlock.form) : null;
  const dataForm = asRecord(data.form) ?? asRecord(data.registration_form) ?? asRecord(data.registrationForm);

  const eventId =
    pickString(data, ["event_id", "eventId", "id"]) ??
    (eventBlock ? pickString(eventBlock, ["id", "event_id", "eventId"]) : undefined);
  const slug =
    pickString(data, ["slug", "form_slug", "formSlug"]) ??
    (eventBlock ? pickString(eventBlock, ["slug", "form_slug", "formSlug"]) : undefined);
  const title =
    pickString(data, ["title", "name", "event_name", "eventName"]) ??
    (eventBlock ? pickString(eventBlock, ["title", "name", "event_name", "eventName"]) : undefined);

  const registrationForm =
    asRecord(data.registration_form) ??
    asRecord(data.registrationForm) ??
    (eventBlock ? asRecord(eventBlock.registration_form) ?? asRecord(eventBlock.registrationForm) : null);

  const rawFields = firstNonEmptyArray([
    data.registration_form_fields,
    root.registration_form_fields,
    eventBlock?.registration_form_fields,
    eventBlock?.registrationFormFields,
    registrationForm?.registration_form_fields,
    registrationForm?.registrationFormFields,
    eventBlock?.fields,
    eventBlock?.form_fields,
    eventBlock?.formFields,
    eventBlock?.registration_fields,
    eventBlock?.registrationFields,
    eventBlock?.questions,
    eventBlock?.custom_fields,
    eventBlock?.customFields,
    eventForm?.fields,
    eventForm?.form_fields,
    eventForm?.formFields,
    registrationForm?.fields,
    registrationForm?.form_fields,
    registrationForm?.formFields,
    registrationForm?.registration_fields,
    data.fields,
    data.form_fields,
    data.formFields,
    data.registration_fields,
    data.registrationFields,
    data.questions,
    data.custom_fields,
    data.customFields,
    dataForm?.fields,
    dataForm?.form_fields,
    dataForm?.formFields,
    root.fields,
    root.form_fields,
    root.formFields,
    root.registration_fields,
  ]);

  const fields = rawFields
    .map((f, i) => normalizeField(f, i))
    .filter((f): f is BookingQubeFormField => !!f);

  return {
    eventId,
    slug,
    title,
    fields,
    raw: body,
  };
}

function eventLoadedFieldsWarning(schema: BookingQubeFormSchema): string | undefined {
  if (schema.fields.length > 0 || !schemaHasEventMetadata(schema)) return undefined;
  const idPart = schema.eventId ? `id ${schema.eventId}` : schema.slug ? `slug “${schema.slug}”` : "event";
  return `Event loaded (${idPart}); no form fields in response`;
}

function bodySnippet(body: unknown, max = 240): string {
  try {
    const s = typeof body === "string" ? body : JSON.stringify(body);
    return s.length > max ? `${s.slice(0, max)}…` : s;
  } catch {
    return String(body);
  }
}

export function formatBookingQubeValidationErrors(
  body: unknown,
  schemaFields?: BookingQubeSchemaField[],
): string | null {
  const submitSummary = formatBookingQubeSubmitErrorSummary(body, schemaFields);
  if (submitSummary) return submitSummary;

  const root = asRecord(body);
  if (!root) return null;

  const lines: string[] = [];
  const errors = root.errors;
  if (Array.isArray(errors)) {
    for (const item of errors) {
      if (typeof item === "string" && item.trim()) {
        lines.push(item.trim());
        continue;
      }
      const row = asRecord(item);
      if (!row) continue;
      const field =
        (typeof row.field === "string" && row.field) ||
        (typeof row.attribute === "string" && row.attribute) ||
        (typeof row.key === "string" && row.key) ||
        null;
      const msg =
        (typeof row.message === "string" && row.message) ||
        (typeof row.error === "string" && row.error) ||
        (typeof row.detail === "string" && row.detail) ||
        null;
      if (field && msg) lines.push(`${field}: ${msg}`);
      else if (msg) lines.push(msg);
    }
  }

  const nested = asRecord(root.data);
  if (lines.length === 0 && nested && Array.isArray(nested.errors)) {
    return formatBookingQubeValidationErrors({ errors: nested.errors }, schemaFields);
  }

  return lines.length ? lines.join("; ") : null;
}

export class BookingQubeHttpError extends Error {
  readonly status: number;
  readonly url: string;
  readonly body: unknown;
  readonly request?: unknown;

  constructor(input: {
    message: string;
    status: number;
    url: string;
    body: unknown;
    request?: unknown;
  }) {
    super(input.message);
    this.name = "BookingQubeHttpError";
    this.status = input.status;
    this.url = input.url;
    this.body = input.body;
    this.request = input.request;
  }
}

export function formatBookingQubeHttpError(input: {
  method: string;
  url: string;
  status: number;
  body: unknown;
  context?: string;
  schemaFields?: BookingQubeSchemaField[];
}): string {
  const root = asRecord(input.body);
  const validationDetail = formatBookingQubeValidationErrors(input.body, input.schemaFields);
  const apiMsg =
    (typeof root?.message === "string" && root.message) ||
    (typeof root?.error === "string" && root.error) ||
    (typeof root?.title === "string" && root.title) ||
    null;
  const snippet = bodySnippet(input.body);
  const parts = [
    input.context ?? `BookingQube ${input.method} failed`,
    `HTTP ${input.status}`,
    input.url,
  ];
  if (validationDetail) parts.push(validationDetail);
  else if (apiMsg) parts.push(apiMsg);
  else if (snippet && snippet !== "{}") parts.push(snippet);
  return parts.join(" — ");
}

async function requestUrl(
  url: string,
  method: BookingQubeHttpMethod,
  apiKey: string | null,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: authHeaders(apiKey),
      cache: "no-store",
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `BookingQube ${method} network error — ${url} — ${detail}. Check the URL and that the server can reach BookingQube.`,
    );
  }
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { message: text };
  }
  return { status: res.status, body: parsed };
}

async function requestBookingQube(
  config: BookingQubeConfig,
  method: BookingQubeHttpMethod,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  const url = buildBookingQubeUrl(config.baseUrl, config.apiVersion, path);
  return requestUrl(
    url,
    method,
    config.apiKey,
    method === "GET" || method === "DELETE" ? undefined : (body ?? {}),
  );
}

export async function callBookingQubeEndpoint(
  config: BookingQubeConfig,
  endpoint: Pick<BookingQubeCustomEndpoint, "method" | "path">,
  options?: { body?: unknown; pathVars?: Record<string, string> },
): Promise<{ ok: boolean; status: number; message: string; body: unknown }> {
  const path = options?.pathVars
    ? resolvePathTemplate(endpoint.path, options.pathVars)
    : endpoint.path;
  const { status, body } = await requestBookingQube(
    config,
    endpoint.method,
    path,
    endpoint.method === "GET" || endpoint.method === "DELETE" ? undefined : (options?.body ?? {}),
  );
  const root = asRecord(body);
  const ok = status >= 200 && status < 300;
  const message =
    (root?.message as string) ??
    (root?.error as string) ??
    (ok ? `OK (${status})` : `Request failed (${status})`);
  return { ok, status, message, body };
}

function slugVars(config: BookingQubeConfig, formIdOrSlug: string): Record<string, string> {
  return {
    slug: formIdOrSlug,
    formId: formIdOrSlug,
    eventId: formIdOrSlug,
  };
}

function resolveGetUrl(config: BookingQubeConfig, formIdOrSlug: string): string {
  if (config.getApiUrl?.trim()) {
    return resolveBookingQubeFullUrl(config.getApiUrl, slugVars(config, formIdOrSlug));
  }
  const pathVars = slugVars(config, formIdOrSlug);
  const custom = endpointByRole(config.endpoints, "form_fetch");
  const path = custom
    ? resolvePathTemplate(custom.path, pathVars)
    : resolvePathTemplate(DEFAULT_FORM_FETCH_PATH, pathVars);
  return buildBookingQubeUrl(config.baseUrl, config.apiVersion, path);
}

function resolvePostUrl(config: BookingQubeConfig): string {
  if (config.postApiUrl?.trim()) {
    return config.postApiUrl.trim();
  }
  const custom = endpointByRole(config.endpoints, "submit");
  const path = custom?.path ?? DEFAULT_SUBMIT_PATH;
  return buildBookingQubeUrl(config.baseUrl, config.apiVersion, path);
}

export async function fetchRegistrationForm(
  config: BookingQubeConfig,
  formIdOrSlug: string,
): Promise<BookingQubeFormSchema> {
  const url = resolveGetUrl(config, formIdOrSlug);
  if (!config.getApiUrl?.trim() && !config.baseUrl?.trim()) {
    throw new Error("BookingQube GET API URL is not configured");
  }
  const { status, body } = await requestUrl(url, "GET", config.apiKey);
  if (status < 200 || status >= 300) {
    throw new Error(
      formatBookingQubeHttpError({
        method: "GET",
        url,
        status,
        body,
        context: status === 401 ? "BookingQube GET unauthorized (check API key)" : undefined,
      }),
    );
  }
  const root = asRecord(body);
  if (root?.message === "Event not found") {
    throw new Error(
      `BookingQube GET — Event not found — ${url} — check form id / {slug} in the GET URL`,
    );
  }
  const schema = normalizeFormSchema(body);
  const fieldsWarning = eventLoadedFieldsWarning(schema);
  if (fieldsWarning) {
    return { ...schema, fieldsWarning };
  }
  if (schema.fields.length === 0) {
    throw new Error(
      `BookingQube GET returned no fields — ${url} — response: ${bodySnippet(body)}`,
    );
  }
  return schema;
}

export async function submitRegistration(
  config: BookingQubeConfig,
  payload: SubmitRegistrationPayload,
): Promise<{ ok: true; body: unknown; request: ReturnType<typeof sanitizeSubmitRequestBody> }> {
  const url = resolvePostUrl(config);
  const request = sanitizeSubmitRequestBody(payload);
  if (isFlatRegistrationsArray(request.registrations)) {
    throw new Error(
      "Internal error: POST body registrations is flat — expected [[{ id, value }, ...]]; restart the dev server if this persists after a code update",
    );
  }
  const { status, body } = await requestUrl(url, "POST", config.apiKey, request);
  if (status < 200 || status >= 300) {
    throw new BookingQubeHttpError({
      message: formatBookingQubeHttpError({
        method: "POST",
        url,
        status,
        body,
        context: status === 401 ? "BookingQube POST unauthorized (check API key)" : undefined,
      }),
      status,
      url,
      body,
      request,
    });
  }
  return { ok: true, body, request };
}

export async function testConnection(config: BookingQubeConfig): Promise<{ ok: true; message: string }> {
  const slug =
    config.registrationEventSlug?.trim() ||
    config.defaultFormId?.trim() ||
    null;

  if (config.getApiUrl?.trim()) {
    const url = slug
      ? resolveBookingQubeFullUrl(config.getApiUrl, slugVars(config, slug))
      : config.getApiUrl.trim();
    const { status, body } = await requestUrl(url, "GET", config.apiKey);
    if (status >= 200 && status < 300) {
      if (slug) {
        const schema = normalizeFormSchema(body);
        const count = schema.fields.length;
        const warn = eventLoadedFieldsWarning(schema);
        if (warn) {
          return { ok: true, message: `Connected — GET OK — ${warn}` };
        }
        const idHint = schema.eventId ? `, event id ${schema.eventId}` : "";
        return {
          ok: true,
          message: `Loaded ${count} field${count === 1 ? "" : "s"}${idHint}`,
        };
      }
      return { ok: true, message: `Connected — GET responded (${status})` };
    }
    const msg =
      (asRecord(body)?.message as string) ??
      (asRecord(body)?.error as string) ??
      `GET failed (${status})`;
    throw new Error(msg);
  }

  if (!slug) {
    const pingPath = "/registration-form/ping-test";
    const { status } = await requestBookingQube(config, "GET", pingPath);
    if (status === 404) {
      return {
        ok: true,
        message:
          "Base URL reachable (set GET API URL and registration event slug to validate form fetch)",
      };
    }
    return { ok: true, message: `Base URL responded (${status})` };
  }

  const schema = await fetchRegistrationForm(config, slug);
  if (schema.fieldsWarning) {
    return { ok: true, message: `Connected — ${schema.fieldsWarning}` };
  }
  const count = schema.fields.length;
  const idHint = schema.eventId ? `, event id ${schema.eventId}` : "";
  return {
    ok: true,
    message: `Loaded ${count} field${count === 1 ? "" : "s"}${idHint}`,
  };
}
