import { format, getMinutes, isValid, parseISO } from "date-fns";
import { formatYmd, parseYmd, todayYmd } from "@/lib/utils";

export type SlotTimeBounds = {
  ends_at: string;
};

export type SlotTimeRange = SlotTimeBounds & {
  starts_at: string;
};

export type PosSlotPickCandidate = SlotTimeRange & {
  id: string;
  remaining?: number;
};

function parseSlotInstant(value: string | Date): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null;
  try {
    const d = parseISO(value);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

/** Single clock time, e.g. `4 pm` or `4:30 pm` (lowercase am/pm). */
export function formatSlotTimePart(value: string | Date): string {
  const d = parseSlotInstant(value);
  if (!d) return "";
  const pattern = getMinutes(d) === 0 ? "h a" : "h:mm a";
  return format(d, pattern).toLowerCase();
}

/** Combined range, e.g. `4 pm – 6 pm`. */
export function formatSlotTimeRange(
  startsAt: string | Date,
  endsAt?: string | Date | null,
): string {
  const start = formatSlotTimePart(startsAt);
  if (endsAt === undefined || endsAt === null) return start;
  const end = formatSlotTimePart(endsAt);
  if (!start) return end;
  if (!end) return start;
  return `${start} – ${end}`;
}

/** `HH:mm` (24h) → `4 pm`. */
export function formatSlotTimeFromHm(hm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return hm;
  const d = new Date(2000, 0, 1, Number(m[1]), Number(m[2]), 0, 0);
  return formatSlotTimePart(d);
}

/** `HH:mm` pair → `4 pm – 6 pm`. */
export function formatSlotTimeRangeFromHm(startHm: string, endHm: string): string {
  const m1 = /^(\d{1,2}):(\d{2})$/.exec(startHm.trim());
  const m2 = /^(\d{1,2}):(\d{2})$/.exec(endHm.trim());
  if (!m1 || !m2) return `${startHm}–${endHm}`;
  const s = new Date(2000, 0, 1, Number(m1[1]), Number(m1[2]), 0, 0);
  const e = new Date(2000, 0, 1, Number(m2[1]), Number(m2[2]), 0, 0);
  return formatSlotTimeRange(s, e);
}

/** Slot start instant on a booking calendar day (local time). */
export function slotStartOnDate(startsAt: string, dateYmd: string): Date | null {
  const slot = parseISO(startsAt);
  if (!isValid(slot)) return null;
  const base = parseYmd(dateYmd);
  base.setHours(slot.getHours(), slot.getMinutes(), slot.getSeconds(), slot.getMilliseconds());
  return base;
}

/** Slot end instant on a booking calendar day (local time, same as passEnd). */
export function slotEndOnDate(endsAt: string, dateYmd: string): Date | null {
  const slot = parseISO(endsAt);
  if (!isValid(slot)) return null;
  const base = parseYmd(dateYmd);
  base.setHours(slot.getHours(), slot.getMinutes(), slot.getSeconds(), slot.getMilliseconds());
  return base;
}

/**
 * True when the slot cannot be booked for `dateYmd`:
 * - dates before today: unavailable
 * - today: ended when slot end (on that day) is before now
 * - future dates: always bookable (time not checked)
 */
export function isSlotPastForDate(
  slot: SlotTimeBounds,
  dateYmd: string,
  now: Date = new Date(),
): boolean {
  const today = todayYmd();
  if (dateYmd < today) return true;
  if (dateYmd > today) return false;
  const end = slotEndOnDate(slot.ends_at, dateYmd);
  if (!end) return false;
  return end.getTime() < now.getTime();
}

/** True when `now` falls within the slot window on `dateYmd` (today only). */
export function isSlotActiveForDate(
  slot: SlotTimeRange,
  dateYmd: string,
  now: Date = new Date(),
): boolean {
  if (dateYmd !== todayYmd()) return false;
  const start = slotStartOnDate(slot.starts_at, dateYmd);
  const end = slotEndOnDate(slot.ends_at, dateYmd);
  if (!start || !end) return false;
  const t = now.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

/**
 * POS default slot: current active slot on today, else nearest upcoming slot today;
 * on future dates, earliest available slot by start time.
 */
export function pickDefaultPosSlotId(
  slots: readonly PosSlotPickCandidate[],
  dateYmd: string,
  now: Date = new Date(),
): string | null {
  const available = slots.filter(
    (s) => (s.remaining ?? 1) > 0 && !isSlotPastForDate(s, dateYmd, now),
  );
  if (available.length === 0) return null;

  const today = todayYmd();
  if (dateYmd === today) {
    const active = available.find((s) => isSlotActiveForDate(s, dateYmd, now));
    if (active) return active.id;

    const upcoming = available
      .map((s) => ({ s, start: slotStartOnDate(s.starts_at, dateYmd) }))
      .filter(({ start }) => start && start.getTime() > now.getTime())
      .sort((a, b) => a.start!.getTime() - b.start!.getTime());
    if (upcoming.length > 0) return upcoming[0].s.id;

    return null;
  }

  const sorted = [...available].sort((a, b) => {
    const sa = slotStartOnDate(a.starts_at, dateYmd)?.getTime() ?? 0;
    const sb = slotStartOnDate(b.starts_at, dateYmd)?.getTime() ?? 0;
    return sa - sb;
  });
  return sorted[0]?.id ?? null;
}

/** Short UI label for a slot that cannot be booked on `dateYmd`. */
export function slotUnavailableLabel(
  slot: SlotTimeBounds,
  dateYmd: string,
  now: Date = new Date(),
): "Ended" | "Unavailable" | null {
  if (!isSlotPastForDate(slot, dateYmd, now)) return null;
  return dateYmd < formatYmd(now) ? "Unavailable" : "Ended";
}

/** Slot label with optional time range, e.g. `Morning · 4 pm – 6 pm`. */
export function formatSlotDisplayLabel(
  name?: string | null,
  startsAt?: string | null,
  endsAt?: string | null,
): string {
  const range =
    startsAt && endsAt
      ? formatSlotTimeRange(startsAt, endsAt)
      : startsAt
        ? formatSlotTimePart(startsAt)
        : "";
  const n = name?.trim() ?? "";
  if (n && range) return `${n} · ${range}`;
  return n || range;
}
