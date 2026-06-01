"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  BOOKINGQUBE_BOOTSTRAP_MIGRATION_FILE,
  bookingQubeIntegrationTableErrorMessage,
  isBookingQubeIntegrationTableError,
} from "@/lib/bookingqube.integration";
import { getAuthContext } from "@/lib/server-auth";
import { localCalendarRangeBoundsIso } from "@/lib/date-bounds";
import {
  countActionableInvalidScans,
  isActionableInvalidScan,
  isValidEntryCheckin,
  registrationStatusFromScanRow,
} from "@/lib/scan-metrics";
import { formatYmd } from "@/lib/utils";
import { normalizeStaffUsername } from "@/lib/staff-auth";
import { getDashboardCounts, getDashboardSchedule } from "@/lib/summersplash.functions";
import { getSupabaseAdminClientOrNull } from "@/integrations/supabase/client.server";
import type { AdminServerFilters } from "@/lib/admin-filters.types";
import { computeBookingStats } from "@/components/admin/admin-bookings-utils";

const adminListFiltersSchema = z
  .object({
    eventId: z.string().uuid().optional(),
    slotId: z.string().uuid().optional(),
    status: z
      .enum(["active", "entered", "exited", "auto_exited", "expired", "invalid"])
      .optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    search: z.string().max(200).optional(),
  })
  .optional();

function endOfDayIso(ymd: string) {
  return `${ymd}T23:59:59.999Z`;
}

type ParsedRegistrationFilters = z.infer<typeof adminListFiltersSchema>;

function registrationSlotJoin(parsed: ParsedRegistrationFilters) {
  return parsed?.eventId ? "slots!inner" : "slots";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyRegistrationListFilters(query: any, parsed: ParsedRegistrationFilters) {
  if (parsed?.slotId) query = query.eq("slot_id", parsed.slotId);
  if (parsed?.status) query = query.eq("status", parsed.status);
  if (parsed?.dateFrom || parsed?.dateTo) {
    const { startIso, endIso } = localCalendarRangeBoundsIso(parsed?.dateFrom, parsed?.dateTo);
    if (startIso) query = query.gte("created_at", startIso);
    if (endIso) query = query.lt("created_at", endIso);
  }
  if (parsed?.search) {
    const term = parsed.search.replace(/[%_,]/g, "");
    if (term) {
      query = query.or(
        `customer_name.ilike.%${term}%,mobile.ilike.%${term}%,email.ilike.%${term}%`,
      );
    }
  }
  if (parsed?.eventId) query = query.eq("slots.event_id", parsed.eventId);
  return query;
}

const adminListPaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(500).default(12),
});

async function assertAdmin(supabase: Awaited<ReturnType<typeof getAuthContext>>["supabase"], userId: string) {
  const { data: isAdmin, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Forbidden: admin only");
}

async function adminContext() {
  const ctx = await getAuthContext();
  await assertAdmin(ctx.supabase, ctx.userId);
  return ctx;
}

const EVENT_LIST_COLUMNS =
  "id, name, event_date, start_date, end_date, is_active, created_at";

// ===== Events =====
export async function adminListEvents() {
  const { supabase } = await adminContext();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_LIST_COLUMNS)
    .order("event_date", { ascending: false });
  if (error) throw new Error(error.message);
    return { events: data ?? [] };
}

/** Events + unfiltered slots in one auth round-trip (for shell prefetch). */
export async function adminPrefetchCatalog() {
  const { supabase } = await adminContext();
  const [eventsRes, slotsRes] = await Promise.all([
    supabase.from("events").select(EVENT_LIST_COLUMNS).order("event_date", { ascending: false }),
    supabase
      .from("slots")
      .select(
        "id, event_id, name, starts_at, ends_at, capacity, hidden_from_booking, events(name, event_date)",
      )
      .order("starts_at", { ascending: false })
      .limit(1000),
  ]);
  if (eventsRes.error) throw new Error(eventsRes.error.message);
  if (slotsRes.error) throw new Error(slotsRes.error.message);
  return { events: eventsRes.data ?? [], slots: slotsRes.data ?? [] };
}

/** Lightweight guest totals per slot (metrics / capacity bars). */
export async function adminRegistrationSlotTotals() {
  const { supabase } = await adminContext();
  const { data, error } = await supabase.from("registrations").select("slot_id, guest_count");
  if (error) throw new Error(error.message);
  return { registrations: data ?? [] };
}

const overviewBootstrapSchema = z.object({
  eventId: z.string().uuid().optional(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Overview tab: one admin auth check, parallel counts + week schedule. */
export async function adminOverviewBootstrap(input: z.infer<typeof overviewBootstrapSchema>) {
  const data = overviewBootstrapSchema.parse(input);
  await adminContext();
  const eventArg = data.eventId ? { eventId: data.eventId } : {};
  const [counts, schedule] = await Promise.all([
    getDashboardCounts(eventArg),
    getDashboardSchedule({
      eventId: data.eventId,
      weekStart: data.weekStart,
    }),
  ]);
  return { counts, schedule };
}

const eventSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(120),
    start_date: z.string(),
    end_date: z.string(),
    is_active: z.boolean(),
  })
  .refine((d) => d.start_date <= d.end_date, {
    message: "Start date must be on or before end date",
    path: ["end_date"],
  });

export async function adminUpsertEvent(input: z.infer<typeof eventSchema>) {
  const data = eventSchema.parse(input);
  const { supabase } = await adminContext();
    const payload = {
      name: data.name,
      event_date: data.start_date,
      start_date: data.start_date,
      end_date: data.end_date,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await supabase.from("events").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("events").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
}

export async function adminDeleteEvent(input: { id: string }) {
  const data = z.object({ id: z.string().uuid() }).parse(input);
  const { supabase } = await adminContext();
  await supabase.from("events").delete().eq("id", data.id);
    return { ok: true };
}

// ===== Slots =====
export async function adminListSlots(filters?: AdminServerFilters) {
  const parsed = adminListFiltersSchema.parse(filters);
  const { supabase } = await adminContext();
  let query = supabase
    .from("slots")
    .select("*, events(name, event_date)")
    .order("starts_at", { ascending: false });

  if (parsed?.eventId) query = query.eq("event_id", parsed.eventId);
  if (parsed?.slotId) query = query.eq("id", parsed.slotId);
  if (parsed?.dateFrom) query = query.gte("starts_at", `${parsed.dateFrom}T00:00:00.000Z`);
  if (parsed?.dateTo) query = query.lte("starts_at", endOfDayIso(parsed.dateTo));
  if (parsed?.search) {
    const term = parsed.search.replace(/[%_,]/g, "");
    if (term) query = query.ilike("name", `%${term}%`);
  }

  const { data, error } = await query.limit(1000);
  if (error) throw new Error(error.message);
    return { slots: data ?? [] };
}

const slotSchema = z.object({
    id: z.string().uuid().optional(),
    event_id: z.string().uuid(),
    name: z.string().min(1).max(120),
    starts_at: z.string(),
    ends_at: z.string(),
    capacity: z.number().int().min(1).max(100000),
    hidden_from_booking: z.boolean().optional().default(false),
});

export async function adminUpsertSlot(input: z.infer<typeof slotSchema>) {
  const data = slotSchema.parse(input);
  const { supabase } = await adminContext();
  const payload = {
    event_id: data.event_id,
    name: data.name,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    capacity: data.capacity,
    hidden_from_booking: data.hidden_from_booking,
  };
    if (data.id) {
    await supabase.from("slots").update(payload).eq("id", data.id);
    } else {
    await supabase.from("slots").insert(payload);
    }
    return { ok: true };
}

export async function adminDeleteSlot(input: { id: string }) {
  const data = z.object({ id: z.string().uuid() }).parse(input);
  const { supabase } = await adminContext();
  await supabase.from("slots").delete().eq("id", data.id);
    return { ok: true };
}

const generateSlotsSchema = z.object({
    event_id: z.string().uuid(),
    name: z.string().min(1).max(120),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    capacity: z.number().int().min(1).max(100000),
    recurrence: z.enum(["once", "daily", "weekly", "monthly"]),
  weekday: z.number().int().min(0).max(6).optional(),
});

export async function adminGenerateSlots(input: z.infer<typeof generateSlotsSchema>) {
  const data = generateSlotsSchema.parse(input);
  const { supabase } = await adminContext();
  const { data: ev } = await supabase.from("events").select("start_date, end_date").eq("id", data.event_id).maybeSingle();
    if (!ev) throw new Error("Event not found");
    const start = new Date(ev.start_date + "T00:00:00");
    const end = new Date(ev.end_date + "T00:00:00");
    const dates: string[] = [];
    const cursor = new Date(start);
  const monthAnchorDay = start.getDate();
    while (cursor <= end) {
      let include = false;
      if (data.recurrence === "once") {
        include = cursor.getTime() === start.getTime();
      } else if (data.recurrence === "daily") {
        include = true;
      } else if (data.recurrence === "weekly") {
        include = data.weekday != null ? cursor.getDay() === data.weekday : cursor.getDay() === start.getDay();
      } else if (data.recurrence === "monthly") {
        include = cursor.getDate() === monthAnchorDay;
      }
      if (include) dates.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
      if (data.recurrence === "once") break;
    }
    const rows = dates.map((d) => ({
      event_id: data.event_id,
      name: data.name,
      starts_at: new Date(`${d}T${data.start_time}:00`).toISOString(),
      ends_at: new Date(`${d}T${data.end_time}:00`).toISOString(),
      capacity: data.capacity,
    }));
    if (rows.length === 0) throw new Error("No matching dates in event range");
  const { error } = await supabase.from("slots").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
}

// ===== Registrations =====
export async function adminListRegistrations(
  filters?: AdminServerFilters,
  pagination?: z.infer<typeof adminListPaginationSchema>,
) {
  const parsed = adminListFiltersSchema.parse(filters);
  const { page, pageSize } = adminListPaginationSchema.parse(pagination ?? {});
  const { supabase } = await adminContext();

  const slotJoin = registrationSlotJoin(parsed);
  const slotSelect = `${slotJoin}(id, name, capacity, starts_at, ends_at, event_id, events(id, name))`;
  const baseCols = `id, customer_name, mobile, email, guest_count, status, created_at, qr_token, slot_id`;
  const emailCols = `pass_email_status, pass_email_sent_at, pass_email_error`;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const runList = (select: string) => {
    let q = supabase.from("registrations").select(select, { count: "exact" });
    q = applyRegistrationListFilters(q, parsed);
    q = q.order("created_at", { ascending: false }).order("id", { ascending: false });
    return q.range(from, to);
  };

  let { data, error, count } = await runList(`${baseCols}, ${emailCols}, ${slotSelect}`);

  // Back-compat: pass_email_* columns may not be migrated yet.
  if (error && /pass_email_/.test(error.message ?? "")) {
    ({ data, error, count } = await runList(`${baseCols}, ${slotSelect}`));
  }
  if (error) throw new Error(error.message);
  return { registrations: data ?? [], total: count ?? 0 };
}

const resendEmailSchema = z.object({ id: z.string().uuid() });

/** Re-send the digital pass email for a registration. Always allowed (even if already sent). */
export async function adminResendDigitalPassEmail(input: z.infer<typeof resendEmailSchema>) {
  const data = resendEmailSchema.parse(input);
  await adminContext();
  const { resendDigitalPassEmail } = await import("@/lib/mailgun.server");
  const result = await resendDigitalPassEmail(data.id);
  if (!result.ok) {
    throw new Error(result.error || "Failed to send email");
  }
  return { ok: true };
}

/** Lightweight status totals for bookings stat cards (same filters as the table). */
export async function adminRegistrationBookingStats(filters?: AdminServerFilters) {
  const parsed = adminListFiltersSchema.parse(filters);
  const { supabase } = await adminContext();

  const slotJoin = registrationSlotJoin(parsed);
  let query = supabase.from("registrations").select(`status, guest_count, ${slotJoin}(event_id)`);
  query = applyRegistrationListFilters(query, parsed);

  const { data, error } = await query.limit(5000);
  if (error) throw new Error(error.message);

  return {
    stats: computeBookingStats(
      (data ?? []).map((row) => ({
        guest_count: row.guest_count ?? 0,
        status: row.status as string,
      })),
    ),
  };
}

const registrationStatusSchema = z.enum([
  "active",
  "entered",
  "exited",
  "auto_exited",
  "expired",
  "invalid",
]);

const registrationUpdateSchema = z.object({
  id: z.string().uuid(),
  customer_name: z.string().trim().min(1).max(120),
  mobile: z.string().trim().min(7).max(32),
  email: z.string().trim().email().max(255).optional().or(z.literal("")).nullable(),
  guest_count: z.number().int().min(1).max(20),
  slot_id: z.string().uuid(),
  status: registrationStatusSchema,
});

const CAPACITY_STATUSES = new Set(["active", "entered"]);

async function sumSlotGuestsForDay(
  supabase: Awaited<ReturnType<typeof getAuthContext>>["supabase"],
  slotId: string,
  dateStr: string,
  excludeRegistrationId?: string,
) {
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { data, error } = await supabase
    .from("registrations")
    .select("id, guest_count")
    .eq("slot_id", slotId)
    .in("status", ["active", "entered"])
    .gte("created_at", dayStart.toISOString())
    .lt("created_at", dayEnd.toISOString());

  if (error) throw new Error(error.message);

  return (data ?? []).reduce((sum, row) => {
    if (excludeRegistrationId && row.id === excludeRegistrationId) return sum;
    return sum + (row.guest_count ?? 1);
  }, 0);
}

export async function adminUpdateRegistration(input: z.infer<typeof registrationUpdateSchema>) {
  const data = registrationUpdateSchema.parse(input);
  const { supabase } = await adminContext();

  const { data: existing, error: fetchError } = await supabase
    .from("registrations")
    .select("id, created_at")
    .eq("id", data.id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Registration not found");

  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("id, capacity")
    .eq("id", data.slot_id)
    .maybeSingle();

  if (slotError) throw new Error(slotError.message);
  if (!slot) throw new Error("Slot not found");

  if (CAPACITY_STATUSES.has(data.status)) {
    const bookingDate = existing.created_at.slice(0, 10);
    const used = await sumSlotGuestsForDay(supabase, data.slot_id, bookingDate, data.id);
    if (used + data.guest_count > slot.capacity) {
      throw new Error(
        `Slot is full for this day (${used} of ${slot.capacity} spots already booked)`,
      );
    }
  }

  const { error: updateError } = await supabase
    .from("registrations")
    .update({
      customer_name: data.customer_name,
      mobile: data.mobile,
      email: data.email?.trim() ? data.email.trim() : null,
      guest_count: data.guest_count,
      slot_id: data.slot_id,
      status: data.status,
    })
    .eq("id", data.id);

  if (updateError) throw new Error(updateError.message);

  const { scheduleBookingQubeOutboundSync } = await import("@/lib/bookingqube.sync");
  scheduleBookingQubeOutboundSync(data.id);

  return { ok: true };
}

export async function adminDeleteRegistration(input: { id: string }) {
  const data = z.object({ id: z.string().uuid() }).parse(input);
  const { supabase } = await adminContext();

  const { error } = await supabase.from("registrations").delete().eq("id", data.id);
  if (error) throw new Error(error.message);

  return { ok: true };
}

const bulkDeleteRegistrationsSchema = z.object({
  confirmPhrase: z.literal("DELETE ALL"),
  scope: z.enum(["all", "filtered"]),
  filters: z.record(z.string(), z.unknown()).optional(),
});

function registrationDeleteDb() {
  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    throw new Error(
      "Bulk delete requires SUPABASE_SERVICE_ROLE_KEY. Add it under Admin → Settings → Supabase, then restart the server.",
    );
  }
  return admin;
}

/** Collect registration ids matching list filters (for filtered bulk delete). */
async function listRegistrationIdsForBulkDelete(
  db: ReturnType<typeof registrationDeleteDb>,
  parsed: ParsedRegistrationFilters,
): Promise<string[]> {
  const ids: string[] = [];
  const pageSize = 1000;
  let offset = 0;

  for (;;) {
    const slotJoin = registrationSlotJoin(parsed);
    let query = db.from("registrations").select(`id, ${slotJoin}(event_id)`);
    query = applyRegistrationListFilters(query, parsed);
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as { id: string }[];
    if (batch.length === 0) break;
    ids.push(...batch.map((r) => r.id));
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return ids;
}

async function deleteRegistrationIdsInBatches(
  db: ReturnType<typeof registrationDeleteDb>,
  ids: string[],
): Promise<number> {
  const chunkSize = 500;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error } = await db.from("registrations").delete().in("id", chunk);
    if (error) throw new Error(error.message);
    deleted += chunk.length;
  }
  return deleted;
}

/** Permanently delete registrations (all rows or current filter set). Admin only. */
export async function adminDeleteAllRegistrations(
  input: z.infer<typeof bulkDeleteRegistrationsSchema>,
) {
  const data = bulkDeleteRegistrationsSchema.parse(input);
  await adminContext();
  const db = registrationDeleteDb();

  if (data.scope === "all") {
    const { error, count } = await db
      .from("registrations")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(error.message);
    return { ok: true, deleted: count ?? 0 };
  }

  const parsed = adminListFiltersSchema.parse(data.filters ?? {});
  const ids = await listRegistrationIdsForBulkDelete(db, parsed);
  if (ids.length === 0) return { ok: true, deleted: 0 };
  const deleted = await deleteRegistrationIdsInBatches(db, ids);
  return { ok: true, deleted };
}

// ===== Settings =====
export async function adminGetSettings() {
  const { supabase } = await adminContext();
  const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
    return { settings: data };
}

const scannerSettingsSchema = z.object({
    scandit_api_key: z.string().max(5000).optional().nullable(),
    scandit_enabled: z.boolean(),
});

export async function adminSaveScannerSettings(input: z.infer<typeof scannerSettingsSchema>) {
  const data = scannerSettingsSchema.parse(input);
  const { supabase } = await adminContext();
  await supabase.from("app_settings").update({
      scandit_api_key: data.scandit_api_key ?? null,
      scandit_enabled: data.scandit_enabled,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    return { ok: true };
}

/** @deprecated Use adminSaveScannerSettings */
export async function adminSaveSettings(input: z.infer<typeof scannerSettingsSchema>) {
  return adminSaveScannerSettings(input);
}

const mailgunSettingsSchema = z.object({
  // Driver + shared toggle
  mail_driver: z.enum(["api", "smtp"]).optional(),
  mailgun_enabled: z.boolean(),
  // Mailgun HTTP API fields
  mailgun_api_key: z.string().max(5000).optional().nullable(),
  mailgun_domain: z.string().trim().max(255).optional().nullable(),
  mailgun_from_email: z.string().trim().email().max(255).optional().nullable(),
  mailgun_region: z.enum(["us", "eu"]).optional(),
  // SMTP fields
  mail_host: z.string().trim().max(255).optional().nullable(),
  mail_port: z.number().int().min(1).max(65535).optional().nullable(),
  mail_username: z.string().trim().max(255).optional().nullable(),
  mail_password: z.string().max(5000).optional().nullable(),
  mail_encryption: z.enum(["tls", "ssl", "none"]).optional().nullable(),
  mail_from_email: z.string().trim().email().max(255).optional().nullable(),
  mail_from_name: z.string().trim().max(120).optional().nullable(),
});

type MailgunSettingsRow = {
  mailgun_domain?: string | null;
  mailgun_from_email?: string | null;
  mailgun_enabled?: boolean | null;
  mailgun_api_key?: string | null;
  mailgun_region?: string | null;
  mail_driver?: string | null;
  mail_host?: string | null;
  mail_port?: number | null;
  mail_username?: string | null;
  mail_password?: string | null;
  mail_encryption?: string | null;
  mail_from_email?: string | null;
  mail_from_name?: string | null;
};

type DbResult = { data: MailgunSettingsRow | null; error: { message?: string } | null };

const MAILGUN_SELECT_FULL =
  "mailgun_domain, mailgun_from_email, mailgun_enabled, mailgun_api_key, mailgun_region, " +
  "mail_driver, mail_host, mail_port, mail_username, mail_password, mail_encryption, mail_from_email, mail_from_name";

export async function adminGetMailgunSettings() {
  const { isMailgunConfiguredFromEnv, resolveMailFromName } = await import("@/lib/mailgun.server");
  const { supabase } = await adminContext();
  // These columns may not be in the generated DB types yet; cast through unknown.
  let res = (await supabase
    .from("app_settings")
    .select(MAILGUN_SELECT_FULL)
    .eq("id", 1)
    .maybeSingle()) as unknown as DbResult;

  // Back-compat: SMTP (mail_*) migration not applied.
  if (res.error && /mail_(driver|host|port|username|password|encryption|from)/.test(res.error.message ?? "")) {
    res = (await supabase
      .from("app_settings")
      .select("mailgun_domain, mailgun_from_email, mailgun_enabled, mailgun_api_key, mailgun_region")
      .eq("id", 1)
      .maybeSingle()) as unknown as DbResult;
  }
  // Back-compat: region migration not applied.
  if (res.error && /mailgun_region/.test(res.error.message ?? "")) {
    res = (await supabase
      .from("app_settings")
      .select("mailgun_domain, mailgun_from_email, mailgun_enabled, mailgun_api_key")
      .eq("id", 1)
      .maybeSingle()) as unknown as DbResult;
  }
  if (res.error) throw new Error(res.error.message ?? "Failed to load email settings");

  const data = res.data;
  const hasApiKey = Boolean(data?.mailgun_api_key?.trim());
  const apiKeyFromEnv = isMailgunConfiguredFromEnv() && !hasApiKey;
  const region = data?.mailgun_region?.trim().toLowerCase() === "eu" ? "eu" : "us";
  const encRaw = data?.mail_encryption?.trim().toLowerCase();
  const encryption = encRaw === "ssl" || encRaw === "none" ? encRaw : "tls";
  const hasMailPassword = Boolean(data?.mail_password?.trim());
  const storedPasswordLength = data?.mail_password?.length ?? 0;
  const passwordLooksTruncated = storedPasswordLength > 0 && storedPasswordLength < 32;

  const legacySmtpHost =
    data?.mailgun_domain?.trim().toLowerCase().startsWith("smtp.") ||
    data?.mailgun_domain?.trim().toLowerCase() === "smtp.mailgun.org" ||
    data?.mailgun_domain?.trim().toLowerCase() === "smtp.eu.mailgun.org"
      ? data.mailgun_domain
      : null;

  const smtpHost = data?.mail_host ?? legacySmtpHost;
  const smtpConfigured = Boolean(
    smtpHost?.trim() &&
      data?.mail_username?.trim() &&
      hasMailPassword &&
      !passwordLooksTruncated &&
      (data?.mail_from_email?.trim() || data?.mailgun_from_email?.trim()),
  );
  const apiDomain = data?.mailgun_domain?.trim();
  const apiConfigured =
    (hasApiKey || apiKeyFromEnv) &&
    Boolean(apiDomain) &&
    !apiDomain!.toLowerCase().startsWith("smtp.");

  const explicitDriver = data?.mail_driver?.trim().toLowerCase();
  const driver: "api" | "smtp" =
    explicitDriver === "smtp" || explicitDriver === "api"
      ? explicitDriver
      : smtpConfigured
        ? "smtp"
        : "api";

  return {
    settings: {
      mail_driver: driver,
      mailgun_enabled: !!data?.mailgun_enabled,
      mailgun_domain: legacySmtpHost ? null : data?.mailgun_domain ?? null,
      mailgun_from_email: data?.mailgun_from_email ?? null,
      mailgun_region: region as "us" | "eu",
      mail_host: smtpHost ?? null,
      mail_port: data?.mail_port ?? null,
      mail_username:
        data?.mail_username ??
        (driver === "smtp" && !data?.mail_host ? data?.mailgun_from_email : null) ??
        null,
      mail_encryption: encryption as "tls" | "ssl" | "none",
      mail_from_email: data?.mail_from_email ?? null,
      mail_from_name: resolveMailFromName(data?.mail_from_name),
    },
    hasApiKey,
    apiKeyConfigured: hasApiKey || apiKeyFromEnv,
    apiKeyFromEnv,
    hasMailPassword: hasMailPassword || (driver === "api" && hasApiKey),
    storedPasswordLength,
    passwordLooksTruncated,
    configured: driver === "smtp" ? smtpConfigured : apiConfigured,
  };
}

export async function adminTestSmtpConnection() {
  await adminContext();
  const { verifySmtpConnection } = await import("@/lib/mailgun.server");
  const result = await verifySmtpConnection();
  if (!result.ok) throw new Error(result.error || "SMTP connection failed");
  return { ok: true as const };
}

export async function adminSaveMailgunSettings(input: z.infer<typeof mailgunSettingsSchema>) {
  const data = mailgunSettingsSchema.parse(input);
  const { supabase } = await adminContext();
  const driver = data.mail_driver ?? "api";

  if (driver === "smtp" && !data.mail_password?.trim()) {
    const { data: current } = (await supabase
      .from("app_settings")
      .select("mail_password")
      .eq("id", 1)
      .maybeSingle()) as { data: { mail_password?: string | null } | null };
    const len = current?.mail_password?.length ?? 0;
    if (len > 0 && len < 32) {
      throw new Error(
        `Stored SMTP password is only ${len} characters (likely truncated). Paste the full Mailgun SMTP password from Domain → SMTP credentials and save again.`,
      );
    }
  }

  const smtpFields: Record<string, unknown> = {
    mail_driver: driver,
    ...(data.mail_host !== undefined ? { mail_host: data.mail_host?.trim() || null } : {}),
    ...(data.mail_port !== undefined ? { mail_port: data.mail_port ?? null } : {}),
    ...(data.mail_username !== undefined
      ? { mail_username: data.mail_username?.trim() || null }
      : {}),
    ...(data.mail_password?.trim() ? { mail_password: data.mail_password.trim() } : {}),
    ...(data.mail_encryption !== undefined ? { mail_encryption: data.mail_encryption ?? null } : {}),
    ...(data.mail_from_email !== undefined
      ? { mail_from_email: data.mail_from_email?.trim() || null }
      : {}),
    ...(data.mail_from_name !== undefined
      ? { mail_from_name: data.mail_from_name?.trim() || null }
      : {}),
  };

  const apiFields: Record<string, unknown> = {
    ...(data.mailgun_domain !== undefined
      ? { mailgun_domain: data.mailgun_domain?.trim() || null }
      : {}),
    ...(data.mailgun_from_email !== undefined
      ? { mailgun_from_email: data.mailgun_from_email?.trim() || null }
      : {}),
    ...(data.mailgun_region ? { mailgun_region: data.mailgun_region } : {}),
    ...(data.mailgun_api_key !== undefined
      ? { mailgun_api_key: data.mailgun_api_key?.trim() || null }
      : {}),
  };

  // Driver-aware: only persist fields for the active driver (+ shared toggle).
  const update: Record<string, unknown> = {
    mailgun_enabled: data.mailgun_enabled,
    updated_at: new Date().toISOString(),
    ...(driver === "smtp" ? smtpFields : apiFields),
  };

  // When switching to SMTP, clear stale API fields that may hold truncated passwords.
  if (driver === "smtp") {
    update.mailgun_domain = null;
    update.mailgun_api_key = null;
  }

  let { error } = await supabase
    .from("app_settings")
    .update(update as never)
    .eq("id", 1);

  let smtpMigrationRequired = false;

  // Back-compat: SMTP columns missing — map essentials into mailgun_* for send path.
  if (error && /mail_(driver|host|port|username|password|encryption|from)/.test(error.message ?? "")) {
    if (driver === "smtp") {
      smtpMigrationRequired = true;
      const legacyUpdate: Record<string, unknown> = {
        mailgun_enabled: data.mailgun_enabled,
        updated_at: new Date().toISOString(),
        mailgun_domain: data.mail_host?.trim() || null,
        mailgun_from_email:
          data.mail_username?.trim() || data.mail_from_email?.trim() || null,
        ...(data.mail_password?.trim()
          ? { mailgun_api_key: data.mail_password.trim() }
          : {}),
      };
      ({ error } = await supabase
        .from("app_settings")
        .update(legacyUpdate as never)
        .eq("id", 1));
    } else {
      const stripped = { ...update };
      for (const key of Object.keys(smtpFields)) delete stripped[key];
      ({ error } = await supabase
        .from("app_settings")
        .update(stripped as never)
        .eq("id", 1));
    }
  }

  // Back-compat: region column missing.
  if (error && /mailgun_region/.test(error.message ?? "")) {
    const stripped = { ...update };
    delete stripped.mailgun_region;
    for (const key of Object.keys(smtpFields)) delete stripped[key];
    ({ error } = await supabase
      .from("app_settings")
      .update(stripped as never)
      .eq("id", 1));
  }

  if (error) throw new Error(error.message);

  return {
    ok: true as const,
    smtpMigrationRequired,
    warning: smtpMigrationRequired
      ? "SMTP columns are not in the database yet — settings were saved using a legacy layout. Apply migration 20260529140000_app_settings_smtp.sql (supabase db push) for full SMTP support including separate sender email."
      : undefined,
  };
}

const supabaseEnvSaveSchema = z.object({
  supabaseUrl: z.string().trim().min(1, "Supabase project URL is required").max(500),
  publishableKey: z.string().trim().min(1, "Publishable key is required").max(5000),
  serviceRoleKey: z.string().max(5000).optional(),
});

export async function adminGetSupabaseEnv() {
  await adminContext();
  const { getSupabaseEnvForm } = await import("@/lib/env-file.server");
  return getSupabaseEnvForm();
}

export async function adminSaveSupabaseEnv(input: z.infer<typeof supabaseEnvSaveSchema>) {
  await adminContext();
  const data = supabaseEnvSaveSchema.parse(input);
  const { saveSupabaseEnvToLocal } = await import("@/lib/env-file.server");
  return saveSupabaseEnvToLocal({
    supabaseUrl: data.supabaseUrl,
    publishableKey: data.publishableKey,
    serviceRoleKey: data.serviceRoleKey,
  });
}

// ===== Users / roles =====
export async function adminListUsers() {
  const { supabase } = await adminContext();
  const admin = getSupabaseAdminClientOrNull();

  type ListedUser = { id: string; email: string; username: string | null; created_at: string };
  let users: ListedUser[] = [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, username, created_at");
  if (profileError) throw new Error(profileError.message);
  const profileById = Object.fromEntries(
    (profiles ?? []).map((p) => [
      p.id,
      {
        email: p.email ?? "",
        username: p.username ?? null,
        created_at: p.created_at,
      },
    ]),
  );

  if (admin) {
    const { data: authList, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (listError) throw new Error(listError.message);
    users = (authList?.users ?? []).map((u) => {
      const profile = profileById[u.id];
      return {
        id: u.id,
        email: u.email ?? profile?.email ?? "",
        username: profile?.username ?? null,
        created_at: u.created_at ?? profile?.created_at ?? new Date().toISOString(),
      };
    });
  }

  if (users.length === 0) {
    users = (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email ?? "",
      username: p.username ?? null,
      created_at: p.created_at,
    }));
  } else {
    for (const u of users) {
      const profile = profileById[u.id];
      if (profile?.username && !u.username) u.username = profile.username;
    }
  }

  const { data: rolesData, error: rolesError } = await supabase.from("user_roles").select("user_id, role");
  if (rolesError) throw new Error(rolesError.message);

    const rolesByUser: Record<string, string[]> = {};
    (rolesData ?? []).forEach((r: { user_id: string; role: string }) => {
      rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role];
    });

    return {
      users: users.map((u) => ({
      ...u,
        roles: rolesByUser[u.id] ?? [],
      })),
    };
}

const staffUsernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username may only use letters, numbers, _ and -")
  .optional()
  .or(z.literal(""));

async function assertUsernameAvailable(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClientOrNull>>,
  username: string,
  excludeUserId?: string,
) {
  let query = admin.from("profiles").select("id").eq("username", username);
  if (excludeUserId) query = query.neq("id", excludeUserId);
  const { data, error } = await query.maybeSingle();
  if (error && /username/.test(error.message ?? "")) {
    throw new Error("Username support is not available yet — apply the latest database migration.");
  }
  if (error) throw new Error(error.message);
  if (data) throw new Error("Username is already taken");
}

const createUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  role: z.enum(["admin", "dashboard", "pos", "scanner"]),
  username: staffUsernameSchema,
});

export async function adminCreateUser(input: {
  email: string;
  password: string;
  role: "admin" | "dashboard" | "pos" | "scanner";
  username?: string;
}) {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(". "));
  }
  const data = parsed.data;
  const { supabase } = await adminContext();
  const admin = requireSupabaseAdmin();

  const normalizedUsername = data.username?.trim()
    ? normalizeStaffUsername(data.username)
    : null;
  if (data.username?.trim() && !normalizedUsername) {
    throw new Error("Username may only use letters, numbers, _ and - (3–32 characters)");
  }
  if (normalizedUsername) {
    await assertUsernameAvailable(admin, normalizedUsername);
  }

  const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message || "Failed to create user");

  const profilePatch: { email: string; username?: string | null } = { email: data.email };
  if (normalizedUsername) profilePatch.username = normalizedUsername;
  const { error: profileError } = await admin
    .from("profiles")
    .update(profilePatch)
    .eq("id", created.user.id);
  if (profileError) throw new Error(profileError.message);

  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: created.user.id, role: data.role });
  if (roleError) throw new Error(roleError.message);

  return { ok: true, user_id: created.user.id };
}

const appRoleSchema = z.enum(["admin", "dashboard", "pos", "scanner"]);
const APP_ROLES = appRoleSchema.options;

function requireSupabaseAdmin() {
  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    throw new Error(
      "Cannot manage auth users without SUPABASE_SERVICE_ROLE_KEY. Add it under Admin → Settings → Supabase, save, then restart the dev server.",
    );
  }
  return admin;
}

export async function adminSetRole(input: {
  user_id: string;
  role: "admin" | "dashboard" | "pos" | "scanner";
  enabled: boolean;
}) {
  const data = z.object({
    user_id: z.string().uuid(),
    role: appRoleSchema,
    enabled: z.boolean(),
  }).parse(input);
  const { supabase } = await adminContext();
    if (data.enabled) {
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    } else {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    }
    return { ok: true };
}

const updateUserSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().trim().email("Enter a valid email").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").max(72).optional(),
  roles: z.array(appRoleSchema).optional(),
  username: staffUsernameSchema,
});

export async function adminUpdateUser(input: {
  user_id: string;
  email?: string;
  password?: string;
  roles?: ("admin" | "dashboard" | "pos" | "scanner")[];
  username?: string;
}) {
  const data = updateUserSchema.parse(input);
  const { supabase } = await adminContext();
  const admin = requireSupabaseAdmin();

  const authUpdates: { email?: string; password?: string } = {};
  if (data.email) authUpdates.email = data.email;
  if (data.password) authUpdates.password = data.password;

  if (Object.keys(authUpdates).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(data.user_id, authUpdates);
    if (error) throw new Error(error.message);
    if (data.email) {
      const { error: profileError } = await admin.from("profiles").update({ email: data.email }).eq("id", data.user_id);
      if (profileError) throw new Error(profileError.message);
    }
  }

  if (data.username !== undefined) {
    const normalizedUsername = data.username.trim()
      ? normalizeStaffUsername(data.username)
      : null;
    if (data.username.trim() && !normalizedUsername) {
      throw new Error("Username may only use letters, numbers, _ and - (3–32 characters)");
    }
    if (normalizedUsername) {
      await assertUsernameAvailable(admin, normalizedUsername, data.user_id);
    }
    const { error: usernameError } = await admin
      .from("profiles")
      .update({ username: normalizedUsername })
      .eq("id", data.user_id);
    if (usernameError) throw new Error(usernameError.message);
  }

  if (data.roles) {
    for (const role of APP_ROLES) {
      const enabled = data.roles.includes(role);
      if (enabled) {
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: data.user_id, role }, { onConflict: "user_id,role" });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", data.user_id)
          .eq("role", role);
        if (error) throw new Error(error.message);
      }
    }
  }

    return { ok: true };
}

export async function adminDeleteUser(input: { user_id: string }) {
  const data = z.object({ user_id: z.string().uuid() }).parse(input);
  await adminContext();
  const admin = requireSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(data.user_id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ===== Reports =====
export async function adminReports(filters?: AdminServerFilters) {
  const parsed = adminListFiltersSchema.parse(filters);
  const { supabase } = await adminContext();

  const regSlotJoin = parsed?.eventId ? "slots!inner" : "slots";
  let regQuery = supabase
    .from("registrations")
    .select(`status, guest_count, created_at, slot_id, ${regSlotJoin}(name, event_id)`);

  if (parsed?.eventId) regQuery = regQuery.eq("slots.event_id", parsed.eventId);
  if (parsed?.slotId) regQuery = regQuery.eq("slot_id", parsed.slotId);
  if (parsed?.status) regQuery = regQuery.eq("status", parsed.status);
  const regRange = localCalendarRangeBoundsIso(parsed?.dateFrom, parsed?.dateTo);
  if (regRange.startIso) regQuery = regQuery.gte("created_at", regRange.startIso);
  if (regRange.endIso) regQuery = regQuery.lt("created_at", regRange.endIso);
  if (parsed?.search) {
    const term = parsed.search.replace(/[%_,]/g, "");
    if (term) {
      regQuery = regQuery.or(`customer_name.ilike.%${term}%,mobile.ilike.%${term}%`);
    }
  }

  const scanSlotJoin = parsed?.eventId ? "slots!inner" : "slots";
  const scanSelect = `id, mode, result, scanned_at, slot_id, registration_id, ${scanSlotJoin}(name, event_id, events(name)), registrations(customer_name, status)`;
  const scanRange = localCalendarRangeBoundsIso(parsed?.dateFrom, parsed?.dateTo);

  let scanQuery = supabase.from("scan_events").select(scanSelect);
  let recentScanQuery = supabase
    .from("scan_events")
    .select(scanSelect)
    .order("scanned_at", { ascending: false })
    .limit(25);

  const applyScanFilters = <T extends typeof scanQuery>(query: T) => {
    let q = query;
    if (parsed?.slotId) q = q.eq("slot_id", parsed.slotId);
    else if (parsed?.eventId) q = q.eq("slots.event_id", parsed.eventId);
    if (scanRange.startIso) q = q.gte("scanned_at", scanRange.startIso);
    if (scanRange.endIso) q = q.lt("scanned_at", scanRange.endIso);
    return q;
  };

  scanQuery = applyScanFilters(scanQuery);
  recentScanQuery = applyScanFilters(recentScanQuery);

  const [regs, scans, recentScansRes] = await Promise.all([regQuery, scanQuery, recentScanQuery]);
  if (regs.error) throw new Error(regs.error.message);
  if (scans.error) throw new Error(scans.error.message);
  if (recentScansRes.error) throw new Error(recentScansRes.error.message);

  type RegRow = {
    status: string;
    guest_count: number;
    created_at: string;
    slot_id: string;
    slots?: { name?: string; event_id?: string } | { name?: string; event_id?: string }[] | null;
  };
  type ScanRow = {
    id?: string;
    mode: string;
    result: string;
    scanned_at: string;
    slot_id: string | null;
    registration_id: string | null;
    slots?:
      | { name?: string; event_id?: string; events?: { name?: string } | { name?: string }[] | null }
      | { name?: string; event_id?: string; events?: { name?: string } | { name?: string }[] | null }[]
      | null;
    registrations?:
      | { customer_name?: string | null; status: string }
      | { customer_name?: string | null; status: string }[]
      | null;
  };

  const regRows = (regs.data ?? []) as RegRow[];
  const totalReg = regRows.length;
  const totalGuests = regRows.reduce((s, r) => s + r.guest_count, 0);
    const byStatus: Record<string, number> = {};
  const registrationsByDayMap = new Map<string, { registrations: number; guests: number }>();
  const guestsBySlotMap = new Map<string, { slotName: string; registrations: number; guests: number }>();

  regRows.forEach((r) => {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + (r.guest_count ?? 1);
    const day = r.created_at.slice(0, 10);
    const dayRow = registrationsByDayMap.get(day) ?? { registrations: 0, guests: 0 };
    dayRow.registrations += 1;
    dayRow.guests += r.guest_count;
    registrationsByDayMap.set(day, dayRow);

    const slotRel = Array.isArray(r.slots) ? r.slots[0] : r.slots;
    const slotName = slotRel?.name ?? "Unknown slot";
    const slotRow = guestsBySlotMap.get(r.slot_id) ?? {
      slotName,
      registrations: 0,
      guests: 0,
    };
    slotRow.registrations += 1;
    slotRow.guests += r.guest_count;
    guestsBySlotMap.set(r.slot_id, slotRow);
  });

  const scanRows = (scans.data ?? []) as unknown as ScanRow[];
  const totalScans = scanRows.length;
  const validScans = scanRows.filter((s) => s.result === "valid").length;
  const invalidScans = countActionableInvalidScans(scanRows);
  const scansByResult: Record<string, number> = {};
  const scansByMode: Record<string, number> = {};
  const scansByDayMap = new Map<
    string,
    { total: number; valid: number; invalid: number; checkins: number }
  >();

  scanRows.forEach((s) => {
    scansByResult[s.result] = (scansByResult[s.result] ?? 0) + 1;
    scansByMode[s.mode] = (scansByMode[s.mode] ?? 0) + 1;
    const day = formatYmd(new Date(s.scanned_at));
    const dayRow = scansByDayMap.get(day) ?? { total: 0, valid: 0, invalid: 0, checkins: 0 };
    dayRow.total += 1;
    if (s.result === "valid") dayRow.valid += 1;
    else if (isActionableInvalidScan(s, registrationStatusFromScanRow(s))) dayRow.invalid += 1;
    if (isValidEntryCheckin(s)) dayRow.checkins += 1;
    scansByDayMap.set(day, dayRow);
  });

  const recentScanActivity = ((recentScansRes.data ?? []) as unknown as ScanRow[]).flatMap((row) => {
    const slotRel = Array.isArray(row.slots) ? row.slots[0] : row.slots;
    if (!slotRel?.name) return [];
    const regRel = Array.isArray(row.registrations) ? row.registrations[0] : row.registrations;
    const eventRel = slotRel.events;
    const eventName = Array.isArray(eventRel) ? eventRel[0]?.name : eventRel?.name;
    const regStatus = regRel?.status;
    const checkedIn =
      isValidEntryCheckin(row) || regStatus === "entered" || regStatus === "exited";
    let timeLabel: string;
    try {
      timeLabel = new Date(row.scanned_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      timeLabel = row.scanned_at;
    }
    return [
      {
        id: row.id ?? `${row.scanned_at}-${row.slot_id}`,
        name: regRel?.customer_name?.trim() || "Guest",
        event: eventName ?? "—",
        slot: slotRel.name,
        status: checkedIn ? ("checked_in" as const) : ("pending" as const),
        time: timeLabel,
      },
    ];
  });

  let slotQuery = supabase.from("slots").select("id, name, capacity, event_id");
  if (parsed?.eventId) slotQuery = slotQuery.eq("event_id", parsed.eventId);
  if (parsed?.slotId) slotQuery = slotQuery.eq("id", parsed.slotId);
  const { data: slotRows, error: slotError } = await slotQuery;
  if (slotError) throw new Error(slotError.message);

  const capacityBySlot = (slotRows ?? []).map((slot: { id: string; name: string; capacity: number }) => {
    const usage = guestsBySlotMap.get(slot.id);
    const booked = usage?.guests ?? 0;
    const capacity = slot.capacity ?? 0;
    const pct = capacity > 0 ? Math.round((booked / capacity) * 100) : 0;
    return {
      slotId: slot.id,
      slotName: slot.name,
      capacity,
      booked,
      utilizationPct: Math.min(100, pct),
    };
  });

  return {
    totalReg,
    totalGuests,
    byStatus,
    totalScans,
    validScans,
    invalidScans,
    registrationsByDay: [...registrationsByDayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v })),
    guestsBySlot: [...guestsBySlotMap.values()].sort((a, b) => b.guests - a.guests),
    scansByResult,
    scansByMode,
    scansByDay: [...scansByDayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v })),
    capacityBySlot: capacityBySlot.sort((a, b) => b.utilizationPct - a.utilizationPct),
    heatmapRegistrations: regRows.map((r) => ({ created_at: r.created_at })),
    recentScanActivity,
    validEntryScans: scanRows.filter((s) => isValidEntryCheckin(s)).length,
  };
}

// ===== BookingQube integration =====
const BOOKINGQUBE_PROVIDER = "bookingqube";

const bookingQubeEndpointSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((p) => p.startsWith("/"), "Path must start with /"),
  role: z.enum(["submit", "form_fetch"]).optional().nullable(),
  mergeWithEventData: z.boolean().optional(),
});

const integrationSettingsSchema = z.object({
  enabled: z.boolean(),
  get_api_url: z.string().trim().url("Enter a valid GET API URL").max(2000),
  post_api_url: z.string().trim().url("Enter a valid POST API URL").max(2000).optional(),
  registration_event_slug: z.string().trim().max(200).optional().nullable(),
  api_key: z.string().max(5000).optional().nullable(),
});

function integrationTableErrorMessage(error: { message?: string; code?: string }): string {
  const msg = error.message ?? "Database error";
  if (isBookingQubeIntegrationTableError(error)) {
    return bookingQubeIntegrationTableErrorMessage();
  }
  return msg;
}

export async function adminGetBookingQubeBootstrapSql() {
  await adminContext();
  const filePath = path.join(process.cwd(), BOOKINGQUBE_BOOTSTRAP_MIGRATION_FILE);
  const sql = await readFile(filePath, "utf8");
  return { sql, migrationFile: BOOKINGQUBE_BOOTSTRAP_MIGRATION_FILE };
}

async function ensureBookingQubeSettingsRow(
  supabase: Awaited<ReturnType<typeof adminContext>>["supabase"],
) {
  const { data: existing, error: readErr } = await supabase
    .from("integration_settings")
    .select("id")
    .eq("provider", BOOKINGQUBE_PROVIDER)
    .maybeSingle();
  if (readErr) throw new Error(integrationTableErrorMessage(readErr));
  if (existing) return;

  const { error: insertErr } = await supabase.from("integration_settings").insert({
    provider: BOOKINGQUBE_PROVIDER,
    enabled: false,
    base_url:
      process.env.BOOKINGQUBE_BASE_URL?.trim() ||
      "https://bookingqube-staging-deb2ecbxcrd5cmbq.eastus-01.azurewebsites.net",
  });
  if (insertErr) throw new Error(integrationTableErrorMessage(insertErr));
}

function sanitizeBookingQubeSettingsForClient<T extends { api_key?: string | null } | null>(
  settings: T,
): T extends null ? null : Omit<NonNullable<T>, "api_key"> {
  if (!settings) return null as never;
  const { api_key: _apiKey, ...rest } = settings;
  return rest as never;
}

/** Single auth round-trip for settings sidebar status (avoids 3× parallel getUser). */
export async function adminGetSettingsSidebarStatus() {
  const { resolveBookingQubeApiKey } = await import("@/lib/bookingqube.sync");
  const { resolveMailConfig } = await import("@/lib/mailgun.server");
  const { supabase } = await adminContext();

  const [appRes, bqSettingsRes, bqMappingsRes, mailgunRes, mailConfig] = await Promise.all([
    supabase.from("app_settings").select("scandit_enabled").eq("id", 1).maybeSingle(),
    supabase
      .from("integration_settings")
      .select("enabled, get_api_url, post_api_url, base_url, api_key, api_key_env_var")
      .eq("provider", BOOKINGQUBE_PROVIDER)
      .maybeSingle(),
    supabase
      .from("integration_event_mappings")
      .select("id")
      .eq("provider", BOOKINGQUBE_PROVIDER),
    supabase
      .from("app_settings")
      .select("mailgun_enabled")
      .eq("id", 1)
      .maybeSingle(),
    resolveMailConfig(),
  ]);

  const bqSettings = bqSettingsRes.error && isBookingQubeIntegrationTableError(bqSettingsRes.error)
    ? null
    : bqSettingsRes.data;
  if (bqSettingsRes.error && !isBookingQubeIntegrationTableError(bqSettingsRes.error)) {
    throw new Error(integrationTableErrorMessage(bqSettingsRes.error));
  }

  const eventMappings =
    bqMappingsRes.error && isBookingQubeIntegrationTableError(bqMappingsRes.error)
      ? []
      : (bqMappingsRes.data ?? []);
  if (bqMappingsRes.error && !isBookingQubeIntegrationTableError(bqMappingsRes.error)) {
    throw new Error(integrationTableErrorMessage(bqMappingsRes.error));
  }

  const hasEventMapping = eventMappings.length > 0;
  const bqOk =
    Boolean(bqSettings?.enabled) &&
    Boolean(bqSettings?.get_api_url?.trim() || bqSettings?.base_url?.trim()) &&
    Boolean(bqSettings?.post_api_url?.trim() || bqSettings?.base_url?.trim()) &&
    hasEventMapping;

  const mailgunRow = mailgunRes.data;
  const mailgunOk = mailConfig !== null;

  return {
    scannerOk: Boolean(appRes.data?.scandit_enabled),
    bqOk,
    mailgunOk,
    mailgunEnabled: Boolean(mailgunRow?.mailgun_enabled),
  };
}

export async function adminGetBookingQubeSettings() {
  const { resolveBookingQubeApiKey } = await import("@/lib/bookingqube.sync");
  const { supabase } = await adminContext();
  const { data: settings, error: settingsErr } = await supabase
    .from("integration_settings")
    .select("*")
    .eq("provider", BOOKINGQUBE_PROVIDER)
    .maybeSingle();

  const envConfigured = !!resolveBookingQubeApiKey(null, null, settings?.api_key_env_var);

  if (settingsErr && isBookingQubeIntegrationTableError(settingsErr)) {
    const hasApiKey = false;
    return {
      settings: null,
      eventMappings: [],
      hasApiKey,
      apiKeyConfigured: envConfigured,
      apiKeyFromEnv: envConfigured,
      tablesReady: false as const,
      tablesError: bookingQubeIntegrationTableErrorMessage(),
    };
  }
  if (settingsErr) throw new Error(integrationTableErrorMessage(settingsErr));

  const hasApiKey = !!settings?.api_key?.trim();

  const { data: eventMappings, error: mappingsErr } = await supabase
    .from("integration_event_mappings")
    .select("id, local_event_id, bookingqube_form_id, bookingqube_event_id, events(name)")
    .eq("provider", BOOKINGQUBE_PROVIDER);

  if (mappingsErr && isBookingQubeIntegrationTableError(mappingsErr)) {
    return {
      settings: sanitizeBookingQubeSettingsForClient(settings ?? null),
      eventMappings: [],
      hasApiKey,
      apiKeyConfigured: !!(hasApiKey || envConfigured),
      apiKeyFromEnv: envConfigured,
      tablesReady: false as const,
      tablesError: bookingQubeIntegrationTableErrorMessage(),
    };
  }
  if (mappingsErr) throw new Error(integrationTableErrorMessage(mappingsErr));

  return {
    settings: sanitizeBookingQubeSettingsForClient(settings ?? null),
    eventMappings: eventMappings ?? [],
    hasApiKey,
    apiKeyConfigured: !!(hasApiKey || envConfigured),
    apiKeyFromEnv: envConfigured,
    tablesReady: true as const,
  };
}

export async function adminSaveBookingQubeSettings(input: z.infer<typeof integrationSettingsSchema>) {
  const data = integrationSettingsSchema.parse(input);
  const { supabase } = await adminContext();
  await ensureBookingQubeSettingsRow(supabase);

  const slug = data.registration_event_slug?.trim() || null;
  const { error } = await supabase
    .from("integration_settings")
    .update({
      enabled: data.enabled,
      get_api_url: data.get_api_url.trim(),
      ...(data.post_api_url !== undefined
        ? { post_api_url: data.post_api_url.trim() || null }
        : {}),
      registration_event_slug: slug,
      ...(slug ? { default_form_id: slug } : {}),
      updated_at: new Date().toISOString(),
      ...(data.api_key !== undefined ? { api_key: data.api_key?.trim() || null } : {}),
    })
    .eq("provider", BOOKINGQUBE_PROVIDER);
  if (error) throw new Error(integrationTableErrorMessage(error));
  return { ok: true };
}

export async function adminUpsertBookingQubeEventMapping(input: {
  local_event_id: string;
  bookingqube_form_id?: string | null;
  bookingqube_event_id?: string | null;
  event_name?: string | null;
}) {
  const data = z
    .object({
      local_event_id: z.string().uuid(),
      bookingqube_form_id: z.string().trim().max(200).optional().nullable(),
      bookingqube_event_id: z.string().trim().max(50).optional().nullable(),
      event_name: z.string().trim().max(200).optional().nullable(),
    })
    .parse(input);
  const { resolveFormIdForEvent } = await import("@/lib/bookingqube.mapping");
  const formId =
    resolveFormIdForEvent({
      explicitFormId: data.bookingqube_form_id,
      eventName: data.event_name,
    }) || data.local_event_id;

  const { supabase } = await adminContext();
  const { data: row, error } = await supabase
    .from("integration_event_mappings")
    .upsert(
      {
        provider: BOOKINGQUBE_PROVIDER,
        local_event_id: data.local_event_id,
        bookingqube_form_id: formId,
        bookingqube_event_id: data.bookingqube_event_id?.trim() || null,
      },
      { onConflict: "provider,local_event_id" },
    )
    .select("id")
    .single();
  if (error) throw new Error(integrationTableErrorMessage(error));
  return { ok: true, event_mapping_id: row.id };
}

export async function adminSaveBookingQubeFieldMappings(input: {
  event_mapping_id: string;
  mappings: {
    bookingqube_field_id?: string | null;
    bookingqube_label: string;
    local_field: string;
  }[];
}) {
  const data = z
    .object({
      event_mapping_id: z.string().uuid(),
      mappings: z.array(
        z.object({
          bookingqube_field_id: z.string().max(200).optional().nullable(),
          bookingqube_label: z.string().min(1).max(200),
          local_field: z.string().min(1).max(80),
        }),
      ),
    })
    .parse(input);
  const { supabase } = await adminContext();

  await supabase
    .from("integration_field_mappings")
    .delete()
    .eq("event_mapping_id", data.event_mapping_id);

  if (data.mappings.length > 0) {
    const { error } = await supabase.from("integration_field_mappings").insert(
      data.mappings.map((m) => ({
        event_mapping_id: data.event_mapping_id,
        provider: BOOKINGQUBE_PROVIDER,
        bookingqube_field_id: m.bookingqube_field_id?.trim() || null,
        bookingqube_label: m.bookingqube_label,
        local_field: m.local_field,
      })),
    );
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

export async function adminGetBookingQubeFieldMappings(input: { event_mapping_id: string }) {
  const data = z.object({ event_mapping_id: z.string().uuid() }).parse(input);
  const { supabase } = await adminContext();
  const { data: rows } = await supabase
    .from("integration_field_mappings")
    .select("*")
    .eq("event_mapping_id", data.event_mapping_id)
    .order("created_at");
  return { mappings: rows ?? [] };
}

export async function adminFetchBookingQubeForm(input: {
  formId?: string;
  local_event_id?: string;
  get_api_url?: string;
  post_api_url?: string;
  api_key?: string | null;
}) {
  const data = z
    .object({
      formId: z.string().trim().max(200).optional(),
      local_event_id: z.string().uuid().optional(),
      get_api_url: z.string().trim().url().max(2000).optional(),
      post_api_url: z.string().trim().url().max(2000).optional(),
      api_key: z.string().max(5000).optional().nullable(),
    })
    .parse(input ?? {});
  const { supabase } = await adminContext();
  const { resolveBookingQubeConfig, resolveEndpointTestContext, resolveBookingQubeApiKey } =
    await import("@/lib/bookingqube.sync");
  const { fetchRegistrationForm, normalizeFormSchema } = await import("@/lib/bookingqube.client");
  const { resolveFormIdForEvent, urlTemplateNeedsFormContext } = await import(
    "@/lib/bookingqube.mapping"
  );
  const { DEFAULT_BOOKINGQUBE_API_VERSION } = await import("@/lib/bookingqube.constants");

  let config = await resolveBookingQubeConfig({ requireEnabled: false });
  const inlineGetUrl = data.get_api_url?.trim();
  if (!config && inlineGetUrl) {
    const apiKey = resolveBookingQubeApiKey(null, data.api_key);
    config = {
      getApiUrl: inlineGetUrl,
      postApiUrl: data.post_api_url?.trim() || null,
      registrationEventSlug: null,
      apiKey,
      baseUrl:
        process.env.BOOKINGQUBE_BASE_URL?.trim() ||
        "https://bookingqube-staging-deb2ecbxcrd5cmbq.eastus-01.azurewebsites.net",
      defaultFormId: null,
      apiVersion: process.env.BOOKINGQUBE_API_VERSION?.trim() || DEFAULT_BOOKINGQUBE_API_VERSION,
      endpoints: [],
    };
  }
  if (!config) {
    throw new Error(
      "BookingQube is not configured — save GET/POST URLs or run the Supabase bootstrap migration",
    );
  }
  if (inlineGetUrl) {
    config = { ...config, getApiUrl: inlineGetUrl };
  }
  if (data.post_api_url?.trim()) {
    config = { ...config, postApiUrl: data.post_api_url.trim() };
  }
  const effectiveApiKey = data.api_key?.trim() || config.apiKey?.trim() || null;
  config = { ...config, apiKey: effectiveApiKey };

  const getUrl = config.getApiUrl?.trim();
  if (!getUrl) {
    throw new Error("BookingQube GET API URL is required — enter the full URL in settings");
  }

  const getNeedsFormId = urlTemplateNeedsFormContext(getUrl);

  let formId = data.formId?.trim() || null;
  if (!formId && data.local_event_id && getNeedsFormId) {
    try {
      const ctx = await resolveEndpointTestContext({ local_event_id: data.local_event_id });
      formId = ctx.formId;
    } catch (err) {
      if (!isBookingQubeIntegrationTableError(err as { message?: string; code?: string })) {
        throw err;
      }
    }
  }
  if (!formId && data.local_event_id && getNeedsFormId) {
    const { data: ev } = await supabase
      .from("events")
      .select("name")
      .eq("id", data.local_event_id)
      .maybeSingle();
    formId = resolveFormIdForEvent({ eventName: ev?.name });
  }

  if (getNeedsFormId) {
    const { data: settingsRow, error: settingsReadErr } = await supabase
      .from("integration_settings")
      .select("default_form_id")
      .eq("provider", BOOKINGQUBE_PROVIDER)
      .maybeSingle();
    if (settingsReadErr && !isBookingQubeIntegrationTableError(settingsReadErr)) {
      throw new Error(integrationTableErrorMessage(settingsReadErr));
    }
    formId = formId || settingsRow?.default_form_id?.trim() || null;
    if (!formId) {
      throw new Error(
        "GET URL contains {slug} or {formId} — select an event and set BookingQube form id, or use a full GET URL without placeholders",
      );
    }
  } else {
    formId = formId || "_";
  }

  const schema = await fetchRegistrationForm(config, formId);

  let cacheWarning: string | null = schema.fieldsWarning ?? null;
  try {
    await ensureBookingQubeSettingsRow(supabase);
    const { error: cacheErr } = await supabase
      .from("integration_settings")
      .update({
        cached_form_schema: {
          eventId: schema.eventId,
          slug: schema.slug,
          title: schema.title,
          fields: schema.fields,
          fetchedAt: new Date().toISOString(),
        } as never,
        updated_at: new Date().toISOString(),
      })
      .eq("provider", BOOKINGQUBE_PROVIDER);
    if (cacheErr) {
      cacheWarning = integrationTableErrorMessage(cacheErr);
    } else if (schema.eventId && getNeedsFormId && formId !== "_") {
      const { error: mapErr } = await supabase
        .from("integration_event_mappings")
        .update({ bookingqube_event_id: schema.eventId })
        .eq("provider", BOOKINGQUBE_PROVIDER)
        .eq("bookingqube_form_id", formId)
        .is("bookingqube_event_id", null);
      if (mapErr && !isBookingQubeIntegrationTableError(mapErr)) {
        cacheWarning = mapErr.message ?? "Could not update event mapping";
      }
    }
  } catch (err) {
    cacheWarning =
      err instanceof Error
        ? err.message
        : bookingQubeIntegrationTableErrorMessage();
  }

  return {
    schema,
    eventId: schema.eventId ?? null,
    slug: schema.slug ?? null,
    fields: schema.fields,
    normalized: normalizeFormSchema(schema.raw),
    cacheWarning,
    fieldsWarning: schema.fieldsWarning ?? null,
    fetchedUrl: getUrl,
  };
}

/** Step 1 — GET only: ping saved GET URL or load form for a linked event. */
export async function adminTestBookingQubeGet(input?: {
  local_event_id?: string;
  get_api_url?: string;
  post_api_url?: string;
  api_key?: string | null;
}) {
  const data = z
    .object({
      local_event_id: z.string().uuid().optional(),
      get_api_url: z.string().trim().url().max(2000).optional(),
      post_api_url: z.string().trim().url().max(2000).optional(),
      api_key: z.string().max(5000).optional().nullable(),
    })
    .parse(input ?? {});
  await adminContext();
  const { resolveBookingQubeConfig, resolveEndpointTestContext, resolveBookingQubeApiKey } =
    await import("@/lib/bookingqube.sync");
  const { testConnection, fetchRegistrationForm } = await import("@/lib/bookingqube.client");
  const { urlTemplateNeedsFormContext } = await import("@/lib/bookingqube.mapping");

  let config = await resolveBookingQubeConfig({ requireEnabled: false });
  if (!config && data.get_api_url?.trim()) {
    const apiKey = resolveBookingQubeApiKey(null, data.api_key);
    const { DEFAULT_BOOKINGQUBE_API_VERSION } = await import("@/lib/bookingqube.constants");
    config = {
      getApiUrl: data.get_api_url.trim(),
      postApiUrl: data.post_api_url?.trim() || null,
      registrationEventSlug: null,
      apiKey,
      baseUrl:
        process.env.BOOKINGQUBE_BASE_URL?.trim() ||
        "https://bookingqube-staging-deb2ecbxcrd5cmbq.eastus-01.azurewebsites.net",
      defaultFormId: null,
      apiVersion: process.env.BOOKINGQUBE_API_VERSION?.trim() || DEFAULT_BOOKINGQUBE_API_VERSION,
      endpoints: [],
    };
  }
  if (!config) throw new Error("BookingQube settings not found — run database migration");

  if (data.get_api_url?.trim()) {
    config = { ...config, getApiUrl: data.get_api_url.trim() };
  }
  if (data.post_api_url?.trim()) {
    config = { ...config, postApiUrl: data.post_api_url.trim() };
  }
  const effectiveApiKey = data.api_key?.trim() || config.apiKey?.trim() || null;
  config = { ...config, apiKey: effectiveApiKey };

  if (!data.local_event_id) {
    return testConnection(config);
  }

  const getUrl = config.getApiUrl?.trim();
  if (!getUrl) {
    throw new Error("BookingQube GET API URL is required");
  }

  let formId = "_";
  if (urlTemplateNeedsFormContext(getUrl)) {
    const ctx = await resolveEndpointTestContext({ local_event_id: data.local_event_id });
    formId = ctx.formId;
  }

  const schema = await fetchRegistrationForm(config, formId);
  if (schema.fieldsWarning) {
    return { ok: true as const, message: `GET OK — ${schema.fieldsWarning}` };
  }
  const count = schema.fields.length;
  const idPart = schema.eventId ? `, event id ${schema.eventId}` : "";
  return {
    ok: true as const,
    message: `Loaded ${count} field${count === 1 ? "" : "s"}${idPart}`,
  };
}

/** Step 3 — POST merged registration payload using saved event + field mappings. */
export async function adminTestBookingQubePost(input: {
  local_event_id: string;
  post_api_url?: string;
  get_api_url?: string;
  api_key?: string | null;
}) {
  const data = z
    .object({
      local_event_id: z.string().uuid(),
      post_api_url: z.string().trim().url().max(2000).optional(),
      get_api_url: z.string().trim().url().max(2000).optional(),
      api_key: z.string().max(5000).optional().nullable(),
    })
    .parse(input);
  await adminContext();
  const { resolveBookingQubeConfig, resolveEndpointTestContext } =
    await import("@/lib/bookingqube.sync");
  const { submitRegistration } = await import("@/lib/bookingqube.client");
  const {
    buildSubmitPayload,
    validateMappedRegistrationValues,
    validateSubmitPayload,
  } = await import("@/lib/bookingqube.mapping");

  let config = await resolveBookingQubeConfig({ requireEnabled: false });
  if (!config) throw new Error("BookingQube settings not found — run database migration");

  if (data.get_api_url?.trim()) {
    config = { ...config, getApiUrl: data.get_api_url.trim() };
  }
  const postUrl = data.post_api_url?.trim() || config.postApiUrl?.trim();
  if (!postUrl) {
    throw new Error("BookingQube POST API URL is required");
  }
  config = { ...config, postApiUrl: postUrl };
  const effectiveApiKey = data.api_key?.trim() || config.apiKey?.trim() || null;
  config = { ...config, apiKey: effectiveApiKey };

  const ctx = await resolveEndpointTestContext({
    local_event_id: data.local_event_id,
    mergeWithEventData: true,
  });

  const mappedRows = ctx.mappings.filter(
    (m) => m.bookingqube_field_id?.trim() && m.local_field?.trim(),
  );
  if (mappedRows.length === 0) {
    throw new Error(
      "Save event field mappings first (Step 2) — link local fields to BookingQube field ids",
    );
  }

  const mappedValidation = validateMappedRegistrationValues({
    mappings: ctx.mappings,
    getLocalValue: ctx.getLocalValue,
    schemaFields: ctx.schemaFields,
    registrationId: ctx.registrationId ?? undefined,
  });
  if (!mappedValidation.ok) {
    throw new Error(mappedValidation.message);
  }

  const payload = buildSubmitPayload({
    formId: ctx.formId,
    bookingqubeEventId: ctx.bookingqubeEventId,
    schemaEventId: ctx.schemaEventId,
    schemaSlug: ctx.schemaSlug,
    mappings: ctx.mappings,
    schemaFields: ctx.schemaFields,
    getLocalValue: ctx.getLocalValue,
  });

  const validation = validateSubmitPayload(payload, {
    registrationId: ctx.registrationId ?? undefined,
  });
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const result = await submitRegistration(config, payload);
  const sourceNote = ctx.useSampleData ? "sample local data" : "latest registration";

  return {
    ok: true as const,
    message: `POST OK — sent ${validation.cellCount} mapped field(s) (${sourceNote})`,
    preview: { built: payload, request: result.request },
  };
}

/** @deprecated Prefer adminTestBookingQubeGet / adminTestBookingQubePost */
export async function adminTestBookingQubeConnection(input?: { local_event_id?: string }) {
  return adminTestBookingQubeGet(input);
}

export async function adminTestBookingQubeEndpoint(input: {
  endpoint_id: string;
  base_url?: string;
  api_version?: string;
  api_key?: string | null;
  default_form_id?: string | null;
  event_mapping_id?: string;
  local_event_id?: string;
  dry_run?: boolean;
}) {
  const data = z
    .object({
      endpoint_id: z.string().uuid(),
      base_url: z.string().trim().min(1).max(500).optional(),
      api_version: z.string().trim().min(1).max(20).optional(),
      api_key: z.string().max(5000).optional().nullable(),
      default_form_id: z.string().max(200).optional().nullable(),
      event_mapping_id: z.string().uuid().optional(),
      local_event_id: z.string().uuid().optional(),
      dry_run: z.boolean().optional(),
    })
    .parse(input);
  await adminContext();
  const { resolveBookingQubeConfig, resolveEndpointTestContext, logBookingQubeEndpointTest } =
    await import("@/lib/bookingqube.sync");
  const {
    buildSubmitPayload,
    buildSampleSubmitPayload,
    inferEndpointRole,
    pathNeedsFormContext,
    sanitizeSubmitRequestBody,
    validateSubmitPayload,
  } = await import("@/lib/bookingqube.mapping");
  const { callBookingQubeEndpoint } = await import("@/lib/bookingqube.client");

  const config = await resolveBookingQubeConfig({ requireEnabled: false });
  if (!config) throw new Error("BookingQube settings not found — run database migration");

  const merged = {
    ...config,
    ...(data.base_url ? { baseUrl: data.base_url } : {}),
    ...(data.api_version ? { apiVersion: data.api_version } : {}),
    ...(data.default_form_id !== undefined ? { defaultFormId: data.default_form_id } : {}),
    ...(data.api_key !== undefined ? { apiKey: data.api_key?.trim() || null } : {}),
  };

  const endpoint = merged.endpoints.find((e) => e.id === data.endpoint_id);
  if (!endpoint) throw new Error("Endpoint not found — save settings first");

  const mergeWithEventData = !!endpoint.mergeWithEventData;
  const effectiveRole = endpoint.role ?? inferEndpointRole(endpoint.method, endpoint.path);
  const isSubmit =
    effectiveRole === "submit" ||
    (endpoint.method === "POST" && endpoint.path.toLowerCase().includes("submit"));

  const needsForm = pathNeedsFormContext(endpoint.path) || isSubmit || mergeWithEventData;

  let pathVars: Record<string, string> = {};
  let body: unknown;
  let previewPayload: unknown;
  let registrationId: string | null = null;

  if (needsForm || mergeWithEventData) {
    const ctx = await resolveEndpointTestContext({
      event_mapping_id: data.event_mapping_id,
      local_event_id: data.local_event_id,
      formId: merged.defaultFormId?.trim() || undefined,
      mergeWithEventData,
    });
    pathVars = ctx.pathVars;
    registrationId = ctx.registrationId ?? null;

    if (isSubmit) {
      const buildPayload = mergeWithEventData
        ? () =>
            buildSubmitPayload({
              formId: ctx.formId,
              bookingqubeEventId: ctx.bookingqubeEventId,
              schemaEventId: ctx.schemaEventId,
              schemaSlug: ctx.schemaSlug,
              mappings: ctx.mappings,
              schemaFields: ctx.schemaFields,
              getLocalValue: ctx.getLocalValue,
            })
        : () =>
            buildSampleSubmitPayload({
              formId: ctx.formId,
              bookingqubeEventId: ctx.bookingqubeEventId,
              schemaEventId: ctx.schemaEventId,
              schemaSlug: ctx.schemaSlug,
              mappings: ctx.mappings,
              schemaFields: ctx.schemaFields,
            });

      const built = buildPayload();
      const validation = validateSubmitPayload(built);
      if (!validation.ok) {
        throw new Error(validation.message);
      }
      const request = sanitizeSubmitRequestBody(built);
      previewPayload = { built, request };
      body = request;

      const sourceNote = mergeWithEventData
        ? ctx.useSampleData
          ? "sample local data"
          : "latest registration"
        : "sample";

      if (data.dry_run && !mergeWithEventData) {
        return {
          ok: true as const,
          message: `Dry run — submit payload (${sourceNote}, not sent)`,
          status: 0,
          preview: previewPayload,
        };
      }
    }
  } else if (endpoint.path.includes("{formId}") && merged.defaultFormId?.trim()) {
    pathVars.formId = merged.defaultFormId.trim();
  }

  const result = await callBookingQubeEndpoint(merged, endpoint, {
    pathVars: Object.keys(pathVars).length ? pathVars : undefined,
    body,
  });

  if (!result.ok) {
    if (mergeWithEventData) {
      await logBookingQubeEndpointTest({
        registrationId,
        status: "error",
        payload: { request: body, response: result.body, endpoint: endpoint.name },
        error: result.message,
      });
    }
    const detail = previewPayload ? ` Payload: ${JSON.stringify(previewPayload)}` : "";
    throw new Error(`${result.message}${detail}`);
  }

  if (mergeWithEventData) {
    await logBookingQubeEndpointTest({
      registrationId,
      status: "success",
      payload: {
        request: body ?? null,
        response: result.body,
        endpoint: endpoint.name,
        pathVars: Object.keys(pathVars).length ? pathVars : undefined,
      },
    });
  }

  const previewNote = previewPayload ? ` Payload: ${JSON.stringify(previewPayload)}` : "";
  const mergeNote = mergeWithEventData ? " (merged with event data, logged)" : "";

  return {
    ok: true as const,
    message: `${result.message}${mergeNote}.${previewNote}`,
    status: result.status,
    preview: previewPayload,
  };
}

const UNSYNCED_PAGE_SIZE = 1000;

async function fetchSyncedRegistrationIds(): Promise<Set<string>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const synced = new Set<string>();
  let offset = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("integration_sync_log")
      .select("registration_id")
      .eq("provider", BOOKINGQUBE_PROVIDER)
      .eq("direction", "out")
      .eq("status", "success")
      .not("registration_id", "is", null)
      .range(offset, offset + UNSYNCED_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (row.registration_id) synced.add(row.registration_id);
    }
    if ((data?.length ?? 0) < UNSYNCED_PAGE_SIZE) break;
    offset += UNSYNCED_PAGE_SIZE;
  }
  return synced;
}

async function listUnsyncedRegistrationIds(): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const syncedIds = await fetchSyncedRegistrationIds();
  const unsynced: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .select("id")
      .order("created_at", { ascending: true })
      .range(offset, offset + UNSYNCED_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (!syncedIds.has(row.id)) unsynced.push(row.id);
    }
    if ((data?.length ?? 0) < UNSYNCED_PAGE_SIZE) break;
    offset += UNSYNCED_PAGE_SIZE;
  }
  return unsynced;
}

async function getLatestOutboundSyncStatus(registrationId: string): Promise<{
  success: boolean;
  skipped?: boolean;
  error?: string;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("integration_sync_log")
    .select("status, error")
    .eq("provider", BOOKINGQUBE_PROVIDER)
    .eq("registration_id", registrationId)
    .eq("direction", "out")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { success: false, error: "No sync log written" };
  return {
    success: data.status === "success",
    skipped: data.status === "skipped",
    error: data.error ?? undefined,
  };
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) break;
      results[index] = await fn(items[index]!);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

/** Registrations with no successful outbound BookingQube sync log entry. */
export async function adminCountUnsyncedRegistrations() {
  await adminContext();
  try {
    const ids = await listUnsyncedRegistrationIds();
    return { count: ids.length, tablesReady: true as const };
  } catch (err) {
    if (isBookingQubeIntegrationTableError(err as { message?: string; code?: string })) {
      return { count: 0, tablesReady: false as const };
    }
    throw err;
  }
}

/** Push every unsynced registration to BookingQube POST (concurrency 5). */
export async function adminSyncUnsyncedRegistrations() {
  await adminContext();
  const { resolveBookingQubeConfig, runBookingQubeOutboundSync } = await import(
    "@/lib/bookingqube.sync"
  );

  const config = await resolveBookingQubeConfig();
  if (!config) {
    throw new Error(
      "BookingQube sync is disabled or not configured — enable it in Settings and set the POST URL",
    );
  }

  const hasPost =
    Boolean(config.postApiUrl?.trim()) ||
    config.endpoints.some((e) => e.role === "submit");
  if (!hasPost) {
    throw new Error("BookingQube POST API URL is not configured");
  }

  let ids: string[];
  try {
    ids = await listUnsyncedRegistrationIds();
  } catch (err) {
    if (isBookingQubeIntegrationTableError(err as { message?: string; code?: string })) {
      throw new Error(bookingQubeIntegrationTableErrorMessage());
    }
    throw err;
  }

  if (ids.length === 0) {
    return {
      synced: 0,
      skipped: 0,
      failed: 0,
      total: 0,
      errors: [] as { registrationId: string; error: string }[],
    };
  }

  const outcomes = await mapWithConcurrency(ids, 5, async (registrationId) => {
    await runBookingQubeOutboundSync(registrationId);
    const result = await getLatestOutboundSyncStatus(registrationId);
    return {
      registrationId,
      success: result.success,
      skipped: result.skipped,
      error: result.error,
    };
  });

  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const errors: { registrationId: string; error: string }[] = [];
  for (const o of outcomes) {
    if (o.success) synced++;
    else if (o.skipped) skipped++;
    else {
      failed++;
      errors.push({ registrationId: o.registrationId, error: o.error ?? "Sync failed" });
    }
  }

  return { synced, skipped, failed, total: ids.length, errors: errors.slice(0, 50) };
}

export async function adminListBookingQubeSyncLogs(input?: { limit?: number }) {
  const data = z.object({ limit: z.number().int().min(1).max(200).optional() }).parse(input ?? {});
  const { supabase } = await adminContext();
  const { data: logs } = await supabase
    .from("integration_sync_log")
    .select("id, direction, status, error, payload, created_at, registration_id")
    .eq("provider", BOOKINGQUBE_PROVIDER)
    .order("created_at", { ascending: false })
    .limit(data.limit ?? 50);
  return { logs: logs ?? [] };
}
