import {
  format,
  isAfter,
  isBefore,
  isValid,
  isWithinInterval,
  parseISO,
  startOfDay,
} from "date-fns";
import { formatSlotTimeRange, formatSlotTimeRangeFromHm } from "@/lib/slot-time";
import { parseYmd } from "@/lib/utils";
import type { AdminTableFilters } from "@/lib/admin-filters.types";
import { filterSlotRow, type AdminSlotRow } from "@/lib/admin-filter-utils";
import {
  EVENT_ICON_VARIANTS,
  EVENT_STATUS_STYLES,
  type EventDisplayStatus,
} from "@/components/admin/admin-events-utils";

export type { AdminSlotRow };

export type SlotDisplayStatus = "Active" | "Scheduled" | "Upcoming";

export const SLOT_STATUS_OPTIONS: { value: SlotDisplayStatus; label: SlotDisplayStatus }[] = [
  { value: "Active", label: "Active" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Upcoming", label: "Upcoming" },
];

export const SLOT_STATUS_STYLES: Record<SlotDisplayStatus, string> = {
  Active: EVENT_STATUS_STYLES.Active,
  Scheduled: EVENT_STATUS_STYLES.Scheduled,
  Upcoming: EVENT_STATUS_STYLES.Upcoming,
};

export { EVENT_ICON_VARIANTS };

export function deriveSlotStatus(
  slot: Pick<AdminSlotRow, "starts_at" | "ends_at">,
  now = new Date(),
): SlotDisplayStatus {
  const start = parseISO(slot.starts_at);
  const end = parseISO(slot.ends_at);

  if (isWithinInterval(now, { start, end })) return "Active";
  if (isAfter(start, now)) {
    const daysUntil = Math.ceil((start.getTime() - now.getTime()) / 86400000);
    return daysUntil > 14 ? "Scheduled" : "Upcoming";
  }
  if (isBefore(end, now)) return "Scheduled";
  return "Upcoming";
}

export function formatSlotDateTimeRange(slot: AdminSlotRow): string {
  const sa = parseISO(slot.starts_at);
  const ea = parseISO(slot.ends_at);
  const sameDay = format(sa, "yyyy-MM-dd") === format(ea, "yyyy-MM-dd");
  const timeRange = formatSlotTimeRange(slot.starts_at, slot.ends_at);
  if (sameDay) {
    return `${format(sa, "MMM d, yyyy")} · ${timeRange}`;
  }
  return `${format(sa, "MMM d")} – ${format(ea, "MMM d, yyyy")} · ${timeRange}`;
}

export function formatSlotTimeHint(slot: Pick<AdminSlotRow, "starts_at" | "ends_at">): string {
  return formatSlotTimeRange(slot.starts_at, slot.ends_at);
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(ymd: string): boolean {
  if (!YMD_RE.test(ymd)) return false;
  return isValid(parseYmd(ymd));
}

/** Normalize to YYYY-MM-DD when valid; otherwise use fallback when valid; else "". */
export function normalizeYmd(value: string, fallback = ""): string {
  const ymd = value.slice(0, 10);
  if (isValidYmd(ymd)) return ymd;
  const fb = fallback.slice(0, 10);
  return isValidYmd(fb) ? fb : "";
}

export function formatYmdLabel(ymd: string): string | null {
  if (!isValidYmd(ymd)) return null;
  return format(parseYmd(ymd), "MMM d");
}

export function formatSlotCreationSummary(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  cap: number,
): string {
  const startLabel = formatYmdLabel(startDate);
  const endLabel = formatYmdLabel(endDate);
  const datePart =
    startLabel && endLabel ? `${startLabel} – ${endLabel}` : "Select dates";
  const timePart = formatSlotTimeRangeFromHm(startTime, endTime);
  return `One slot · ${datePart} · ${timePart} · cap ${cap}. Registration auto-closes when full.`;
}

export function filterSlotRowWithStatus(
  row: AdminSlotRow,
  f: AdminTableFilters,
  search: string,
): boolean {
  if (!filterSlotRow(row, f, search)) return false;
  if (f.status && deriveSlotStatus(row) !== f.status) return false;
  return true;
}

export function slotBookedPct(booked: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((booked / capacity) * 100));
}

export function formatSlotCreatedOn(createdAt?: string | null): string {
  if (!createdAt) return "—";
  try {
    return format(parseISO(createdAt), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

/** Re-export for slot status chip styling parity with events draft/cancelled if needed later */
export type { EventDisplayStatus };

export function slotStartsYmd(iso: string): string {
  try {
    return format(parseISO(iso), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function eventStartYmd(
  e: { start_date?: string | null; event_date?: string | null },
  fallback = "",
): string {
  return normalizeYmd(e.start_date ?? e.event_date ?? fallback, fallback);
}

export function eventEndYmd(
  e: { end_date?: string | null; event_date?: string | null },
  fallback = "",
): string {
  return normalizeYmd(e.end_date ?? e.event_date ?? fallback, fallback);
}

export function slotFormValuesFromRow(slot: AdminSlotRow) {
  const sa = parseISO(slot.starts_at);
  const ea = parseISO(slot.ends_at);
  return {
    eventId: slot.event_id,
    name: slot.name,
    startDate: format(sa, "yyyy-MM-dd"),
    endDate: format(ea, "yyyy-MM-dd"),
    startTime: format(sa, "HH:mm"),
    endTime: format(ea, "HH:mm"),
    capacity: slot.capacity,
    visibleToGuests: !slot.hidden_from_booking,
  };
}

export function slotDatesWithinEvent(
  startDate: string,
  endDate: string,
  event: { start_date?: string | null; end_date?: string | null; event_date?: string | null },
): boolean {
  const evStart = eventStartYmd(event);
  const evEnd = eventEndYmd(event);
  if (!evStart || !evEnd) return true;
  return startDate >= evStart && endDate <= evEnd;
}

export function slotOverlapsDay(slot: AdminSlotRow, ymd: string): boolean {
  if (!ymd) return true;
  const day = startOfDay(parseISO(`${ymd}T12:00:00`));
  const start = startOfDay(parseISO(slot.starts_at));
  const end = startOfDay(parseISO(slot.ends_at));
  return !isAfter(start, day) && !isBefore(end, day);
}
