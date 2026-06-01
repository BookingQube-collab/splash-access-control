import { addDays, format } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ZodError } from "zod";

/** Local calendar date as YYYY-MM-DD. */
export function todayYmd(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatYmd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * `created_at` for a new registration: booking calendar day + current clock time.
 * Keeps per-day slot capacity correct while every POS/web checkout gets a distinct timestamp.
 */
export function registrationCreatedAtForBookingDay(bookingYmd: string): string {
  const now = new Date();
  const day = parseYmd(bookingYmd);
  day.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return day.toISOString();
}

/** Days shown in the POS horizontal date strip (calendar covers the rest). */
export const POS_STRIP_DAY_COUNT = 7;

/** Default POS booking date: clamp today to [start, end] (inclusive). */
export function clampBookingDate(today: string, start: string, end: string): string {
  if (today < start) return start;
  if (today > end) return end;
  return today;
}

/** Later of two YYYY-MM-DD strings (lexicographic = chronological). */
export function maxYmd(a: string, b: string): string {
  return a >= b ? a : b;
}

/** Calendar month index for YYYY-MM-DD (year * 12 + zero-based month). */
export function ymdMonthIndex(ymd: string): number {
  const d = parseYmd(ymd);
  return d.getFullYear() * 12 + d.getMonth();
}

/** True when start and end fall in different calendar months. */
export function monthsSpanBookableRange(start: string, end: string): boolean {
  if (start > end) return false;
  return ymdMonthIndex(end) > ymdMonthIndex(start);
}

/** Bookable window from max(eventStart, today) through eventEnd. */
export function allowedBookingDates(
  eventStart: string,
  eventEnd: string,
  today: string = todayYmd(),
): { allowedStart: string; allowedEnd: string; dates: string[] } {
  const allowedStart = maxYmd(eventStart, today);
  const allowedEnd = eventEnd;
  if (allowedStart > allowedEnd) {
    return { allowedStart, allowedEnd, dates: [] };
  }
  return {
    allowedStart,
    allowedEnd,
    dates: eachDateInRange(allowedStart, allowedEnd),
  };
}

/** First up to `count` calendar days in [start, end] (inclusive). */
export function firstDatesInRange(start: string, end: string, count: number): string[] {
  if (start > end || count <= 0) return [];
  return eachDateInRange(start, end).slice(0, count);
}

/** Every calendar day from start through end (inclusive), as YYYY-MM-DD. */
export function eachDateInRange(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = parseYmd(start);
  const last = parseYmd(end);
  while (cur <= last) {
    out.push(formatYmd(cur));
    cur = addDays(cur, 1);
  }
  return out;
}

/** Event bounds from Supabase row (falls back to legacy event_date). */
export function eventDateRange(event: {
  start_date?: string | null;
  end_date?: string | null;
  event_date?: string | null;
}): { start: string; end: string } {
  const fallback = event.event_date ?? todayYmd();
  const start = event.start_date ?? fallback;
  const end = event.end_date ?? fallback;
  return start <= end ? { start, end } : { start: end, end: start };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type OverviewSlotCounts = {
  capacity: number;
  /** Sum of guest_count for active/entered/exited/auto_exited registrations. */
  booked?: number;
  active?: number;
  /** Guests checked in for today's booking day (sum of guest_count, not row count). */
  entered?: number;
  exited?: number;
  auto_exited?: number;
  /** Failed scan attempts today that still need attention (not post-check-in duplicates). */
  invalid?: number;
  total_capacity?: number;
  event_days?: number;
};

/** Total guests booked across slots (sum of guest_count, not registration count). */
export function sumOverviewGuestsBooked(slots: OverviewSlotCounts[]): number {
  return slots.reduce(
    (total, s) =>
      total +
      (s.booked ??
        (s.active ?? 0) + (s.entered ?? 0) + (s.exited ?? 0) + (s.auto_exited ?? 0)),
    0,
  );
}

/** Total guest capacity across all event days and slots. */
export function sumOverviewTotalCapacity(slots: OverviewSlotCounts[]): number {
  return slots.reduce(
    (total, s) => total + (s.total_capacity ?? s.capacity * (s.event_days ?? 1)),
    0,
  );
}

/** Round capacity utilization: one decimal below 10% sold, whole numbers otherwise. */
function roundCapacityPctPair(guestsBooked: number, totalCapacity: number): { sold: number; available: number } {
  if (totalCapacity <= 0) return { sold: 0, available: 100 };
  const soldRaw = (guestsBooked / totalCapacity) * 100;
  const availableRaw = ((totalCapacity - guestsBooked) / totalCapacity) * 100;
  if (soldRaw < 10) {
    return {
      sold: Math.round(soldRaw * 10) / 10,
      available: Math.round(availableRaw * 10) / 10,
    };
  }
  return {
    sold: Math.min(100, Math.round(soldRaw)),
    available: Math.min(100, Math.round(availableRaw)),
  };
}

/** Sold share of total capacity (0–100), based on guest count. */
export function capacitySoldPercent(guestsBooked: number, totalCapacity: number): number {
  return roundCapacityPctPair(guestsBooked, totalCapacity).sold;
}

/** Remaining share of total capacity (0–100), based on guest count. */
export function capacityAvailablePercent(guestsBooked: number, totalCapacity: number): number {
  return roundCapacityPctPair(guestsBooked, totalCapacity).available;
}

/** Display capacity % without a trailing ".0". */
export function formatCapacityPercent(pct: number): string {
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}

/** Strip to digits for phone matching. */
export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Qatar-focused normalization for registration lookup. */
export function normalizePhoneForLookup(raw: string): {
  digits: string;
  national: string;
  searchSuffix: string;
  isComplete: boolean;
} {
  const digits = phoneDigits(raw.trim());
  let national = digits;
  if (digits.startsWith("974")) national = digits.slice(3);
  const qaMobile = /^[3567]\d{7}$/.test(national);
  const isComplete = qaMobile;
  const searchSuffix =
    national.length >= 8 ? national.slice(-8) : national.length >= 7 ? national : digits;
  return { digits, national, searchSuffix, isComplete };
}

/** True once the user has typed past the country code (≥3 national digits). */
export function hasMobileLookupInput(raw: string): boolean {
  return normalizePhoneForLookup(raw).national.length >= 3;
}

/** Canonical key for deduping the same guest across registrations. */
export function phoneIdentityKey(raw: string): string {
  const { digits, national } = normalizePhoneForLookup(raw);
  return national || digits;
}

function messageFromUnknown(error: unknown): string | null {
  if (typeof error === "string") return error.trim() || null;
  if (error instanceof Error) return error.message.trim() || null;
  if (typeof error === "object" && error !== null) {
    const rec = error as Record<string, unknown>;
    if (typeof rec.message === "string") return rec.message.trim() || null;
    if (typeof rec.error === "string") return rec.error.trim() || null;
  }
  return null;
}

/** Turn server-action / Zod failures into a short message for toasts. */
export function formatActionError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.errors.map((e) => e.message).join(". ");
  }
  const msg = messageFromUnknown(error);
  if (msg === "Unauthorized") return "Please sign in again";
  if (msg) {
    if (msg.startsWith("[")) {
      try {
        const parsed = JSON.parse(msg) as { message?: string }[];
        if (Array.isArray(parsed)) {
          return parsed.map((i) => i.message).filter(Boolean).join(". ");
        }
      } catch {
        /* not JSON */
      }
    }
    return msg;
  }
  return "Something went wrong";
}
