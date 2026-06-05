/**
 * Client-safe: map SummerSplash local registration fields → BookingQube submit payload.
 * POST body shape: { event_id, registrations: [[ { id, value }, ... ]] }
 */
import type { LocalRegistrationField } from "@/lib/bookingqube.constants";

export type BookingQubeFieldMapping = {
  bookingqube_field_id: string | null;
  bookingqube_label: string;
  local_field: string;
  metadata?: Record<string, unknown> | null;
};

export type BookingQubeSchemaField = {
  id: string;
  label: string;
  type?: string;
  name?: string;
};

function pickCachedString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && !Number.isNaN(v)) return String(v);
  }
  return undefined;
}

/** True when schema or cache includes event metadata from a GET payload (client-safe). */
export function schemaHasEventMetadata(schema: {
  eventId?: string | null;
  slug?: string | null;
  title?: string | null;
}): boolean {
  return Boolean(
    schema.eventId?.toString().trim() ||
      schema.slug?.trim() ||
      schema.title?.trim(),
  );
}

/** Parse fields from integration_settings.cached_form_schema (client-safe). */
export function parseCachedFormSchemaFields(cached: unknown): BookingQubeSchemaField[] {
  return parseCachedFormSchemaMeta(cached).fields;
}

function parseSchemaFieldList(raw: unknown): BookingQubeSchemaField[] {
  if (!Array.isArray(raw)) return [];
  const out: BookingQubeSchemaField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id =
      typeof o.id === "string"
        ? o.id.trim()
        : typeof o.id === "number"
          ? String(o.id)
          : "";
    if (!id) continue;
    const label =
      (typeof o.label === "string" && o.label.trim()) ||
      (typeof o.field_label === "string" && o.field_label.trim()) ||
      (typeof o.field_name === "string" && o.field_name.trim()) ||
      (typeof o.name === "string" && o.name.trim()) ||
      id;
    const type =
      (typeof o.type === "string" && o.type) ||
      (typeof o.field_type === "string" && o.field_type) ||
      undefined;
    const name =
      (typeof o.name === "string" && o.name) ||
      (typeof o.field_name === "string" && o.field_name) ||
      undefined;
    out.push({ id, label, type, name });
  }
  return dedupeSchemaFieldsByLabel(out);
}

/** When the API returns duplicate labels with different ids, keep the highest numeric id (newer revision). */
export function dedupeSchemaFieldsByLabel(
  fields: BookingQubeSchemaField[],
): BookingQubeSchemaField[] {
  const byLabel = new Map<string, BookingQubeSchemaField>();
  for (const field of fields) {
    const key = normalizeToken(field.label) || field.id;
    const existing = byLabel.get(key);
    if (!existing) {
      byLabel.set(key, field);
      continue;
    }
    const nextNum = /^\d+$/.test(field.id) ? Number(field.id) : 0;
    const existingNum = /^\d+$/.test(existing.id) ? Number(existing.id) : 0;
    if (nextNum >= existingNum) {
      byLabel.set(key, field);
    }
  }
  return Array.from(byLabel.values()).sort((a, b) =>
    formatBookingQubeFieldOption(a).localeCompare(formatBookingQubeFieldOption(b)),
  );
}

function cachedRegistrationFormFields(root: Record<string, unknown>): unknown {
  if (Array.isArray(root.registration_form_fields)) return root.registration_form_fields;
  const data =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null;
  if (data && Array.isArray(data.registration_form_fields)) {
    return data.registration_form_fields;
  }
  const event =
    data?.event && typeof data.event === "object" && !Array.isArray(data.event)
      ? (data.event as Record<string, unknown>)
      : root.event && typeof root.event === "object" && !Array.isArray(root.event)
        ? (root.event as Record<string, unknown>)
        : null;
  if (event && Array.isArray(event.registration_form_fields)) {
    return event.registration_form_fields;
  }
  return root.fields;
}

/** Parse event id, slug, title, and fields from cached_form_schema (client-safe). */
export function parseCachedFormSchemaMeta(cached: unknown): {
  eventId?: string;
  slug?: string;
  title?: string;
  fields: BookingQubeSchemaField[];
} {
  if (!cached || typeof cached !== "object") {
    return { fields: [] };
  }
  const root = cached as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null;
  const event =
    data?.event && typeof data.event === "object" && !Array.isArray(data.event)
      ? (data.event as Record<string, unknown>)
      : root.event && typeof root.event === "object" && !Array.isArray(root.event)
        ? (root.event as Record<string, unknown>)
        : null;

  const eventId =
    pickCachedString(root, ["eventId", "event_id"]) ??
    (event ? pickCachedString(event, ["id", "event_id", "eventId"]) : undefined);
  const slug =
    pickCachedString(root, ["slug", "form_slug", "formSlug"]) ??
    (event ? pickCachedString(event, ["slug", "form_slug", "formSlug"]) : undefined);
  const title =
    pickCachedString(root, ["title", "name", "event_name", "eventName"]) ??
    (event ? pickCachedString(event, ["title", "name", "event_name", "eventName"]) : undefined);

  const fields = parseSchemaFieldList(cachedRegistrationFormFields(root));
  return { eventId, slug, title, fields };
}

/** Dropdown label for a BookingQube schema field, e.g. `7 — Name`. */
export function formatBookingQubeFieldOption(field: BookingQubeSchemaField): string {
  const label = field.label?.trim() || field.id;
  return `${field.id} — ${label}`;
}

/** Dropdown options from the latest fetched schema only (no stale mapped ids). */
export function schemaFieldOptionsFromFetch(
  schemaFields: BookingQubeSchemaField[],
): BookingQubeSchemaField[] {
  return dedupeSchemaFieldsByLabel(schemaFields);
}

/**
 * @deprecated Prefer schemaFieldOptionsFromFetch — merging old mapping ids pollutes the dropdown.
 */
export function mergeSchemaFieldOptions(
  schemaFields: BookingQubeSchemaField[],
  mappings: { bookingqube_field_id?: string; bookingqube_label?: string }[],
): BookingQubeSchemaField[] {
  return schemaFieldOptionsFromFetch(schemaFields);
}

function pickSchemaFieldForLocal(
  schemaFields: BookingQubeSchemaField[],
  local: string,
): BookingQubeSchemaField | undefined {
  const matches = schemaFields.filter(
    (f) => guessLocalFieldFromBookingQubeField(f) === local,
  );
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  return [...matches].sort((a, b) => Number(b.id) - Number(a.id))[0];
}

/** Re-map local fields to the latest schema after fetch — drops stale BookingQube field ids. */
export function refreshFieldMappingsFromFetchedSchema(
  existingMappings: BookingQubeFieldMapping[],
  schemaFields: BookingQubeSchemaField[],
): BookingQubeFieldMapping[] {
  const schema = dedupeSchemaFieldsByLabel(schemaFields);
  if (!schema.length) return [];

  const baseRows =
    existingMappings.length > 0
      ? existingMappings
      : autoMapSchemaFieldsToLocal(schema).map(({ bqId, bqLabel, local }) => ({
          bookingqube_field_id: bqId,
          bookingqube_label: bqLabel,
          local_field: local,
        }));

  return baseRows.map((m) => {
    const local = m.local_field?.trim();
    if (!local) {
      return { ...m, bookingqube_field_id: "", bookingqube_label: "" };
    }

    const byLocal = pickSchemaFieldForLocal(schema, local);
    if (byLocal) {
      return {
        local_field: local,
        bookingqube_field_id: byLocal.id,
        bookingqube_label: byLocal.label,
      };
    }

    const byLabel = schema.find((f) => labelMatches(f.label, m.bookingqube_label));
    if (byLabel) {
      return {
        local_field: local,
        bookingqube_field_id: byLabel.id,
        bookingqube_label: byLabel.label,
      };
    }

    return {
      local_field: local,
      bookingqube_field_id: "",
      bookingqube_label: "",
    };
  });
}

export type BookingQubeRegistrationCell = {
  id: number | string;
  value: string;
};

export type SubmitRegistrationPayload = {
  event_id?: number | string;
  slug?: string;
  registrations?: BookingQubeRegistrationCell[][];
  /** @deprecated Legacy flat map — not sent when registrations is built */
  fields?: Record<string, string | number | boolean | null>;
};

/** Exact JSON body for POST /registration-form/submit (no extra keys). */
export type BookingQubeSubmitRequestBody = {
  event_id: number;
  registrations: { id: number; value: string }[][];
};

export type SubmitPayloadValidation =
  | { ok: true; cellCount: number; rowCount: number }
  | { ok: false; message: string };

/** Local fields that must be non-empty when pushing to BookingQube submit. */
export const SUBMIT_REQUIRED_LOCAL_FIELDS = [
  "customer_name",
  "mobile",
  "email",
] as const satisfies readonly LocalRegistrationField[];

const LOCAL_FIELD_LABEL_HINTS: Record<LocalRegistrationField, string[]> = {
  customer_name: ["name", "full name", "customer", "attendee", "guest name"],
  mobile: ["phone", "mobile", "tel", "whatsapp", "contact"],
  email: ["email", "e-mail", "mail"],
  nationality: ["nationality", "resident", "tourist", "qatari", "gcc", "citizen", "country"],
  age_group: ["age group", "age range", "age bracket", "senior", "child", "teen", "adult"],
  guest_count: ["guest", "party", "pax", "attendees", "quantity", "count"],
  booking_date: ["date", "visit date", "booking date", "day"],
  slot_id: ["slot id", "slot_id", "time slot id"],
  slot_time: ["slot time", "time range", "start time", "end time", "time"],
  slot_name: ["session", "timeslot", "slot name"],
  event_name: ["event name", "event", "experience", "activity"],
  bookingqube_ticket_id: ["ticket", "ticket id", "product", "package"],
  qr_token: ["qr", "token", "barcode", "code"],
  metadata: ["meta", "notes", "other", "custom"],
};

function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Guess local field from BookingQube label / name / slug. */
export function guessLocalFieldFromBookingQubeField(field: {
  label: string;
  name?: string;
  id?: string;
}): LocalRegistrationField | "metadata" {
  const tokens = [
    field.label,
    field.name ?? "",
    field.id?.startsWith("field_") ? "" : (field.id ?? ""),
  ]
    .map(normalizeToken)
    .filter(Boolean)
    .join(" ");

  for (const [local, hints] of Object.entries(LOCAL_FIELD_LABEL_HINTS) as [
    LocalRegistrationField,
    string[],
  ][]) {
    if (hints.some((h) => tokens.includes(h) || tokens.includes(normalizeToken(h)))) {
      return local;
    }
  }

  const l = tokens;
  if (l.includes("phone") || l.includes("mobile")) return "mobile";
  if (l.includes("email")) return "email";
  if (
    l.includes("nationality") ||
    l.includes("resident") ||
    l.includes("tourist") ||
    l.includes("qatari") ||
    l.includes("gcc")
  ) {
    return "nationality";
  }
  if (l.includes("age")) return "age_group";
  if (l.includes("name")) return "customer_name";
  if (l.includes("guest")) return "guest_count";
  if (l.includes("date")) return "booking_date";
  if (l.includes("event")) return "event_name";
  if (l.includes("ticket")) return "bookingqube_ticket_id";
  if (
    l === "slot" ||
    l.includes("slot time") ||
    (l.includes("slot") && (l.includes("time") || l.includes("start") || l.includes("end")))
  ) {
    return "slot_time";
  }
  if (l.includes("slot")) return "slot_name";
  return "metadata";
}

/** Auto-build mapping rows from fetched schema fields. */
export function autoMapSchemaFieldsToLocal(
  fields: BookingQubeSchemaField[],
): { bqLabel: string; bqId: string; local: string }[] {
  return fields.map((f) => ({
    bqLabel: f.label,
    bqId: f.id,
    local: guessLocalFieldFromBookingQubeField(f),
  }));
}

/** Keep only mappings whose resolved BQ field id exists in the fetched schema. */
export function filterMappingsToSchemaFields(
  mappings: BookingQubeFieldMapping[],
  schemaFields?: BookingQubeSchemaField[],
): BookingQubeFieldMapping[] {
  if (!schemaFields?.length) return mappings;
  const allowed = new Set(schemaFields.map((f) => String(f.id).trim()));
  return mappings.filter((m) => {
    const id = resolveBookingQubeFieldId(m, schemaFields);
    return Boolean(id && allowed.has(String(id).trim()));
  });
}

function extractBookingQubeErrorsArray(root: Record<string, unknown>): unknown[] {
  if (Array.isArray(root.errors)) return root.errors;
  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = (data as Record<string, unknown>).errors;
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

/** Mappings allowed in submit payloads when a schema is known. */
export function filterMappingsForSubmit(
  mappings: BookingQubeFieldMapping[],
  schemaFields?: BookingQubeSchemaField[],
): BookingQubeFieldMapping[] {
  if (!schemaFields?.length) {
    return mappings.filter((m) => {
      const id = m.bookingqube_field_id?.trim();
      return Boolean(id && /^\d+$/.test(id));
    });
  }
  return filterMappingsToSchemaFields(mappings, schemaFields);
}

export type BookingQubeFieldErrorDetail = {
  fieldKey: string;
  fieldId?: string;
  label: string;
  message: string;
};

/** Label for a BookingQube field id using cached/fetched schema when available. */
export function schemaFieldLabelById(
  fieldId: string,
  schemaFields?: BookingQubeSchemaField[],
): string {
  const id = fieldId.trim();
  const field = schemaFields?.find((f) => String(f.id).trim() === id);
  if (field?.label?.trim()) return field.label.trim();
  return `Field ${id}`;
}

function parseFieldKeyToId(fieldKey: string): string | undefined {
  const trimmed = fieldKey.trim();
  const fieldsMatch = /^fields\.(\d+)$/i.exec(trimmed);
  if (fieldsMatch) return fieldsMatch[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return undefined;
}

/** One line per field error, e.g. `Email (field 8): This Email is already registered`. */
export function formatFieldErrorLine(
  fieldKey: string,
  message: string,
  schemaFields?: BookingQubeSchemaField[],
): string {
  const fieldId = parseFieldKeyToId(fieldKey);
  if (fieldId) {
    const label = schemaFieldLabelById(fieldId, schemaFields);
    return `${label} (field ${fieldId}): ${message}`;
  }
  return `${fieldKey}: ${message}`;
}

function collectFieldErrorsFromRow(
  row: Record<string, unknown>,
  schemaFields?: BookingQubeSchemaField[],
): BookingQubeFieldErrorDetail[] {
  const out: BookingQubeFieldErrorDetail[] = [];
  const fieldErrors = row.field_errors;
  if (!fieldErrors || typeof fieldErrors !== "object" || Array.isArray(fieldErrors)) {
    return out;
  }
  for (const [fieldKey, rawMsg] of Object.entries(fieldErrors as Record<string, unknown>)) {
    const message =
      typeof rawMsg === "string"
        ? rawMsg.trim()
        : rawMsg !== null && rawMsg !== undefined
          ? String(rawMsg).trim()
          : "";
    if (!message) continue;
    const fieldId = parseFieldKeyToId(fieldKey);
    out.push({
      fieldKey,
      fieldId,
      label: fieldId ? schemaFieldLabelById(fieldId, schemaFields) : fieldKey,
      message,
    });
  }
  return out;
}

/** Parse BookingQube submit validation errors (`data.errors[].field_errors`). */
export function parseBookingQubeSubmitErrors(
  body: unknown,
  schemaFields?: BookingQubeSchemaField[],
): BookingQubeFieldErrorDetail[] {
  if (!body || typeof body !== "object") return [];
  const root = body as Record<string, unknown>;
  const errorsRaw = extractBookingQubeErrorsArray(root);

  const details: BookingQubeFieldErrorDetail[] = [];
  for (const item of errorsRaw) {
    if (!item || typeof item !== "object") continue;
    details.push(...collectFieldErrorsFromRow(item as Record<string, unknown>, schemaFields));
  }
  return details;
}

/** Human-readable summary; field_errors take priority over generic API messages. */
export function formatBookingQubeSubmitErrorSummary(
  body: unknown,
  schemaFields?: BookingQubeSchemaField[],
): string | null {
  const details = parseBookingQubeSubmitErrors(body, schemaFields);
  if (details.length > 0) {
    return details
      .map((d) => formatFieldErrorLine(d.fieldKey, d.message, schemaFields))
      .join("; ");
  }

  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const errorsRaw = extractBookingQubeErrorsArray(root);

  const lines: string[] = [];
  for (const item of errorsRaw) {
    if (typeof item === "string" && item.trim()) {
      lines.push(item.trim());
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const msg =
      (typeof row.message === "string" && row.message.trim()) ||
      (typeof row.error === "string" && row.error.trim()) ||
      null;
    if (msg && msg.toLowerCase() !== "validation failed") lines.push(msg);
  }

  return lines.length ? lines.join("; ") : null;
}

const DUPLICATE_REGISTRATION_HINTS = [
  "already registered",
  "email is already",
  "email already",
  "duplicate email",
  "already exists",
];

/** True when BookingQube rejected a registration because it already exists (e.g. duplicate email). */
export function isBookingQubeDuplicateRegistrationError(body: unknown): boolean {
  const haystack = formatBookingQubeSubmitErrorSummary(body)?.toLowerCase() ?? "";
  if (DUPLICATE_REGISTRATION_HINTS.some((h) => haystack.includes(h))) return true;

  if (!body || typeof body !== "object") return false;
  const root = body as Record<string, unknown>;
  const topMsg = typeof root.message === "string" ? root.message.toLowerCase() : "";
  if (DUPLICATE_REGISTRATION_HINTS.some((h) => topMsg.includes(h))) return true;

  const details = parseBookingQubeSubmitErrors(body);
  return details.some((d) =>
    DUPLICATE_REGISTRATION_HINTS.some((h) => d.message.toLowerCase().includes(h)),
  );
}

/** DB + label rows → mapping rows with numeric BookingQube field ids from schema. */
export function repairFieldMappingsFromSchema(
  mappings: BookingQubeFieldMapping[],
  schemaFields: BookingQubeSchemaField[],
): BookingQubeFieldMapping[] {
  if (!schemaFields.length) return mappings;

  const enriched = mappings.map((m) => {
    const explicit = m.bookingqube_field_id?.trim();
    if (explicit && /^\d+$/.test(explicit)) return m;
    const resolved = resolveBookingQubeFieldId(m, schemaFields);
    if (!resolved || !/^\d+$/.test(String(resolved))) return m;
    return { ...m, bookingqube_field_id: resolved };
  });

  const schemaOnly = filterMappingsToSchemaFields(enriched, schemaFields);

  const hasNumeric = schemaOnly.some((m) => {
    const id = m.bookingqube_field_id?.trim();
    return Boolean(id && /^\d+$/.test(id));
  });
  if (hasNumeric) return schemaOnly;

  return autoMapSchemaFieldsToLocal(schemaFields).map(({ bqId, bqLabel, local }) => ({
    bookingqube_field_id: bqId,
    bookingqube_label: bqLabel,
    local_field: local,
  }));
}

function humanizeLocalField(local: string): string {
  return local.replace(/_/g, " ");
}

/**
 * Fail before POST when core registration data or BQ field ids are missing.
 */
export function validateMappedRegistrationValues(input: {
  mappings: BookingQubeFieldMapping[];
  getLocalValue: (localField: string) => string | number | boolean | null | undefined;
  schemaFields?: BookingQubeSchemaField[];
  registrationId?: string;
}): SubmitPayloadValidation {
  const prefix = input.registrationId
    ? `Registration ${input.registrationId.slice(0, 8)}…`
    : "Registration";

  const mappings =
    input.schemaFields?.length && input.mappings.length
      ? repairFieldMappingsFromSchema(input.mappings, input.schemaFields)
      : input.mappings;

  const numericMappings = mappings.filter((m) => {
    const id = resolveBookingQubeFieldId(m, input.schemaFields);
    return Boolean(id && /^\d+$/.test(String(id)));
  });

  if (numericMappings.length === 0) {
    return {
      ok: false,
      message: `${prefix}: no BookingQube field ids — fetch form schema (Step 1) and save field mappings (Step 2)`,
    };
  }

  for (const local of SUBMIT_REQUIRED_LOCAL_FIELDS) {
    const mapped = numericMappings.some((m) => m.local_field === local);
    if (!mapped) {
      return {
        ok: false,
        message: `${prefix}: map ${humanizeLocalField(local)} to a BookingQube field in Step 2`,
      };
    }
    const value = toCellValue(input.getLocalValue(local));
    if (value === null) {
      return {
        ok: false,
        message: `${prefix}: missing ${humanizeLocalField(local)} — fill it on the registration or fix the mapping`,
      };
    }
  }

  return { ok: true, cellCount: 0, rowCount: 0 };
}

function labelMatches(a: string, b: string): boolean {
  const na = normalizeToken(a);
  const nb = normalizeToken(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

/** Resolve BookingQube field id from stored mapping + optional schema. */
export function resolveBookingQubeFieldId(
  mapping: BookingQubeFieldMapping,
  schemaFields?: BookingQubeSchemaField[],
): string | null {
  const explicit = mapping.bookingqube_field_id?.trim();
  if (explicit) return explicit;

  if (!schemaFields?.length) return null;

  const byLabel = schemaFields.find((f) => labelMatches(f.label, mapping.bookingqube_label));
  if (byLabel) return byLabel.id;

  const byName = schemaFields.find(
    (f) => f.name && labelMatches(f.name, mapping.bookingqube_label),
  );
  return byName?.id ?? null;
}

/** Coerce BookingQube event id to a positive integer for submit payloads. */
export function coerceBookingQubeEventId(
  value: string | number | null | undefined,
): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function resolveSubmitEventRef(input: {
  bookingqubeEventId?: string | number | null;
  schemaEventId?: string | null;
  schemaSlug?: string | null;
  /** Numeric form id only — never use a text slug as event_id */
  formId?: string;
}): { event_id?: number; slug?: string } {
  const numeric =
    coerceBookingQubeEventId(input.bookingqubeEventId) ??
    coerceBookingQubeEventId(input.schemaEventId) ??
    (input.formId ? coerceBookingQubeEventId(input.formId) : null);
  if (numeric !== null) return { event_id: numeric };
  const slug = input.schemaSlug?.trim();
  return slug ? { slug } : {};
}

function toCellValue(val: string | number | boolean | null | undefined): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}

function toFieldId(id: string): number | string {
  return /^\d+$/.test(id) ? Number(id) : id;
}

function isRegistrationCell(value: unknown): value is BookingQubeRegistrationCell {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return "id" in o && "value" in o;
}

/** True when `registrations` is a flat list of `{ id, value }` cells (invalid for submit API). */
export function isFlatRegistrationsArray(registrations: unknown): boolean {
  if (!Array.isArray(registrations) || registrations.length === 0) return false;
  return isRegistrationCell(registrations[0]);
}

/**
 * Coerce `registrations` to BookingQube shape: array of rows, each row = array of cells.
 * Repairs legacy payloads that used `registrations: row` instead of `registrations: [row]`.
 */
export function normalizeSubmitRegistrations(
  registrations: unknown,
): BookingQubeRegistrationCell[][] {
  if (!Array.isArray(registrations) || registrations.length === 0) return [];

  if (isFlatRegistrationsArray(registrations)) {
    const cells = registrations.filter(isRegistrationCell);
    return cells.length ? [cells] : [];
  }

  const rows: BookingQubeRegistrationCell[][] = [];
  for (const row of registrations) {
    if (!Array.isArray(row) || row.length === 0) continue;
    if (!isRegistrationCell(row[0])) continue;
    rows.push(row.filter(isRegistrationCell));
  }
  return rows;
}

/**
 * Build BookingQube registration-form/submit body from mappings + local values.
 */
export function buildSubmitPayload(input: {
  formId: string;
  bookingqubeEventId?: string | number | null;
  schemaEventId?: string | null;
  schemaSlug?: string | null;
  mappings: BookingQubeFieldMapping[];
  getLocalValue: (localField: string) => string | number | boolean | null | undefined;
  schemaFields?: BookingQubeSchemaField[];
}): SubmitRegistrationPayload {
  const effectiveMappings = filterMappingsForSubmit(input.mappings, input.schemaFields);
  const row: BookingQubeRegistrationCell[] = [];
  const seenIds = new Set<string>();

  for (const m of effectiveMappings) {
    const fieldId = resolveBookingQubeFieldId(m, input.schemaFields);
    if (!fieldId) continue;

    const idKey = String(fieldId);
    if (seenIds.has(idKey)) continue;

    const raw = input.getLocalValue(m.local_field);
    const value = toCellValue(raw);
    if (value === null) continue;

    seenIds.add(idKey);
    row.push({ id: toFieldId(fieldId), value });
  }

  const eventRef = resolveSubmitEventRef({
    bookingqubeEventId: input.bookingqubeEventId,
    schemaEventId: input.schemaEventId,
    schemaSlug: input.schemaSlug,
    formId: input.formId,
  });

  const payload: SubmitRegistrationPayload = {
    ...eventRef,
    registrations: normalizeSubmitRegistrations(row.length ? [row] : []),
  };

  return payload;
}

/** Count mapped cells with id + non-empty value across all registration rows. */
export function countSubmitPayloadCells(payload: SubmitRegistrationPayload): number {
  return normalizeSubmitRegistrations(payload.registrations).reduce(
    (sum, row) => sum + row.filter((c) => toCellValue(c.value) !== null).length,
    0,
  );
}

/** Dev/runtime guard — throws if shape is not nested array-of-rows (used before POST). */
export function assertNestedSubmitRegistrations(
  registrations: unknown,
): asserts registrations is BookingQubeRegistrationCell[][] {
  if (isFlatRegistrationsArray(registrations)) {
    throw new Error(
      "registrations must be [[{ id, value }, ...]] — got a flat array of field objects",
    );
  }
  const rows = normalizeSubmitRegistrations(registrations);
  if (!rows.length || !rows.some((r) => r.length > 0)) {
    throw new Error("registrations must contain at least one row with id + value cells");
  }
}

/** Fail before POST when payload cannot satisfy BookingQube submit API. */
export function validateSubmitPayload(
  payload: SubmitRegistrationPayload,
  opts?: { registrationId?: string },
): SubmitPayloadValidation {
  const prefix = opts?.registrationId
    ? `Registration ${opts.registrationId.slice(0, 8)}…`
    : "Registration";

  if (isFlatRegistrationsArray(payload.registrations)) {
    return {
      ok: false,
      message: `${prefix}: registrations must be an array of rows (array of arrays), not a flat list of { id, value } objects — expected [[{ id, value }, ...]]`,
    };
  }

  const eventId = coerceBookingQubeEventId(payload.event_id);
  if (eventId === null) {
    if (payload.slug?.trim()) {
      return {
        ok: false,
        message: `${prefix}: BookingQube event_id is required for POST submit — set BookingQube event id (e.g. 92) on the linked event in Step 2, not only a slug`,
      };
    }
    return {
      ok: false,
      message: `${prefix}: BookingQube event_id is missing — set BookingQube event id on the event link (Step 2)`,
    };
  }

  const rows = normalizeSubmitRegistrations(payload.registrations).filter((row) => row.length > 0);
  if (rows.length === 0) {
    return {
      ok: false,
      message: `${prefix}: no mapped fields with values — check field mappings (Step 2) and that name, mobile, and email are filled`,
    };
  }

  let cellCount = 0;
  for (const row of rows) {
    for (const cell of row) {
      const id =
        typeof cell.id === "number"
          ? cell.id
          : typeof cell.id === "string" && /^\d+$/.test(cell.id.trim())
            ? Number(cell.id.trim())
            : NaN;
      const value = toCellValue(cell.value);
      if (!Number.isNaN(id) && id > 0 && value !== null) cellCount++;
    }
  }

  if (cellCount === 0) {
    return {
      ok: false,
      message: `${prefix}: no valid BookingQube field cells (numeric field id + value) — re-save mappings with ids from the fetched schema (e.g. 7, 8, 9, 10)`,
    };
  }

  return { ok: true, cellCount, rowCount: rows.length };
}

/**
 * Strip to API shape: { event_id: number, registrations: [[{ id, value }, ...]] }.
 * Omits slug and other keys the submit endpoint may reject.
 */
export function sanitizeSubmitRequestBody(
  payload: SubmitRegistrationPayload,
): BookingQubeSubmitRequestBody {
  const normalized: SubmitRegistrationPayload = {
    ...payload,
    registrations: normalizeSubmitRegistrations(payload.registrations),
  };

  const validation = validateSubmitPayload(normalized);
  if (!validation.ok) throw new Error(validation.message);

  const event_id = coerceBookingQubeEventId(normalized.event_id)!;
  const registrations = (normalized.registrations ?? [])
    .map((row) =>
      row
        .map((cell) => {
          const id =
            typeof cell.id === "number"
              ? cell.id
              : typeof cell.id === "string" && /^\d+$/.test(cell.id.trim())
                ? Number(cell.id.trim())
                : NaN;
          const value = toCellValue(cell.value);
          if (Number.isNaN(id) || id <= 0 || value === null) return null;
          return { id, value };
        })
        .filter((c): c is { id: number; value: string } => c !== null),
    )
    .filter((row) => row.length > 0);

  if (registrations.length === 0) {
    throw new Error(
      "No valid BookingQube field cells (numeric field id + value) — re-save field mappings with ids from the fetched schema (e.g. 7, 8, 9, 10)",
    );
  }

  return { event_id, registrations };
}

/** Sample local values for admin endpoint test / preview. */
export const SAMPLE_LOCAL_REGISTRATION_VALUES: Record<string, string | number> = {
  customer_name: "Test User (SummerSplash)",
  mobile: "+97450000000",
  email: "test@summersplash.example",
  nationality: "Tourist",
  age_group: "Adult (18–59 years)",
  guest_count: 2,
  booking_date: new Date().toISOString().slice(0, 10),
  slot_name: "Morning slot · 10 am – 1 pm",
  slot_time: "10 am – 1 pm",
  event_name: "Summer Splash",
  bookingqube_ticket_id: "sample-ticket",
  qr_token: "sample-qr-token",
  metadata: JSON.stringify({ source: "admin_test" }),
};

export function buildSampleSubmitPayload(input: {
  formId: string;
  bookingqubeEventId?: string | number | null;
  schemaEventId?: string | null;
  schemaSlug?: string | null;
  mappings: BookingQubeFieldMapping[];
  schemaFields?: BookingQubeSchemaField[];
}): SubmitRegistrationPayload {
  return buildSubmitPayload({
    ...input,
    getLocalValue: (localField) =>
      SAMPLE_LOCAL_REGISTRATION_VALUES[localField] ?? null,
  });
}

/** Infer endpoint role from path when admin did not set role explicitly. */
export function inferEndpointRole(
  method: string,
  path: string,
): "submit" | "form_fetch" | null {
  const p = path.toLowerCase();
  if (
    method === "GET" &&
    (p.includes("registration-form") || p.includes("{formid}") || p.includes("{slug}"))
  ) {
    return "form_fetch";
  }
  if (method === "POST" && p.includes("submit")) {
    return "submit";
  }
  return null;
}

/** Substitute common path placeholders from form slug/id and optional BQ event id. */
export function buildPathVarsFromFormContext(
  formId: string,
  bookingqubeEventId?: string | number | null,
): Record<string, string> {
  const vars: Record<string, string> = {};
  const trimmed = formId.trim();
  if (trimmed) {
    vars.formId = trimmed;
    vars.slug = trimmed;
  }
  if (bookingqubeEventId !== undefined && bookingqubeEventId !== null && String(bookingqubeEventId).trim()) {
    const eid = String(bookingqubeEventId).trim();
    vars.eventId = eid;
    vars.event_id = eid;
  }
  return vars;
}

/** True when path template expects a form slug/id placeholder. */
export function pathNeedsFormContext(path: string): boolean {
  const p = path.toLowerCase();
  return p.includes("{formid}") || p.includes("{slug}");
}

/** True when a full URL template still needs slug/formId substitution. */
export function urlTemplateNeedsFormContext(url: string): boolean {
  return pathNeedsFormContext(url);
}

/** Derive a BookingQube slug from a SummerSplash event name. */
export function slugifyEventName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveFormIdForEvent(input: {
  explicitFormId?: string | null;
  eventName?: string | null;
}): string | null {
  const explicit = input.explicitFormId?.trim();
  if (explicit) return explicit;
  const name = input.eventName?.trim();
  if (!name) return null;
  return slugifyEventName(name) || null;
}
