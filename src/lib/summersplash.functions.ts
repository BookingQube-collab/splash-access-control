"use server";

import { z } from "zod";
import { getAuthContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { DashboardDaySlotUsage, DashboardRegistrationCard, DashboardSchedulePayload, DashboardSlotRow } from "@/lib/dashboard.types";
import { addDays, endOfMonth, startOfMonth, startOfWeek } from "date-fns";
import { isPassActive, passBookingDate, passEnd, type PassTimingInput } from "@/lib/pass-active";
import { isSlotPastForDate } from "@/lib/slot-time";
import { clampBookingDate, eventDateRange, formatYmd, maxYmd, normalizePhoneForLookup, parseYmd, todayYmd } from "@/lib/utils";

const publicEventSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const publicSlotsForDateSchema = z.object({
  eventId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type PublicEventRow = {
  id: string;
  name: string;
  event_date: string;
  start_date?: string | null;
  end_date?: string | null;
};

/** Resolve active event (live → upcoming → most recent ended) with parallel lookups. */
async function resolveActiveEvent(today: string): Promise<PublicEventRow | null> {
  const [liveRes, upcomingRes, fallbackRes] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("events")
      .select("*")
      .eq("is_active", true)
      .gte("end_date", today)
      .order("start_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("events")
      .select("*")
      .eq("is_active", true)
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return liveRes.data ?? upcomingRes.data ?? fallbackRes.data ?? null;
}

async function guestCountsBySlotForDay(slotIds: string[], dateStr: string) {
  const usedBySlot = new Map<string, number>();
  if (slotIds.length === 0) return usedBySlot;

  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select("slot_id, guest_count")
    .in("slot_id", slotIds)
    .in("status", ["active", "entered"])
    .gte("created_at", dayStart.toISOString())
    .lt("created_at", dayEnd.toISOString());

  for (const r of regs ?? []) {
    const sid = r.slot_id as string;
    usedBySlot.set(sid, (usedBySlot.get(sid) ?? 0) + (r.guest_count ?? 1));
  }
  return usedBySlot;
}

async function buildPublicEventPayload<T extends { id: string; capacity: number }>(
  event: PublicEventRow,
  slotList: T[],
  bookingDate?: string,
) {
  const { start, end } = eventDateRange(event);
  const eventOut = { ...event, start_date: start, end_date: end };

  const today = todayYmd();
  const bookableStart = maxYmd(start, today);
  let dateStr = bookingDate ?? clampBookingDate(today, start, end);
  if (dateStr < bookableStart) dateStr = bookableStart;
  if (dateStr > end) dateStr = end;

  const slotIds = slotList.map((s) => s.id);
  const usedBySlot = await guestCountsBySlotForDay(slotIds, dateStr);

  let daySales = 0;
  const result = slotList.map((s) => {
    const used = usedBySlot.get(s.id) ?? 0;
    daySales += used;
    return { ...s, registered: used, remaining: Math.max(0, s.capacity - used) };
  });
  return { event: eventOut, slots: result, bookingDate: dateStr, daySales };
}

/** Guest-facing bookable slots (filters hidden_from_booking in app code for DBs without that column). */
function bookableSlots<T extends { hidden_from_booking?: boolean | null }>(slots: T[]): T[] {
  return slots.filter((s) => !(s.hidden_from_booking ?? false));
}

async function loadSlotsForEvent(event: PublicEventRow, bookingDate?: string) {
  const { data: slots, error } = await supabaseAdmin
    .from("slots")
    .select("*")
    .eq("event_id", event.id)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return buildPublicEventPayload(event, bookableSlots(slots ?? []), bookingDate);
}

async function loadSlotsForEventId(eventId: string, bookingDate: string) {
  const [{ data: event }, { data: slots, error: slotsError }] = await Promise.all([
    supabaseAdmin.from("events").select("*").eq("id", eventId).maybeSingle(),
    supabaseAdmin
      .from("slots")
      .select("*")
      .eq("event_id", eventId)
      .order("starts_at", { ascending: true }),
  ]);
  if (slotsError) throw slotsError;
  if (!event) return { event: null, slots: [], bookingDate, daySales: 0 };
  return buildPublicEventPayload(event as PublicEventRow, bookableSlots(slots ?? []), bookingDate);
}

// ============ PUBLIC: list current event + slots with remaining capacity ============
export async function getPublicEvent(input?: { date?: string }) {
  const data = publicEventSchema.parse(input ?? {});
  const today = todayYmd();
  const event = await resolveActiveEvent(today);
  if (!event) return { event: null, slots: [], bookingDate: data.date ?? today, daySales: 0 };
  return loadSlotsForEvent(event, data.date);
}

/** Slots + capacity for one date when event id is already known (skips event discovery). */
export async function getPublicSlotsForDate(input: z.infer<typeof publicSlotsForDateSchema>) {
  const { eventId, date } = publicSlotsForDateSchema.parse(input);
  return loadSlotsForEventId(eventId, date);
}

export type ScannerTodaySlotRow = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  registered: number;
};

/** Scanner right panel: all slots for the active event/day (includes hidden-from-booking slots). */
export async function getScannerTodaySlots(input?: { date?: string }) {
  const data = publicEventSchema.parse(input ?? {});
  const today = todayYmd();
  const event = await resolveActiveEvent(today);
  if (!event) {
    return { bookingDate: data.date ?? today, slots: [] as ScannerTodaySlotRow[] };
  }

  const { data: slots, error } = await supabaseAdmin
    .from("slots")
    .select("id, name, starts_at, ends_at, capacity")
    .eq("event_id", event.id)
    .order("starts_at", { ascending: true });
  if (error) throw error;

  const payload = await buildPublicEventPayload(event, slots ?? [], data.date);
  return {
    bookingDate: payload.bookingDate,
    slots: payload.slots.map((s) => ({
      id: s.id,
      name: s.name,
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      registered: s.registered ?? 0,
    })),
  };
}

// Sum of guest_count for a slot in active/entered status — for a specific day (per-day capacity)
async function sumGuests(client: any, slotId: string, dateStr?: string) {
  const dayStart = dateStr ? new Date(`${dateStr}T00:00:00`) : (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const { data } = await client
    .from("registrations")
    .select("guest_count")
    .eq("slot_id", slotId)
    .in("status", ["active", "entered"])
    .gte("created_at", dayStart.toISOString())
    .lt("created_at", dayEnd.toISOString());
  return (data ?? []).reduce((sum: number, r: any) => sum + (r.guest_count ?? 1), 0);
}

// ============ PUBLIC: register a customer ============
const registerSchema = z.object({
  slot_id: z.string().uuid(),
  customer_name: z.string().trim().min(1).max(120),
  mobile: z.string().trim().min(7).max(32),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  guest_count: z.number().int().min(1).max(20),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function publicRegister(input: z.infer<typeof registerSchema>) {
  const data = registerSchema.parse(input);
  const since = new Date(Date.now() - 30_000).toISOString();
  const bookingDate = data.booking_date;

  const [{ data: slot }, { data: dupe }] = await Promise.all([
    supabaseAdmin.from("slots").select("*").eq("id", data.slot_id).maybeSingle(),
    supabaseAdmin
      .from("registrations")
      .select("id, qr_token")
      .eq("slot_id", data.slot_id)
      .eq("mobile", data.mobile)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!slot) throw new Error("Slot not found");
  if (slot.hidden_from_booking) throw new Error("This slot is not available for booking");

  const effectiveBookingDate = bookingDate ?? todayYmd();
  if (isSlotPastForDate(slot, effectiveBookingDate)) {
    throw new Error("This slot has ended and is no longer available for booking");
  }

  const { scheduleBookingQubeOutboundSync } = await import("@/lib/bookingqube.sync");

  if (dupe) {
    scheduleBookingQubeOutboundSync(dupe.id);
    if (data.email?.trim()) {
      const { scheduleDigitalPassEmail } = await import("@/lib/mailgun.server");
      scheduleDigitalPassEmail(dupe.id, { email: data.email.trim() });
    }
    return { id: dupe.id, qr_token: dupe.qr_token };
  }

  const used = await sumGuests(supabaseAdmin, data.slot_id, bookingDate);
  if (used + data.guest_count > slot.capacity) {
    throw new Error("Slot is full");
  }

  const createdAt = bookingDate
    ? new Date(`${bookingDate}T12:00:00`).toISOString()
    : new Date().toISOString();

  const { data: reg, error } = await supabaseAdmin
      .from("registrations")
      .insert({
        slot_id: data.slot_id,
        customer_name: data.customer_name,
        mobile: data.mobile,
        email: data.email || null,
        guest_count: data.guest_count,
        created_at: createdAt,
      })
      .select("id, qr_token")
      .single();
    if (error) throw new Error(error.message);
    scheduleBookingQubeOutboundSync(reg.id);
    if (data.email?.trim()) {
      const { scheduleDigitalPassEmail } = await import("@/lib/mailgun.server");
      scheduleDigitalPassEmail(reg.id, { email: data.email.trim() });
    }
    return { id: reg.id, qr_token: reg.qr_token };
}

// ============ PUBLIC: get pass by token ============
export async function getPass(input: { token: string }) {
  const data = z.object({ token: z.string().uuid() }).parse(input);
    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("*, slots(*, events(*))")
      .eq("qr_token", data.token)
      .maybeSingle();
    if (!reg) return null;
    const slot = reg.slots as { name: string; starts_at: string; ends_at: string; events: { name: string; event_date: string } };
    const { liveStatus, isActive } = resolvePassLiveStatus(reg, slot);
    const booking_date = bookingDateFromCreatedAt(reg.created_at);
    return {
      id: reg.id,
      customer_name: reg.customer_name,
      mobile: reg.mobile,
      guest_count: reg.guest_count,
      qr_token: reg.qr_token,
      status: reg.status,
      liveStatus,
      isActive,
      booking_date,
      created_at: reg.created_at,
      slot_name: slot.name,
      slot_starts_at: slot.starts_at,
      slot_ends_at: slot.ends_at,
      event_name: slot.events.name,
      event_date: booking_date,
    };
}

// ============ STAFF: dashboard counts ============
export async function getDashboardCounts(input?: { eventId?: string }) {
  const data = z.object({ eventId: z.string().uuid().optional() }).parse(input ?? {});
  const { supabase } = await getAuthContext();
    const today = new Date().toISOString().slice(0, 10);
    // All active events (for filter dropdown)
    const { data: allEvents } = await supabase
      .from("events").select("*").eq("is_active", true).order("start_date", { ascending: false });
    const allEventList = allEvents ?? [];

    let evs: any[] = [];
    if (data.eventId) {
      evs = allEventList.filter((e) => e.id === data.eventId);
    } else {
      // Default: events covering today, fallback to most recent
      evs = allEventList.filter((e) => e.start_date <= today && e.end_date >= today);
      if (evs.length === 0 && allEventList.length > 0) evs = [allEventList[0]];
    }

    const eventDaysById: Record<string, number> = {};
    for (const e of allEventList) {
      const start = new Date(e.start_date);
      const end = new Date(e.end_date);
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      eventDaysById[e.id] = days;
    }

    const eventsOut = allEventList.map((e) => ({
      id: e.id, name: e.name, start_date: e.start_date, end_date: e.end_date, days: eventDaysById[e.id],
    }));

    if (evs.length === 0) return { events: eventsOut, slots: [], selectedEventId: data.eventId ?? null };
    const eventIds = evs.map((e) => e.id);
    const { data: slots } = await supabase.from("slots").select("*").in("event_id", eventIds).order("starts_at");
    const result = await Promise.all(
      (slots ?? []).map(async (s) => {
        const [activeRows, enteredRows, exitedRows, autoExitedRows, invalid] = await Promise.all([
          supabase.from("registrations").select("guest_count").eq("slot_id", s.id).eq("status", "active"),
          supabase.from("registrations").select("guest_count").eq("slot_id", s.id).eq("status", "entered"),
          supabase.from("registrations").select("guest_count").eq("slot_id", s.id).eq("status", "exited"),
          supabase.from("registrations").select("guest_count").eq("slot_id", s.id).eq("status", "auto_exited"),
          supabase.from("scan_events").select("*", { count: "exact", head: true }).eq("slot_id", s.id).eq("result", "invalid"),
        ]);
        const sumG = (rows: any) => (rows.data ?? []).reduce((a: number, r: any) => a + (r.guest_count ?? 1), 0);
        const active = sumG(activeRows);
        const entered = sumG(enteredRows);
        const exited = sumG(exitedRows);
        const auto_exited = sumG(autoExitedRows);
        const used = active + entered;
        // Sum of guest_count across non-expired/invalid registrations (not registration row count).
        const booked = active + entered + exited + auto_exited;
        const eventDays = eventDaysById[s.event_id] ?? 1;
        return {
          id: s.id,
          name: s.name,
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          capacity: s.capacity,
          event_id: s.event_id,
          event_days: eventDays,
          total_capacity: s.capacity * eventDays,
          active,
          entered,
          exited,
          auto_exited,
          booked,
          invalid: invalid.count ?? 0,
          remaining: Math.max(0, s.capacity - used),
        };
      })
    );
    return { events: eventsOut, slots: result, selectedEventId: data.eventId ?? evs[0]?.id ?? null };
}

function bookingDateFromCreatedAt(iso: string): string {
  return passBookingDate({ created_at: iso });
}

function resolvePassLiveStatus(
  reg: { status: string; created_at: string },
  slot: { starts_at?: string; ends_at?: string },
  now: Date = new Date(),
): { liveStatus: string; isActive: boolean } {
  const timing: PassTimingInput = {
    booking_date: bookingDateFromCreatedAt(reg.created_at),
    created_at: reg.created_at,
    slot_starts_at: slot.starts_at ?? null,
    slot_ends_at: slot.ends_at ?? null,
    status: reg.status,
  };

  if (reg.status === "exited" || reg.status === "auto_exited") {
    return { liveStatus: "Exited", isActive: false };
  }
  if (reg.status === "expired") {
    return { liveStatus: "Expired", isActive: false };
  }
  if (reg.status === "entered") {
    return { liveStatus: "Inside", isActive: isPassActive(timing, now) };
  }
  if (!isPassActive(timing, now)) {
    return { liveStatus: "Expired", isActive: false };
  }
  return { liveStatus: "Active", isActive: true };
}

async function resolveDashboardEvents(supabase: Awaited<ReturnType<typeof getAuthContext>>["supabase"], eventId?: string) {
  const today = todayYmd();
  const { data: allEvents } = await supabase
    .from("events")
    .select("*")
    .eq("is_active", true)
    .order("start_date", { ascending: false });
  const allEventList = allEvents ?? [];

  const eventDaysById: Record<string, number> = {};
  for (const e of allEventList) {
    const start = parseYmd(e.start_date);
    const end = parseYmd(e.end_date);
    eventDaysById[e.id] = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  }

  const eventsOut = allEventList.map((e) => ({
    id: e.id,
    name: e.name,
    start_date: e.start_date,
    end_date: e.end_date,
    days: eventDaysById[e.id],
  }));

  let evs: (typeof allEventList)[number][] = [];
  if (eventId) {
    evs = allEventList.filter((e) => e.id === eventId);
  } else {
    evs = allEventList.filter((e) => e.start_date <= today && e.end_date >= today);
    if (evs.length === 0 && allEventList.length > 0) evs = [allEventList[0]];
  }

  return { eventsOut, evs, selectedEventId: eventId ?? evs[0]?.id ?? null };
}

// ============ STAFF: week schedule for live dashboard ============
export async function getDashboardSchedule(input?: {
  eventId?: string;
  weekStart?: string;
  /** When set, returns all event days in that calendar month (clamped to event bounds). */
  monthStart?: string;
}): Promise<DashboardSchedulePayload> {
  const data = z
    .object({
      eventId: z.string().uuid().optional(),
      weekStart: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      monthStart: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    })
    .parse(input ?? {});

  const { supabase } = await getAuthContext();
  const { eventsOut, evs, selectedEventId } = await resolveDashboardEvents(supabase, data.eventId);

  if (evs.length === 0) {
    const weekStart = data.weekStart ?? formatYmd(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const weekEnd = formatYmd(addDays(parseYmd(weekStart), 6));
    return {
      events: eventsOut,
      selectedEventId,
      event: null,
      weekStart,
      weekEnd,
      weekDays: [],
      slots: [],
      registrations: [],
      daySlotUsage: [],
    };
  }

  const event = evs[0];
  const eventStart = event.start_date;
  const eventEnd = event.end_date;

  let weekStart: string;
  let weekEnd: string;

  if (data.monthStart) {
    const anchor = parseYmd(data.monthStart);
    weekStart = formatYmd(startOfMonth(anchor));
    weekEnd = formatYmd(endOfMonth(anchor));
    if (weekStart < eventStart) weekStart = eventStart;
    if (weekEnd > eventEnd) weekEnd = eventEnd;
    if (weekStart > weekEnd) weekStart = weekEnd;
  } else {
    weekStart = data.weekStart ?? formatYmd(startOfWeek(new Date(), { weekStartsOn: 1 }));
    if (weekStart < eventStart) weekStart = eventStart;
    if (weekStart > eventEnd) weekStart = eventStart;

    weekEnd = formatYmd(addDays(parseYmd(weekStart), 6));
    if (weekEnd > eventEnd) weekEnd = eventEnd;
    if (weekStart > weekEnd) weekStart = weekEnd;
  }

  const weekDays: string[] = [];
  let cursor = parseYmd(weekStart);
  const last = parseYmd(weekEnd);
  while (cursor <= last) {
    weekDays.push(formatYmd(cursor));
    cursor = addDays(cursor, 1);
  }

  const { data: slotsRaw } = await supabase
    .from("slots")
    .select("id, name, starts_at, ends_at, capacity, event_id")
    .eq("event_id", event.id)
    .order("starts_at", { ascending: true });

  const slots: DashboardSlotRow[] = (slotsRaw ?? []).map((s, i) => ({
    id: s.id,
    name: s.name,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    capacity: s.capacity,
    color_index: i % 6,
  }));

  const slotIds = slots.map((s) => s.id);
  const slotById = new Map(slots.map((s) => [s.id, s]));

  const rangeStart = new Date(`${weekStart}T00:00:00`);
  const rangeEndExclusive = addDays(parseYmd(weekEnd), 1);
  const rangeEndIso = new Date(`${formatYmd(rangeEndExclusive)}T00:00:00`).toISOString();

  const registrations: DashboardRegistrationCard[] = [];
  const usageMap = new Map<string, DashboardDaySlotUsage>();

  const ensureUsage = (date: string, slotId: string) => {
    const key = `${date}:${slotId}`;
    if (!usageMap.has(key)) {
      const slot = slotById.get(slotId);
      usageMap.set(key, {
        date,
        slot_id: slotId,
        booked: 0,
        entered: 0,
        capacity: slot?.capacity ?? 0,
      });
    }
    return usageMap.get(key)!;
  };

  if (slotIds.length > 0) {
    const { data: regs } = await supabase
      .from("registrations")
      .select("id, slot_id, customer_name, guest_count, status, created_at")
      .in("slot_id", slotIds)
      .gte("created_at", rangeStart.toISOString())
      .lt("created_at", rangeEndIso)
      .order("created_at", { ascending: true });

    for (const r of regs ?? []) {
      const booking_date = bookingDateFromCreatedAt(r.created_at as string);
      if (booking_date < weekStart || booking_date > weekEnd) continue;

      registrations.push({
        id: r.id,
        slot_id: r.slot_id as string,
        booking_date,
        customer_name: r.customer_name as string,
        guest_count: r.guest_count ?? 1,
        status: r.status as string,
      });

      const guests = r.guest_count ?? 1;
      const usage = ensureUsage(booking_date, r.slot_id as string);
      if (["active", "entered", "exited", "auto_exited"].includes(r.status as string)) {
        usage.booked += guests;
      }
      if (r.status === "entered") usage.entered += guests;
    }
  }

  for (const day of weekDays) {
    for (const slot of slots) {
      ensureUsage(day, slot.id);
    }
  }

  return {
    events: eventsOut,
    selectedEventId,
    event: { id: event.id, name: event.name, start_date: eventStart, end_date: eventEnd },
    weekStart,
    weekEnd,
    weekDays,
    slots,
    registrations,
    daySlotUsage: Array.from(usageMap.values()),
  };
}

// ============ SCANNER ============
const scanSchema = z.object({
  qr_token: z.string().min(1).max(200),
  mode: z.enum(["entry", "exit"]),
});

export async function scanQR(input: z.infer<typeof scanSchema>) {
  const data = scanSchema.parse(input);
  const { supabase, userId } = await getAuthContext();
    // try to parse as uuid
    const tokenMatch = data.qr_token.match(/[0-9a-fA-F-]{36}/);
    const token = tokenMatch ? tokenMatch[0] : data.qr_token;

    const { data: reg } = await supabase
      .from("registrations")
      .select("*, slots(*)")
      .eq("qr_token", token)
      .maybeSingle();

    if (!reg) {
      await supabase.from("scan_events").insert({ mode: data.mode, result: "invalid", reason: "Token not found", scanner_user_id: userId });
      return { valid: false, reason: "Invalid QR — not found" };
    }
    const slot = reg.slots as { id: string; name: string; starts_at: string; ends_at: string };
    const now = new Date();
    const timing: PassTimingInput = {
      booking_date: bookingDateFromCreatedAt(reg.created_at),
      created_at: reg.created_at,
      slot_starts_at: slot.starts_at,
      slot_ends_at: slot.ends_at,
      status: reg.status,
    };

    if (data.mode === "entry") {
      if (!isPassActive(timing, now)) {
        const bookingDate = passBookingDate(timing);
        const today = formatYmd(now);
        const reason =
          bookingDate < today
            ? "Pass expired — booking date has passed"
            : passEnd(timing).getTime() < now.getTime()
              ? "Pass expired — slot has ended"
              : "Pass is no longer valid";
        await supabase.from("scan_events").insert({
          registration_id: reg.id,
          slot_id: slot.id,
          mode: "entry",
          result: "invalid",
          reason,
          scanner_user_id: userId,
        });
        return { valid: false, reason, customer: reg.customer_name };
      }
      if (reg.status === "entered") {
        await supabase.from("scan_events").insert({ registration_id: reg.id, slot_id: slot.id, mode: "entry", result: "invalid", reason: "Already inside", scanner_user_id: userId });
        return { valid: false, reason: "Already entered", customer: reg.customer_name };
      }
      if (reg.status === "exited" || reg.status === "auto_exited") {
        await supabase.from("scan_events").insert({ registration_id: reg.id, slot_id: slot.id, mode: "entry", result: "invalid", reason: "Already exited", scanner_user_id: userId });
        return { valid: false, reason: "Already exited", customer: reg.customer_name };
      }
      await supabase.from("registrations").update({ status: "entered", entered_at: new Date().toISOString() }).eq("id", reg.id);
      await supabase.from("scan_events").insert({ registration_id: reg.id, slot_id: slot.id, mode: "entry", result: "valid", scanner_user_id: userId });
      return {
        valid: true,
        reason: "Welcome!",
        customer: reg.customer_name,
        slot: slot.name,
        slot_id: slot.id,
        slot_starts_at: slot.starts_at,
        slot_ends_at: slot.ends_at,
        booking_date: bookingDateFromCreatedAt(reg.created_at),
        mobile: reg.mobile ?? null,
        guests: reg.guest_count,
      };
    } else {
      if (reg.status !== "entered") {
        await supabase.from("scan_events").insert({ registration_id: reg.id, slot_id: slot.id, mode: "exit", result: "invalid", reason: "Not inside", scanner_user_id: userId });
        return { valid: false, reason: "Guest is not inside", customer: reg.customer_name };
      }
      await supabase.from("registrations").update({ status: "exited", exited_at: new Date().toISOString() }).eq("id", reg.id);
      await supabase.from("scan_events").insert({ registration_id: reg.id, slot_id: slot.id, mode: "exit", result: "valid", scanner_user_id: userId });
      return {
        valid: true,
        reason: "Exit recorded",
        customer: reg.customer_name,
        slot: slot.name,
        slot_id: slot.id,
        slot_starts_at: slot.starts_at,
        slot_ends_at: slot.ends_at,
        booking_date: bookingDateFromCreatedAt(reg.created_at),
        mobile: reg.mobile ?? null,
        guests: reg.guest_count,
      };
    }
}

export async function getScanditConfig() {
  const { supabase } = await getAuthContext();
  const { data } = await supabase.from("app_settings").select("scandit_enabled, scandit_api_key").eq("id", 1).maybeSingle();
  return { enabled: !!data?.scandit_enabled, key: data?.scandit_api_key ?? "" };
}

export type RecentScannerScanRow = {
  id: string;
  slotName: string;
  customerName?: string | null;
  phone?: string | null;
  slotStartsAt?: string | null;
  slotEndsAt?: string | null;
  scannedAt: string;
  guestCount?: number;
  mode: "entry" | "exit";
};

const slotDayRegistrationsSchema = z.object({
  slotId: z.string().uuid(),
  dateYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type SlotDayRegistrationRow = {
  id: string;
  customerName: string;
  mobile: string;
  guestCount: number;
};

export type SlotDayRegistrationsPayload = {
  slot: {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
  } | null;
  registrations: SlotDayRegistrationRow[];
};

/** Scanner: registrations booked for a slot on a calendar day. */
export async function getRegistrationsForSlotDay(
  input: z.infer<typeof slotDayRegistrationsSchema>,
): Promise<SlotDayRegistrationsPayload> {
  const { slotId, dateYmd } = slotDayRegistrationsSchema.parse(input);
  const { supabase } = await getAuthContext();

  const dayStart = new Date(`${dateYmd}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [{ data: slot }, { data: regs }] = await Promise.all([
    supabase.from("slots").select("id, name, starts_at, ends_at").eq("id", slotId).maybeSingle(),
    supabase
      .from("registrations")
      .select("id, customer_name, mobile, guest_count, status, created_at")
      .eq("slot_id", slotId)
      .in("status", ["active", "entered", "exited", "auto_exited"])
      .gte("created_at", dayStart.toISOString())
      .lt("created_at", dayEnd.toISOString())
      .order("customer_name", { ascending: true }),
  ]);

  const registrations = (regs ?? [])
    .filter((r) => bookingDateFromCreatedAt(r.created_at as string) === dateYmd)
    .map((r) => ({
      id: r.id as string,
      customerName: (r.customer_name as string)?.trim() || "Guest",
      mobile: (r.mobile as string)?.trim() || "",
      guestCount: (r.guest_count as number) ?? 1,
    }));

  return {
    slot: slot
      ? {
          id: slot.id,
          name: slot.name,
          startsAt: slot.starts_at,
          endsAt: slot.ends_at,
        }
      : null,
    registrations,
  };
}

/** Lookback for scanner recent list (covers a full event day/shift). */
/** Local calendar day [start, end) as ISO timestamps for timestamptz filters. */
function localCalendarDayBoundsIso(ymd: string = todayYmd()): { startIso: string; endIso: string } {
  const start = parseYmd(ymd);
  const end = addDays(start, 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function mapRecentScannerScanRows(
  data: Array<{
    id: string;
    mode: string;
    scanned_at: string;
    slots: { name: string; starts_at: string; ends_at: string } | null;
    registrations: {
      customer_name: string | null;
      guest_count: number;
      mobile: string | null;
    } | null;
  }>,
): RecentScannerScanRow[] {
  return data.flatMap((row) => {
    const slot = row.slots;
    if (!slot?.name) return [];
    const reg = row.registrations;
    const guestCount = reg?.guest_count;
    return [
      {
        id: row.id,
        slotName: slot.name,
        customerName: reg?.customer_name ?? null,
        phone: reg?.mobile ?? null,
        slotStartsAt: slot.starts_at ?? null,
        slotEndsAt: slot.ends_at ?? null,
        scannedAt: row.scanned_at,
        guestCount: guestCount != null && guestCount > 0 ? guestCount : undefined,
        mode: row.mode as "entry" | "exit",
      },
    ];
  });
}

async function queryRecentScannerScansForUser(userId: string, limit: number): Promise<RecentScannerScanRow[]> {
  const { startIso, endIso } = localCalendarDayBoundsIso();
  const { data } = await supabaseAdmin
    .from("scan_events")
    .select(
      "id, mode, scanned_at, slots!inner(name, starts_at, ends_at), registrations(customer_name, guest_count, mobile)",
    )
    .eq("scanner_user_id", userId)
    .eq("result", "valid")
    .gte("scanned_at", startIso)
    .lt("scanned_at", endIso)
    .order("scanned_at", { ascending: false })
    .limit(limit);

  return mapRecentScannerScanRows((data ?? []) as Parameters<typeof mapRecentScannerScanRows>[0]);
}

export async function getRecentScannerScans(limit = 20): Promise<RecentScannerScanRow[]> {
  const { userId } = await getAuthContext();
  return queryRecentScannerScansForUser(userId, limit);
}

/** One auth round-trip: Scandit toggle + recent scans for the scanner side panel. */
export async function getScannerSidePanelData(limit = 20) {
  const { supabase, userId } = await getAuthContext();
  const [settingsRes, recentScans] = await Promise.all([
    supabase.from("app_settings").select("scandit_enabled").eq("id", 1).maybeSingle(),
    queryRecentScannerScansForUser(userId, limit),
  ]);
  return {
    scanditEnabled: !!settingsRes.data?.scandit_enabled,
    recentScans,
  };
}

// ============ POS ============
export async function posRegister(input: z.infer<typeof registerSchema>) {
  const data = registerSchema.parse(input);
  const { supabase } = await getAuthContext();
  const since = new Date(Date.now() - 30_000).toISOString();
  const bookingDate = data.booking_date;

  const [{ data: slot }, { data: dupe }] = await Promise.all([
    supabase.from("slots").select("*").eq("id", data.slot_id).maybeSingle(),
    supabase
      .from("registrations")
      .select("id, qr_token")
      .eq("slot_id", data.slot_id)
      .eq("mobile", data.mobile)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!slot) throw new Error("Slot not found");
  if (slot.hidden_from_booking) throw new Error("This slot is not available for booking");

  const effectiveBookingDate = bookingDate ?? todayYmd();
  if (isSlotPastForDate(slot, effectiveBookingDate)) {
    throw new Error("This slot has ended and is no longer available for booking");
  }

  const { scheduleBookingQubeOutboundSync } = await import("@/lib/bookingqube.sync");

  if (dupe) {
    scheduleBookingQubeOutboundSync(dupe.id);
    if (data.email?.trim()) {
      const { scheduleDigitalPassEmail } = await import("@/lib/mailgun.server");
      scheduleDigitalPassEmail(dupe.id, { email: data.email.trim() });
    }
    return { id: dupe.id, qr_token: dupe.qr_token };
  }

  const used = await sumGuests(supabase, data.slot_id, bookingDate);
  if (used + data.guest_count > slot.capacity) throw new Error("Slot is full");

  // For advance/back-dated bookings, anchor created_at to noon of that date (keeps per-day capacity correct)
  const createdAt = bookingDate ? new Date(`${bookingDate}T12:00:00`).toISOString() : new Date().toISOString();

  const { data: reg, error } = await supabase.from("registrations").insert({
    slot_id: data.slot_id,
    customer_name: data.customer_name,
    mobile: data.mobile,
    email: data.email || null,
    guest_count: data.guest_count,
    created_at: createdAt,
  }).select("id, qr_token").single();
  if (error) throw new Error(error.message);
  scheduleBookingQubeOutboundSync(reg.id);
  if (data.email?.trim()) {
    const { scheduleDigitalPassEmail } = await import("@/lib/mailgun.server");
    scheduleDigitalPassEmail(reg.id, { email: data.email.trim() });
  }
  return { id: reg.id, qr_token: reg.qr_token };
}

export async function searchByMobile(input: { mobile: string }) {
  const data = z.object({ mobile: z.string().min(3).max(32) }).parse(input);
  const { searchSuffix, national, digits } = normalizePhoneForLookup(data.mobile);
  const needle = searchSuffix.length >= 7 ? searchSuffix : digits;
  if (needle.length < 3) return { results: [] as const };

  const { supabase } = await getAuthContext();
  const { data: regs } = await supabase
    .from("registrations")
    .select("id, customer_name, mobile, email, guest_count, qr_token, status, created_at, slots(name, starts_at)")
    .ilike("mobile", `%${needle}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  const ranked = (regs ?? []).slice().sort((a, b) => {
    const score = (m: string) => {
      const d = m.replace(/\D/g, "");
      const nat = d.startsWith("974") ? d.slice(3) : d;
      if (nat === national || d === digits) return 0;
      if (nat.endsWith(searchSuffix) || d.endsWith(needle)) return 1;
      return 2;
    };
    const byMatch = score(a.mobile) - score(b.mobile);
    if (byMatch !== 0) return byMatch;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const seen = new Set<string>();
  const unique = ranked
    .filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .map((r) => ({
      ...r,
      booking_date: bookingDateFromCreatedAt(r.created_at),
    }));
  return { results: unique };
}

/** POS: re-push ticket / pass to BookingQube for an existing registration. */
export async function resendPassTicket(input: { registration_id: string }) {
  const { registration_id } = z.object({ registration_id: z.string().uuid() }).parse(input);
  await getAuthContext();
  const { syncRegistrationOutbound } = await import("@/lib/bookingqube.sync");
  await syncRegistrationOutbound(registration_id);
  return { ok: true as const };
}

export async function lookupByToken(input: { token: string }) {
  const data = z.object({ token: z.string().min(1).max(300) }).parse(input);
  const { supabase } = await getAuthContext();
  const m = data.token.match(/[0-9a-fA-F-]{36}/);
  const token = m ? m[0] : data.token;
  const { data: reg } = await supabase
      .from("registrations")
      .select("id, customer_name, mobile, email, guest_count, qr_token, status, created_at, slots(name, starts_at)")
      .eq("qr_token", token)
      .maybeSingle();
    if (!reg) return { result: null };
    return {
      result: {
        ...reg,
        booking_date: bookingDateFromCreatedAt(reg.created_at),
      },
    };
}

/** Resolve all passes for the guest who owns this QR/pass token (public deep link; no phone in URL). */
export async function getMyPassesFromQrToken(input: { qr_token: string }) {
  const data = z.object({ qr_token: z.string().trim().min(1).max(300) }).parse(input);
  const m = data.qr_token.match(/[0-9a-fA-F-]{36}/);
  const token = m ? m[0] : data.qr_token.trim();
  const { data: row } = await supabaseAdmin
    .from("registrations")
    .select("mobile")
    .eq("qr_token", token)
    .maybeSingle();
  if (!row?.mobile) return { passes: [] as Awaited<ReturnType<typeof getMyPasses>>["passes"] };
  return getMyPasses({ mobile: row.mobile });
}

// ============ PUBLIC: list all passes by mobile number ============
export async function getMyPasses(input: { mobile: string }) {
  const data = z.object({ mobile: z.string().trim().min(3).max(32) }).parse(input);
  const { searchSuffix, national, digits } = normalizePhoneForLookup(data.mobile);
  const needle = searchSuffix.length >= 7 ? searchSuffix : digits;
  if (needle.length < 3) return { passes: [] };

  const { data: regs } = await supabaseAdmin
      .from("registrations")
      .select("id, customer_name, mobile, email, guest_count, qr_token, status, created_at, entered_at, exited_at, slots(name, starts_at, ends_at, events(name, event_date))")
      .ilike("mobile", `%${needle}%`)
      .order("created_at", { ascending: false })
      .limit(50);

  const ranked = (regs ?? []).slice().sort((a, b) => {
    const score = (m: string) => {
      const d = m.replace(/\D/g, "");
      const nat = d.startsWith("974") ? d.slice(3) : d;
      if (nat === national || d === digits) return 0;
      if (nat.endsWith(searchSuffix) || d.endsWith(needle)) return 1;
      return 2;
    };
    return score(a.mobile) - score(b.mobile);
  });
    const now = new Date();
    const list = ranked.map((r: any) => {
      const slot = r.slots ?? {};
      const booking_date = r.created_at ? bookingDateFromCreatedAt(r.created_at) : null;
      const { liveStatus, isActive } = resolvePassLiveStatus(
        { status: r.status, created_at: r.created_at },
        slot,
        now,
      );
      return {
        id: r.id,
        qr_token: r.qr_token,
        customer_name: r.customer_name,
        mobile: r.mobile,
        guest_count: r.guest_count,
        status: r.status,
        liveStatus,
        isActive,
        created_at: r.created_at,
        entered_at: r.entered_at,
        exited_at: r.exited_at,
        booking_date,
        slot_name: slot.name ?? null,
        slot_starts_at: slot.starts_at ?? null,
        slot_ends_at: slot.ends_at ?? null,
        start_time: slot.starts_at ?? null,
        end_time: slot.ends_at ?? null,
        event_name: slot.events?.name ?? null,
        event_date: slot.events?.event_date ?? null,
      };
    });
    return { passes: list };
}
