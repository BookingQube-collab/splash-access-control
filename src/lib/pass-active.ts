import { formatYmd, parseYmd, todayYmd } from "@/lib/utils";

/** Fields needed to evaluate whether a pass can be scanned / shown as active. */
export type PassTimingInput = {
  booking_date?: string | null;
  created_at: string;
  slot_starts_at?: string | null;
  slot_ends_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string;
  liveStatus?: string;
};

/** Local calendar booking day (matches POS `todayYmd` / anchored `created_at`). */
export function passBookingDate(p: PassTimingInput): string {
  if (p.booking_date) return p.booking_date;
  return formatYmd(new Date(p.created_at));
}

export function isPastBookingYmd(ymd: string): boolean {
  return ymd < todayYmd();
}

export function isPastRegistrationBooking(p: {
  booking_date?: string | null;
  created_at: string;
}): boolean {
  return isPastBookingYmd(passBookingDate(p));
}

export function passStart(p: PassTimingInput): Date {
  const d = passBookingDate(p);
  const t = p.slot_starts_at ?? p.start_time;
  if (!t) return parseYmd(d);
  const slot = new Date(t);
  const base = parseYmd(d);
  base.setHours(slot.getHours(), slot.getMinutes(), 0, 0);
  return base;
}

export function passEnd(p: PassTimingInput): Date {
  const d = passBookingDate(p);
  const t = p.slot_ends_at ?? p.end_time;
  if (!t) return passStart(p);
  const slot = new Date(t);
  const base = parseYmd(d);
  base.setHours(slot.getHours(), slot.getMinutes(), 0, 0);
  return base;
}

/**
 * True when the pass may be used for entry (booking day not passed, slot not ended).
 * Uses local calendar date (same as POS `todayYmd`).
 */
export function isPassActive(p: PassTimingInput, now: Date | number = Date.now()): boolean {
  const nowDate = typeof now === "number" ? new Date(now) : now;
  const nowMs = nowDate.getTime();
  const today = formatYmd(nowDate);

  if (p.status === "exited" || p.status === "auto_exited" || p.status === "expired") return false;
  if (p.liveStatus === "Exited" || p.liveStatus === "Expired") return false;

  const bookingDate = passBookingDate(p);
  if (bookingDate < today) return false;

  if (passEnd(p).getTime() < nowMs) return false;

  return true;
}

export function passInactiveReason(p: PassTimingInput, now: Date | number = Date.now()): string | null {
  if (isPassActive(p, now)) return null;
  const nowDate = typeof now === "number" ? new Date(now) : now;
  const today = formatYmd(nowDate);
  const bookingDate = passBookingDate(p);

  if (p.status === "exited" || p.status === "auto_exited") return "This pass has already been used";
  if (p.status === "expired" || p.liveStatus === "Expired") return "This pass is no longer valid";
  if (bookingDate < today) return "This pass is no longer valid";
  if (passEnd(p).getTime() < nowDate.getTime()) return "This pass is no longer valid";
  return "This pass is no longer valid";
}
