/**

 * Server-only: map SummerSplash registrations → BookingQube submit payload.

 */

import "server-only";



import {
  getSupabaseAdminClientOrNull,
  supabaseAdmin,
} from "@/integrations/supabase/client.server";

import {

  DEFAULT_BOOKINGQUBE_API_VERSION,

  type BookingQubeCustomEndpoint,

} from "@/lib/bookingqube.constants";

import {

  BookingQubeHttpError,

  fetchRegistrationForm,

  formatBookingQubeValidationErrors,

  submitRegistration,

  type BookingQubeConfig,

} from "@/lib/bookingqube.client";

import {

  autoMapSchemaFieldsToLocal,

  buildSubmitPayload,

  coerceBookingQubeEventId,

  filterMappingsToSchemaFields,

  formatBookingQubeSubmitErrorSummary,

  isBookingQubeDuplicateRegistrationError,

  parseCachedFormSchemaMeta,

  parseBookingQubeSubmitErrors,

  repairFieldMappingsFromSchema,

  resolveBookingQubeFieldId,

  sanitizeSubmitRequestBody,

  validateMappedRegistrationValues,

  validateSubmitPayload,

  SAMPLE_LOCAL_REGISTRATION_VALUES,

  type BookingQubeFieldMapping,

  type BookingQubeSchemaField,

  type BookingQubeSubmitRequestBody,

} from "@/lib/bookingqube.mapping";

import { after } from "next/server";

import { registrationBookingYmd } from "@/lib/pass-active";
import {
  formatSlotDisplayLabel,
  formatVenueSlotTimeRange,
  getSplashDisplayTimeZone,
} from "@/lib/slot-time";



export type { LocalRegistrationField } from "@/lib/bookingqube.constants";

export { LOCAL_REGISTRATION_FIELDS } from "@/lib/bookingqube.constants";

export {

  buildSubmitPayload,

  buildSampleSubmitPayload,

  autoMapSchemaFieldsToLocal,

  guessLocalFieldFromBookingQubeField,

} from "@/lib/bookingqube.mapping";



const PROVIDER = "bookingqube";

const BQ_SYNC_LOG = "[BookingQube sync]";

export type BookingQubeOutboundSyncResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

/** Options for outbound sync (e.g. admin bulk resync-all). */
export type BookingQubeOutboundSyncOptions = {
  /** Treat BookingQube duplicate-email responses as success after POST (resync-all). */
  forceResync?: boolean;
};

function bqLog(message: string, detail?: Record<string, unknown>) {
  if (detail && Object.keys(detail).length > 0) {
    console.log(BQ_SYNC_LOG, message, detail);
  } else {
    console.log(BQ_SYNC_LOG, message);
  }
}



function parseCustomEndpoints(raw: unknown): BookingQubeCustomEndpoint[] {

  if (!Array.isArray(raw)) return [];

  const out: BookingQubeCustomEndpoint[] = [];

  for (const item of raw) {

    const o = item && typeof item === "object" ? (item as Record<string, unknown>) : null;

    if (!o) continue;

    const id = typeof o.id === "string" ? o.id : "";

    const name = typeof o.name === "string" ? o.name.trim() : "";

    const method = typeof o.method === "string" ? o.method.toUpperCase() : "";

    const path = typeof o.path === "string" ? o.path.trim() : "";

    if (!id || !name || !path) continue;

    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) continue;

    const role =

      o.role === "submit" || o.role === "form_fetch"

        ? o.role

        : null;

    const mergeWithEventData = o.mergeWithEventData === true || o.merge_with_event_data === true;

    out.push({

      id,

      name,

      method: method as BookingQubeCustomEndpoint["method"],

      path: path.startsWith("/") ? path : `/${path}`,

      role,

      ...(mergeWithEventData ? { mergeWithEventData: true } : {}),

    });

  }

  return out;

}

/** Stored settings key first, then inline override, then env (BOOKINGQUBE_API_KEY or custom env var). */
export function resolveBookingQubeApiKey(
  storedKey?: string | null,
  inlineKey?: string | null,
  apiKeyEnvVar?: string | null,
): string | null {
  const stored = storedKey?.trim();
  if (stored) return stored;
  const inline = inlineKey?.trim();
  if (inline) return inline;
  const envVar = apiKeyEnvVar?.trim() || "BOOKINGQUBE_API_KEY";
  return process.env[envVar]?.trim() || process.env.BOOKINGQUBE_API_KEY?.trim() || null;
}

export async function resolveBookingQubeConfig(opts?: {

  requireEnabled?: boolean;

}): Promise<BookingQubeConfig | null> {

  const { data: row } = await supabaseAdmin

    .from("integration_settings")

    .select("*")

    .eq("provider", PROVIDER)

    .maybeSingle();



  if (!row) return null;

  if (opts?.requireEnabled !== false && !row.enabled) return null;



  const apiKey = resolveBookingQubeApiKey(row.api_key, null, row.api_key_env_var);



  const baseUrl =

    row.base_url?.trim() ||

    process.env.BOOKINGQUBE_BASE_URL?.trim() ||

    "https://bookingqube-staging-deb2ecbxcrd5cmbq.eastus-01.azurewebsites.net";



  const rowRecord = row as Record<string, unknown>;

  const apiVersion =

    (typeof rowRecord.api_version === "string" && rowRecord.api_version.trim()) ||

    process.env.BOOKINGQUBE_API_VERSION?.trim() ||

    DEFAULT_BOOKINGQUBE_API_VERSION;

  const endpoints = parseCustomEndpoints(rowRecord.custom_endpoints);

  const getApiUrl =
    (typeof rowRecord.get_api_url === "string" && rowRecord.get_api_url.trim()) || null;
  const postApiUrl =
    (typeof rowRecord.post_api_url === "string" && rowRecord.post_api_url.trim()) || null;
  const registrationEventSlug =
    (typeof rowRecord.registration_event_slug === "string" &&
      rowRecord.registration_event_slug.trim()) ||
    row.default_form_id?.trim() ||
    null;

  return {
    getApiUrl,
    postApiUrl,
    registrationEventSlug,
    baseUrl,
    apiKey,
    defaultFormId: registrationEventSlug || row.default_form_id,
    apiVersion,
    endpoints,
  };
}



type FieldMappingRow = BookingQubeFieldMapping;



type RegistrationRow = {

  id: string;

  customer_name: string;

  mobile: string;

  email: string | null;

  guest_count: number;

  created_at: string;

  qr_token: string;

  slot_id: string;

  slots: {

    id: string;

    name: string;

    starts_at?: string | null;

    ends_at?: string | null;

    event_id: string;

    bookingqube_ticket_id: string | null;

    events?: { id: string; name: string } | null;

  } | null;

};



function bookingDateFromRegistration(reg: RegistrationRow): string {
  return registrationBookingYmd(reg.created_at);
}

function registrationSlot(reg: RegistrationRow): RegistrationRow["slots"] {
  const slot = reg.slots;
  if (!slot) return null;
  if (slot.id && reg.slot_id && slot.id !== reg.slot_id) {
    bqLog("Slot join id mismatch — using registration slot_id", {
      registrationId: reg.id,
      slot_id: reg.slot_id,
      joined_slot_id: slot.id,
    });
  }
  return slot;
}

function localValue(reg: RegistrationRow, localField: string): string | number | null {

  switch (localField) {

    case "customer_name":

      return reg.customer_name;

    case "mobile":

      return reg.mobile;

    case "email":

      return reg.email ?? "";

    case "guest_count":

      return reg.guest_count;

    case "booking_date":

      return bookingDateFromRegistration(reg);

    case "slot_id":

      return reg.slot_id;

    case "slot_name": {
      const slot = registrationSlot(reg);
      if (!slot) return "";
      return formatSlotDisplayLabel(slot.name, slot.starts_at, slot.ends_at, {
        timeZone: getSplashDisplayTimeZone(),
      });
    }

    case "slot_time": {
      const slot = registrationSlot(reg);
      if (!slot?.starts_at) return "";
      return formatVenueSlotTimeRange(slot.starts_at, slot.ends_at);
    }

    case "event_name":
      return reg.slots?.events?.name ?? "";

    case "bookingqube_ticket_id":

      return reg.slots?.bookingqube_ticket_id ?? "";

    case "qr_token":

      return reg.qr_token;

    case "metadata":

      return JSON.stringify({

        registration_id: reg.id,

        event_id: reg.slots?.event_id,

        event_name: reg.slots?.events?.name,

      });

    default:

      return null;

  }

}



const DEFAULT_LABEL_MAPPINGS: FieldMappingRow[] = [

  { bookingqube_field_id: null, bookingqube_label: "phone", local_field: "mobile" },

  { bookingqube_field_id: null, bookingqube_label: "mobile", local_field: "mobile" },

  { bookingqube_field_id: null, bookingqube_label: "name", local_field: "customer_name" },

  { bookingqube_field_id: null, bookingqube_label: "email", local_field: "email" },

  { bookingqube_field_id: null, bookingqube_label: "guests", local_field: "guest_count" },

  { bookingqube_field_id: null, bookingqube_label: "date", local_field: "booking_date" },

];



function cachedSchemaFields(

  cached: { fields?: BookingQubeSchemaField[] } | null | undefined,

): BookingQubeSchemaField[] | undefined {

  return cached?.fields?.length ? cached.fields : undefined;

}



type SyncLogStatus = "success" | "error" | "pending" | "skipped";

async function writeSyncLog(input: {
  registrationId?: string | null;
  direction: "in" | "out";
  status: SyncLogStatus;
  payload?: unknown;
  error?: string;
}): Promise<boolean> {
  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    console.error(
      BQ_SYNC_LOG,
      "Cannot write integration_sync_log — missing SUPABASE_SERVICE_ROLE_KEY",
      { registrationId: input.registrationId, error: input.error },
    );
    return false;
  }
  const { error } = await admin.from("integration_sync_log").insert({
    provider: PROVIDER,
    direction: input.direction,
    registration_id: input.registrationId ?? null,
    payload: (input.payload ?? null) as never,
    status: input.status,
    error: input.error ?? null,
  });
  if (error) {
    console.error(BQ_SYNC_LOG, "integration_sync_log insert failed:", error.message, input);
    return false;
  }
  return true;
}

async function logOutboundSkip(
  registrationId: string,
  reason: string,
  payload?: unknown,
): Promise<BookingQubeOutboundSyncResult> {
  bqLog(reason, { registrationId, ...(payload ? { payload } : {}) });
  await writeSyncLog({
    registrationId,
    direction: "out",
    status: "error",
    error: reason,
    payload,
  });
  return { ok: false, error: reason };
}

async function logOutboundSkipped(
  registrationId: string,
  reason: string,
  payload?: unknown,
): Promise<BookingQubeOutboundSyncResult> {
  bqLog(`skipped: ${reason}`, { registrationId, ...(payload ? { payload } : {}) });
  await writeSyncLog({
    registrationId,
    direction: "out",
    status: "skipped",
    error: reason,
    payload,
  });
  return { ok: false, skipped: true, error: reason };
}

function mappingsFromSchemaFields(schemaFields: BookingQubeSchemaField[]): FieldMappingRow[] {
  return autoMapSchemaFieldsToLocal(schemaFields).map(({ bqId, bqLabel, local }) => ({
    bookingqube_field_id: bqId,
    bookingqube_label: bqLabel,
    local_field: local,
  }));
}

function enrichMappingsWithSchema(
  mappings: FieldMappingRow[],
  schemaFields?: BookingQubeSchemaField[],
): FieldMappingRow[] {
  if (!schemaFields?.length) return mappings;
  return mappings.map((m) => {
    const explicit = m.bookingqube_field_id?.trim();
    if (explicit) return m;
    const resolved = resolveBookingQubeFieldId(m, schemaFields);
    return resolved ? { ...m, bookingqube_field_id: resolved } : m;
  });
}

type OutboundEventContext = {
  formId: string;
  eventMappingId: string | null;
  bookingqubeEventId: string | null;
  mappingNote?: string;
};

async function resolveOutboundEventContext(
  localEventId: string,
  config: BookingQubeConfig,
): Promise<OutboundEventContext | null> {
  const { data: exact } = await supabaseAdmin
    .from("integration_event_mappings")
    .select("id, bookingqube_form_id, bookingqube_event_id")
    .eq("provider", PROVIDER)
    .eq("local_event_id", localEventId)
    .maybeSingle();

  if (exact?.bookingqube_form_id?.trim()) {
    return {
      formId: exact.bookingqube_form_id.trim(),
      eventMappingId: exact.id,
      bookingqubeEventId:
        (exact as { bookingqube_event_id?: string | null }).bookingqube_event_id?.trim() || null,
    };
  }

  const exactMappingId = exact?.id ?? null;

  const globalFormId =
    config.defaultFormId?.trim() || config.registrationEventSlug?.trim() || null;

  const { data: allMappings } = await supabaseAdmin
    .from("integration_event_mappings")
    .select("id, local_event_id, bookingqube_form_id, bookingqube_event_id")
    .eq("provider", PROVIDER)
    .order("created_at", { ascending: true });

  const rows = allMappings ?? [];

  if (rows.length === 1 && rows[0].bookingqube_form_id?.trim()) {
    const sole = rows[0];
    return {
      formId: sole.bookingqube_form_id.trim(),
      eventMappingId: sole.id,
      bookingqubeEventId:
        (sole as { bookingqube_event_id?: string | null }).bookingqube_event_id?.trim() || null,
      mappingNote: `Using sole event mapping (slot event ${localEventId} ≠ linked ${sole.local_event_id})`,
    };
  }

  if (globalFormId) {
    const fallbackMapping = rows.find((r) => r.bookingqube_form_id?.trim()) ?? null;
    return {
      formId: globalFormId,
      eventMappingId: exactMappingId ?? fallbackMapping?.id ?? null,
      bookingqubeEventId:
        (fallbackMapping as { bookingqube_event_id?: string | null } | null)?.bookingqube_event_id
          ?.trim() || null,
      mappingNote: exact
        ? "Event link missing BookingQube form id — using Registration Event Slug from settings"
        : rows.length > 0
          ? `No event mapping for slot event ${localEventId} — using Registration Event Slug from settings`
          : "No per-event mapping — using Registration Event Slug from settings",
    };
  }

  const withForm = rows.find((r) => r.bookingqube_form_id?.trim());
  if (withForm?.bookingqube_form_id?.trim()) {
    return {
      formId: withForm.bookingqube_form_id.trim(),
      eventMappingId: withForm.id,
      bookingqubeEventId:
        (withForm as { bookingqube_event_id?: string | null }).bookingqube_event_id?.trim() || null,
      mappingNote: `No mapping for slot event ${localEventId} — using first linked event form id`,
    };
  }

  return null;
}

async function loadFieldMappingsForEvent(eventMappingId: string | null): Promise<FieldMappingRow[]> {
  if (!eventMappingId) return [];
  const { data: fieldRows } = await supabaseAdmin
    .from("integration_field_mappings")
    .select("bookingqube_field_id, bookingqube_label, local_field, metadata")
    .eq("event_mapping_id", eventMappingId);
  return (fieldRows ?? []) as FieldMappingRow[];
}

function resolveOutboundFieldMappings(
  dbMappings: FieldMappingRow[],
  schemaFields?: BookingQubeSchemaField[],
): FieldMappingRow[] {
  let mappings = dbMappings.length > 0 ? dbMappings : DEFAULT_LABEL_MAPPINGS;
  if (schemaFields?.length) {
    const repaired = repairFieldMappingsFromSchema(mappings, schemaFields);
    const hadNumeric = mappings.some((m) => /^\d+$/.test(m.bookingqube_field_id?.trim() ?? ""));
    if (!hadNumeric && repaired.some((m) => /^\d+$/.test(m.bookingqube_field_id?.trim() ?? ""))) {
      bqLog("Auto-repaired field mappings from cached/fetched form schema");
    }
    mappings = repaired;
    const hasResolvable = mappings.some((m) => resolveBookingQubeFieldId(m, schemaFields));
    if (!hasResolvable) {
      mappings = mappingsFromSchemaFields(schemaFields);
      bqLog("Using auto field mappings from cached/fetched form schema");
    }
    mappings = filterMappingsToSchemaFields(mappings, schemaFields);
  }
  return mappings;
}

function resolveSubmitBookingQubeEventId(input: {
  bookingqubeEventId?: string | null;
  schemaEventId?: string | null;
  cachedSchemaEventId?: string | null;
}): number | null {
  return (
    coerceBookingQubeEventId(input.bookingqubeEventId) ??
    coerceBookingQubeEventId(input.schemaEventId) ??
    coerceBookingQubeEventId(input.cachedSchemaEventId) ??
    null
  );
}

function formatOutboundSyncError(
  err: unknown,
  request?: BookingQubeSubmitRequestBody,
  schemaFields?: BookingQubeSchemaField[],
): string {
  if (err instanceof BookingQubeHttpError) {
    if (err.status === 429) {
      return `BookingQube rate limited (HTTP 429) — ${err.url}`;
    }
    const fieldSummary = formatBookingQubeSubmitErrorSummary(err.body, schemaFields);
    if (fieldSummary) return fieldSummary;
    const apiDetail = formatBookingQubeValidationErrors(err.body, schemaFields);
    const parts = [err.message];
    if (apiDetail && !err.message.includes(apiDetail)) parts.push(apiDetail);
    if (request) parts.push(`request: ${JSON.stringify(request)}`);
    return parts.join(" — ");
  }
  const message = err instanceof Error ? err.message : String(err);
  if (request) return `${message} — request: ${JSON.stringify(request)}`;
  return message;
}



/** Persist admin endpoint test result (optional when merge with event data). */

export async function logBookingQubeEndpointTest(input: {

  registrationId?: string | null;

  status: "success" | "error";

  payload?: unknown;

  error?: string;

}): Promise<void> {

  await writeSyncLog({

    registrationId: input.registrationId,

    direction: "out",

    status: input.status,

    payload: input.payload,

    error: input.error,

  });

}



async function runOutboundSync(registrationId: string): Promise<void> {
  try {
    await syncRegistrationOutbound(registrationId);
  } catch (err) {
    console.error(BQ_SYNC_LOG, "scheduled outbound sync failed:", err);
  }
}

/** Schedule outbound sync after POS/public registration (runs after response via `after`). */
export function scheduleBookingQubeOutboundSync(registrationId: string): void {
  bqLog("Scheduling outbound sync", { registrationId });
  try {
    // Callback must return a Promise so Next.js waitUntil keeps the invocation alive.
    after(() => runOutboundSync(registrationId));
  } catch {
    void runOutboundSync(registrationId);
  }
}



/** Await outbound sync in the same server action (reliable on serverless). */

export async function runBookingQubeOutboundSync(
  registrationId: string,
  options?: BookingQubeOutboundSyncOptions,
): Promise<BookingQubeOutboundSyncResult> {
  try {
    return await syncRegistrationOutbound(registrationId, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(BQ_SYNC_LOG, "outbound sync threw:", message);
    await writeSyncLog({
      registrationId,
      direction: "out",
      status: "error",
      error: message,
    });
    return { ok: false, error: message };
  }
}



function hasConfiguredPostUrl(config: BookingQubeConfig): boolean {

  if (config.postApiUrl?.trim()) return true;

  return config.endpoints.some((e) => e.role === "submit");

}



export async function syncRegistrationOutbound(
  registrationId: string,
  options?: BookingQubeOutboundSyncOptions,
): Promise<BookingQubeOutboundSyncResult> {
  if (!getSupabaseAdminClientOrNull()) {
    const reason =
      "Missing SUPABASE_SERVICE_ROLE_KEY — outbound sync cannot run (add key to .env)";
    return logOutboundSkip(registrationId, reason);
  }

  const { data: settingsRow } = await supabaseAdmin
    .from("integration_settings")
    .select("enabled")
    .eq("provider", PROVIDER)
    .maybeSingle();

  const config = await resolveBookingQubeConfig();
  if (!config) {
    const reason = !settingsRow
      ? "BookingQube integration settings not found — run database migration"
      : settingsRow.enabled
        ? "BookingQube settings incomplete (check GET/POST URLs in admin)"
        : "BookingQube sync is disabled — enable it in Settings → BookingQube and Save";
    if (!settingsRow) {
      return logOutboundSkip(registrationId, reason);
    }
    if (!settingsRow.enabled) {
      return logOutboundSkipped(registrationId, reason);
    }
    return logOutboundSkip(registrationId, reason);
  }

  if (!hasConfiguredPostUrl(config)) {
    return logOutboundSkip(registrationId, "BookingQube POST API URL is not configured");
  }

  bqLog("Starting outbound sync", {
    registrationId,
    postUrl: config.postApiUrl?.trim() || "(legacy submit endpoint)",
  });

  const { data: reg, error } = await supabaseAdmin
    .from("registrations")
    .select(
      "id, customer_name, mobile, email, guest_count, created_at, qr_token, slot_id, slots(id, name, starts_at, ends_at, event_id, bookingqube_ticket_id, events(id, name))",
    )
    .eq("id", registrationId)
    .maybeSingle();

  if (error || !reg) {
    return logOutboundSkip(
      registrationId,
      error?.message ?? "Registration not found",
      error ? { code: error.code } : undefined,
    );
  }

  const eventId = (reg as RegistrationRow).slots?.event_id;
  if (!eventId) {
    return logOutboundSkip(registrationId, "Slot/event missing on registration");
  }

  const eventCtx = await resolveOutboundEventContext(eventId, config);
  if (!eventCtx) {
    return logOutboundSkip(
      registrationId,
      "No BookingQube form id for this event — link the event in Settings or set Registration Event Slug and Save",
      { local_event_id: eventId },
    );
  }

  if (eventCtx.mappingNote) {
    bqLog(eventCtx.mappingNote, { registrationId, local_event_id: eventId, formId: eventCtx.formId });
  }

  const dbMappings = await loadFieldMappingsForEvent(eventCtx.eventMappingId);

  const { data: settingsCacheRow } = await supabaseAdmin
    .from("integration_settings")
    .select("cached_form_schema")
    .eq("provider", PROVIDER)
    .maybeSingle();

  const cachedMeta = parseCachedFormSchemaMeta(settingsCacheRow?.cached_form_schema);

  let schemaEventId = cachedMeta.eventId;
  let schemaSlug = cachedMeta.slug;
  let schemaFields = cachedMeta.fields.length ? cachedMeta.fields : undefined;

  if (!schemaFields?.length) {
    try {
      const schema = await fetchRegistrationForm(config, eventCtx.formId);
      schemaEventId = schema.eventId ?? schemaEventId;
      schemaSlug = schema.slug ?? eventCtx.formId;
      schemaFields = schema.fields.length ? schema.fields : undefined;
      bqLog("Fetched form schema for sync", {
        registrationId,
        formId: eventCtx.formId,
        fieldCount: schema.fields.length,
      });
    } catch (fetchErr) {
      schemaSlug = eventCtx.formId;
      const fetchMessage = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      const hasExplicitFieldIds = dbMappings.some((m) => m.bookingqube_field_id?.trim());
      if (!schemaFields?.length && !hasExplicitFieldIds) {
        bqLog("Schema fetch failed", { registrationId, formId: eventCtx.formId, fetchMessage });
        return logOutboundSkip(
          registrationId,
          `Failed to fetch BookingQube form schema: ${fetchMessage}`,
          { formId: eventCtx.formId },
        );
      }
      bqLog("Schema fetch failed; using saved field ids or label mappings", {
        registrationId,
        fetchMessage,
      });
    }
  }

  const mappings = resolveOutboundFieldMappings(dbMappings, schemaFields);

  const regRow = reg as RegistrationRow;
  const getLocalValue = (localField: string) => localValue(regRow, localField);

  const mappedValidation = validateMappedRegistrationValues({
    mappings,
    getLocalValue,
    schemaFields,
    registrationId,
  });
  if (!mappedValidation.ok) {
    return logOutboundSkip(registrationId, mappedValidation.message, {
      formId: eventCtx.formId,
      mappingCount: mappings.length,
      schemaFieldCount: schemaFields?.length ?? 0,
    });
  }

  const submitEventId = resolveSubmitBookingQubeEventId({
    bookingqubeEventId: eventCtx.bookingqubeEventId,
    schemaEventId,
    cachedSchemaEventId: cachedMeta.eventId,
  });

  const payload = buildSubmitPayload({
    formId: eventCtx.formId,
    bookingqubeEventId: submitEventId,
    schemaEventId: submitEventId !== null ? String(submitEventId) : null,
    schemaSlug,
    mappings,
    schemaFields,
    getLocalValue,
  });

  const validation = validateSubmitPayload(payload, { registrationId });
  if (!validation.ok) {
    return logOutboundSkip(registrationId, validation.message, {
      built: payload,
      formId: eventCtx.formId,
      bookingqubeEventId: submitEventId,
      schemaEventId,
      mappingCount: mappings.length,
      schemaFieldCount: schemaFields?.length ?? 0,
    });
  }

  let request: BookingQubeSubmitRequestBody;
  try {
    request = sanitizeSubmitRequestBody(payload);
  } catch (sanitizeErr) {
    const message =
      sanitizeErr instanceof Error ? sanitizeErr.message : String(sanitizeErr);
    return logOutboundSkip(registrationId, message, {
      built: payload,
      formId: eventCtx.formId,
      bookingqubeEventId: submitEventId,
    });
  }

  bqLog("POST dry-run payload", {
    registrationId,
    postUrl: config.postApiUrl?.trim() || "(legacy submit endpoint)",
    request,
  });

  try {
    const result = await submitRegistration(config, payload);
    bqLog("POST succeeded", {
      registrationId,
      postUrl: config.postApiUrl?.trim(),
      cellCount: validation.cellCount,
      request: result.request,
    });
    await writeSyncLog({
      registrationId,
      direction: "out",
      status: "success",
      payload: {
        built: payload,
        request: result.request,
        response: result.body,
        formId: eventCtx.formId,
      },
    });
    return { ok: true };
  } catch (err: unknown) {
    const requestBody =
      err instanceof BookingQubeHttpError && err.request
        ? (err.request as BookingQubeSubmitRequestBody)
        : request;
    const fieldErrors =
      err instanceof BookingQubeHttpError
        ? parseBookingQubeSubmitErrors(err.body, schemaFields)
        : [];
    const apiErrors =
      err instanceof BookingQubeHttpError
        ? formatBookingQubeSubmitErrorSummary(err.body, schemaFields) ??
          formatBookingQubeValidationErrors(err.body, schemaFields)
        : null;
    const duplicate =
      err instanceof BookingQubeHttpError &&
      isBookingQubeDuplicateRegistrationError(err.body);
    const message = duplicate
      ? apiErrors ?? "Email already registered in BookingQube"
      : formatOutboundSyncError(err, requestBody, schemaFields);
    const logPayload = {
      built: payload,
      request: requestBody,
      response: err instanceof BookingQubeHttpError ? err.body : undefined,
      apiErrors: apiErrors ?? undefined,
      fieldErrors: fieldErrors.length ? fieldErrors : undefined,
      formId: eventCtx.formId,
    };
    const rateLimited = err instanceof BookingQubeHttpError && err.status === 429;
    bqLog(
      duplicate ? "POST skipped (duplicate)" : rateLimited ? "POST rate limited" : "POST failed",
      {
        registrationId,
        message,
        request: requestBody,
        apiErrors,
        built: payload,
      },
    );
    if (duplicate) {
      if (options?.forceResync) {
        bqLog("POST duplicate acknowledged (force resync)", {
          registrationId,
          message,
          request: requestBody,
        });
        await writeSyncLog({
          registrationId,
          direction: "out",
          status: "success",
          payload: { ...logPayload, duplicateAcknowledged: true, duplicateMessage: message },
        });
        return { ok: true };
      }
      await writeSyncLog({
        registrationId,
        direction: "out",
        status: "skipped",
        payload: logPayload,
        error: message,
      });
      return { ok: false, skipped: true, error: message };
    }
    await writeSyncLog({
      registrationId,
      direction: "out",
      status: "error",
      payload: logPayload,
      error: message,
    });
    return { ok: false, error: message };
  }
}



export type EndpointTestContext = {

  formId: string;

  pathVars: Record<string, string>;

  mappings: FieldMappingRow[];

  schemaFields?: BookingQubeSchemaField[];

  bookingqubeEventId?: string | null;

  schemaEventId?: string | null;

  schemaSlug?: string | null;

  registrationId?: string | null;

  getLocalValue: (localField: string) => string | number | boolean | null | undefined;

  useSampleData: boolean;

};



async function resolveEventMappingRow(opts?: {

  event_mapping_id?: string;

  local_event_id?: string;

}): Promise<{

  id: string;

  local_event_id: string;

  bookingqube_form_id: string;

  bookingqube_event_id: string | null;

} | null> {

  if (opts?.event_mapping_id) {

    const { data: em } = await supabaseAdmin

      .from("integration_event_mappings")

      .select("id, local_event_id, bookingqube_form_id, bookingqube_event_id")

      .eq("id", opts.event_mapping_id)

      .eq("provider", PROVIDER)

      .maybeSingle();

    if (!em?.bookingqube_form_id?.trim()) return null;

    return {

      id: em.id,

      local_event_id: em.local_event_id,

      bookingqube_form_id: em.bookingqube_form_id.trim(),

      bookingqube_event_id:

        (em as { bookingqube_event_id?: string | null }).bookingqube_event_id?.trim() || null,

    };

  }



  if (opts?.local_event_id) {

    const { data: em } = await supabaseAdmin

      .from("integration_event_mappings")

      .select("id, local_event_id, bookingqube_form_id, bookingqube_event_id")

      .eq("local_event_id", opts.local_event_id)

      .eq("provider", PROVIDER)

      .maybeSingle();

    if (!em?.bookingqube_form_id?.trim()) return null;

    return {

      id: em.id,

      local_event_id: em.local_event_id,

      bookingqube_form_id: em.bookingqube_form_id.trim(),

      bookingqube_event_id:

        (em as { bookingqube_event_id?: string | null }).bookingqube_event_id?.trim() || null,

    };

  }



  const { data: first } = await supabaseAdmin

    .from("integration_event_mappings")

    .select("id, local_event_id, bookingqube_form_id, bookingqube_event_id")

    .eq("provider", PROVIDER)

    .order("created_at", { ascending: true })

    .limit(1)

    .maybeSingle();



  if (!first?.bookingqube_form_id?.trim()) return null;

  return {

    id: first.id,

    local_event_id: first.local_event_id,

    bookingqube_form_id: first.bookingqube_form_id.trim(),

    bookingqube_event_id:

      (first as { bookingqube_event_id?: string | null }).bookingqube_event_id?.trim() || null,

  };

}



async function loadLatestRegistrationForEvent(

  localEventId: string,

): Promise<RegistrationRow | null> {

  const { data: slots } = await supabaseAdmin

    .from("slots")

    .select("id")

    .eq("event_id", localEventId);



  const slotIds = (slots ?? []).map((s: { id: string }) => s.id);

  if (!slotIds.length) return null;



  const { data: reg } = await supabaseAdmin

    .from("registrations")

    .select(

      "id, customer_name, mobile, email, guest_count, created_at, qr_token, slot_id, slots(id, name, starts_at, ends_at, event_id, bookingqube_ticket_id, events(id, name))",

    )

    .in("slot_id", slotIds)

    .order("created_at", { ascending: false })

    .limit(1)

    .maybeSingle();



  return (reg as RegistrationRow | null) ?? null;

}



/** Resolve form slug, path vars, mappings, and local values for endpoint Test with optional event merge. */

export async function resolveEndpointTestContext(opts?: {

  event_mapping_id?: string;

  local_event_id?: string;

  formId?: string;

  mergeWithEventData?: boolean;

}): Promise<EndpointTestContext> {

  const config = await resolveBookingQubeConfig({ requireEnabled: false });

  if (!config) throw new Error("BookingQube settings not found");



  const eventMapping = await resolveEventMappingRow({

    event_mapping_id: opts?.event_mapping_id,

    local_event_id: opts?.local_event_id,

  });



  const { urlTemplateNeedsFormContext } = await import("@/lib/bookingqube.mapping");
  const getNeedsForm = Boolean(
    config.getApiUrl?.trim() && urlTemplateNeedsFormContext(config.getApiUrl),
  );

  const formId =
    opts?.formId?.trim() ||
    eventMapping?.bookingqube_form_id ||
    config.defaultFormId?.trim() ||
    (!getNeedsForm && config.getApiUrl?.trim() ? "_linked" : "");

  if (!formId) {
    throw new Error(
      "Set a BookingQube form id on the event link when the GET URL uses {slug} or {formId}",
    );
  }



  let mappings: FieldMappingRow[] = [];

  let bookingqubeEventId: string | null = eventMapping?.bookingqube_event_id ?? null;



  if (eventMapping?.id) {

    const { data: fieldRows } = await supabaseAdmin

      .from("integration_field_mappings")

      .select("bookingqube_field_id, bookingqube_label, local_field, metadata")

      .eq("event_mapping_id", eventMapping.id);

    mappings = (fieldRows ?? []) as FieldMappingRow[];

  }



  if (mappings.length === 0) {

    mappings = DEFAULT_LABEL_MAPPINGS;

  }



  const { data: settingsRow } = await supabaseAdmin

    .from("integration_settings")

    .select("cached_form_schema")

    .eq("provider", PROVIDER)

    .maybeSingle();



  const cached = settingsRow?.cached_form_schema as {

    eventId?: string;

    slug?: string;

    fields?: BookingQubeSchemaField[];

  } | null;



  let schemaFields = cachedSchemaFields(cached);

  let schemaEventId = cached?.eventId ?? null;

  let schemaSlug = cached?.slug ?? null;



  if (!schemaFields?.length) {

    try {

      const schema = await fetchRegistrationForm(config, formId);

      schemaFields = schema.fields;

      schemaEventId = schema.eventId ?? schemaEventId;

      schemaSlug = schema.slug ?? formId;

    } catch {

      schemaSlug = formId;

    }

  }



  let registration: RegistrationRow | null = null;

  if (opts?.mergeWithEventData && eventMapping?.local_event_id) {

    registration = await loadLatestRegistrationForEvent(eventMapping.local_event_id);

  }



  const useSampleData = !registration;

  const registrationId = registration?.id ?? null;



  const { buildPathVarsFromFormContext } = await import("@/lib/bookingqube.mapping");

  const pathVars = buildPathVarsFromFormContext(formId, bookingqubeEventId ?? schemaEventId);



  return {

    formId,

    pathVars,

    mappings,

    schemaFields,

    bookingqubeEventId,

    schemaEventId,

    schemaSlug,

    registrationId,

    useSampleData,

    getLocalValue: (localField) =>

      registration

        ? localValue(registration, localField)

        : (SAMPLE_LOCAL_REGISTRATION_VALUES[localField] ?? null),

  };

}



/** Resolve mappings + schema for admin submit endpoint test. */

export async function resolveSubmitTestContext(opts?: {

  event_mapping_id?: string;

  formId?: string;

  mergeWithEventData?: boolean;

}): Promise<{

  formId: string;

  mappings: FieldMappingRow[];

  schemaFields?: BookingQubeSchemaField[];

  bookingqubeEventId?: string | null;

  schemaEventId?: string | null;

  schemaSlug?: string | null;

}> {

  const ctx = await resolveEndpointTestContext(opts);

  return {

    formId: ctx.formId,

    mappings: ctx.mappings,

    schemaFields: ctx.schemaFields,

    bookingqubeEventId: ctx.bookingqubeEventId,

    schemaEventId: ctx.schemaEventId,

    schemaSlug: ctx.schemaSlug,

  };

}


