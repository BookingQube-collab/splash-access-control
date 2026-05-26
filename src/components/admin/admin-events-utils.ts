import { format, isAfter, isBefore, isWithinInterval, parseISO, startOfDay } from "date-fns";

export type AdminEventRow = {
  id: string;
  name: string;
  start_date?: string | null;
  event_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
};

export type EventDisplayStatus =
  | "Active"
  | "Scheduled"
  | "Upcoming"
  | "Draft"
  | "Cancelled";

export function eventDateRange(e: AdminEventRow): { start: Date; end: Date } {
  const startRaw = e.start_date ?? e.event_date ?? new Date().toISOString();
  const endRaw = e.end_date ?? e.event_date ?? startRaw;
  return { start: parseISO(startRaw.slice(0, 10)), end: parseISO(endRaw.slice(0, 10)) };
}

export function deriveEventStatus(e: AdminEventRow, now = new Date()): EventDisplayStatus {
  const today = startOfDay(now);
  const { start, end } = eventDateRange(e);
  const startDay = startOfDay(start);
  const endDay = startOfDay(end);

  if (!e.is_active) {
    if (isBefore(endDay, today)) return "Cancelled";
    return "Draft";
  }

  if (isWithinInterval(today, { start: startDay, end: endDay })) return "Active";
  if (isAfter(startDay, today)) {
    const daysUntil = Math.ceil((startDay.getTime() - today.getTime()) / 86400000);
    return daysUntil > 14 ? "Scheduled" : "Upcoming";
  }
  if (isBefore(endDay, today)) return "Cancelled";
  return "Scheduled";
}

export const EVENT_STATUS_STYLES: Record<EventDisplayStatus, string> = {
  Active: "bg-[#dcfce7] text-[#15803d]",
  Scheduled: "bg-[#dbeafe] text-[#1d4ed8]",
  Upcoming: "bg-[#ffedd5] text-[#c2410c]",
  Draft: "bg-[#f1f5f9] text-[#64748b]",
  Cancelled: "bg-[#fee2e2] text-[#b91c1c]",
};

export const EVENT_ICON_VARIANTS = [
  { bg: "bg-[#e0f2fe]", text: "text-[#0284c7]", key: "car" as const },
  { bg: "bg-[#fce7f3]", text: "text-[#db2777]", key: "person" as const },
  { bg: "bg-[#fef3c7]", text: "text-[#d97706]", key: "star" as const },
  { bg: "bg-[#ede9fe]", text: "text-[#7c3aed]", key: "waves" as const },
];

export function formatEventDateRange(e: AdminEventRow): string {
  const { start, end } = eventDateRange(e);
  if (format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd")) {
    return format(start, "MMM d, yyyy");
  }
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

/** Inclusive calendar days between event start and end (matches dashboard overview). */
export function eventDayCount(e: AdminEventRow): number {
  const { start, end } = eventDateRange(e);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

/** Per-day slot capacity × event duration in days. */
export function slotTotalCapacity(perDayCapacity: number, e: AdminEventRow): number {
  return perDayCapacity * eventDayCount(e);
}

export function formatEventTimeHint(e: AdminEventRow): string {
  const days = eventDayCount(e);
  return `All day · ${days} day${days === 1 ? "" : "s"}`;
}

export function eventOverlapsFilter(
  e: AdminEventRow,
  filterStart: string,
  filterEnd: string,
): boolean {
  if (!filterStart && !filterEnd) return true;
  const { start, end } = eventDateRange(e);
  const fs = filterStart ? parseISO(filterStart) : start;
  const fe = filterEnd ? parseISO(filterEnd) : end;
  return !isAfter(startOfDay(start), startOfDay(fe)) && !isBefore(startOfDay(end), startOfDay(fs));
}
