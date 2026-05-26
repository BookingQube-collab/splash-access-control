import {

  format,

  isToday,

  startOfWeek,

  endOfWeek,

  eachDayOfInterval,

} from "date-fns";

import type { CustomerPass } from "./types";

import {
  isPassActive as isPassActiveCore,
  passBookingDate,
  passEnd,
  passInactiveReason as passInactiveReasonCore,
  passStart,
} from "@/lib/pass-active";

import { formatSlotTimePart, formatSlotTimeRange } from "@/lib/slot-time";
import { parseYmd, todayYmd } from "@/lib/utils";



export { passBookingDate, passStart, passEnd } from "@/lib/pass-active";



export function isPassActive(pass: CustomerPass, now: Date | number = Date.now()): boolean {
  return isPassActiveCore(pass, now);
}

export function passInactiveReason(pass: CustomerPass, now: Date | number = Date.now()): string | null {
  return passInactiveReasonCore(pass, now);
}



export function isUpcomingPass(p: CustomerPass, now = Date.now()): boolean {

  if (p.liveStatus === "Inside") return passBookingDate(p) >= todayYmd();

  return isPassActive(p, now);

}



export function groupPassesByDate(passes: CustomerPass[]): Map<string, CustomerPass[]> {

  const map = new Map<string, CustomerPass[]>();

  for (const p of passes) {

    const key = passBookingDate(p);

    const list = map.get(key) ?? [];

    list.push(p);

    map.set(key, list);

  }

  for (const [, list] of map) {

    list.sort((a, b) => passStart(a).getTime() - passStart(b).getTime());

  }

  return map;

}



export function sortedDateKeys(map: Map<string, CustomerPass[]>): string[] {

  return [...map.keys()].sort();

}



export function firstName(passes: CustomerPass[]): string {

  const name = passes[0]?.customer_name?.trim();

  if (!name) return "Guest";

  return name.split(/\s+/)[0] ?? name;

}

/** Toast copy for dashboard welcome — uses party size, not registration count. */
export function welcomeBackGuestsMessage(guestCount: number): string {
  const n = Math.max(1, guestCount);
  return `Welcome back — ${n} guest${n === 1 ? "" : "s"}`;
}

/** Guest count for welcome toast: focused pass, else sole pass, else total guests. */
export function welcomeBackGuestCount(passes: CustomerPass[], focusQrToken?: string): number {
  if (focusQrToken) {
    const focused = passes.find((p) => p.qr_token === focusQrToken);
    if (focused) return focused.guest_count ?? 1;
  }
  if (passes.length === 1) return passes[0]?.guest_count ?? 1;
  return passes.reduce((sum, p) => sum + (p.guest_count ?? 1), 0);
}

export function computeStats(passes: CustomerPass[]) {

  const now = Date.now();

  const today = todayYmd();

  const upcoming = passes.filter((p) => isUpcomingPass(p, now));

  const todayPasses = upcoming.filter((p) => passBookingDate(p) === today);

  const nextToday = todayPasses.sort((a, b) => passStart(a).getTime() - passStart(b).getTime())[0];

  const nextUpcoming = upcoming.sort((a, b) => passStart(a).getTime() - passStart(b).getTime())[0];

  const activeCount = passes.filter((p) => isPassActive(p, now)).length;

  const bookedPct =

    passes.length === 0 ? 0 : Math.round((upcoming.length / passes.length) * 100);

  return { upcoming, todayPasses, nextToday, nextUpcoming, activeCount, bookedPct };

}



export function weekDaysAround(selected: string): Date[] {

  const anchor = parseYmd(selected);

  const start = startOfWeek(anchor, { weekStartsOn: 1 });

  const end = endOfWeek(anchor, { weekStartsOn: 1 });

  return eachDayOfInterval({ start, end });

}



export function formatTimeRange(p: CustomerPass): string {
  return formatSlotTimeRange(passStart(p), passEnd(p));
}

export function formatSlotTime(p: CustomerPass): string {
  const end = passEnd(p);
  if (end) return formatSlotTimeRange(passStart(p), end);
  return formatSlotTimePart(passStart(p));
}



export function passesOnDate(passes: CustomerPass[], ymd: string): CustomerPass[] {

  return passes

    .filter((p) => passBookingDate(p) === ymd)

    .sort((a, b) => passStart(a).getTime() - passStart(b).getTime());

}



export function upcomingDatePills(passes: CustomerPass[], limit = 7): string[] {

  const now = todayYmd();

  const dates = new Set<string>();

  for (const p of passes) {

    const d = passBookingDate(p);

    if (d >= now && isUpcomingPass(p)) dates.add(d);

  }

  return [...dates].sort().slice(0, limit);

}



/** Timeline day view: 8 AM–10 PM, one label row every 2 hours (must match customer-timeline-tab). */
export const TIMELINE_START_HOUR = 8;
export const TIMELINE_END_HOUR = 22;
export const TIMELINE_ROW_PX = 72;
export const TIMELINE_ROW_MINUTES = 120;
export const TIMELINE_PX_PER_MINUTE = TIMELINE_ROW_PX / TIMELINE_ROW_MINUTES;

export function timelineAxisHours(): number[] {
  const hours: number[] = [];
  for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h += 2) {
    hours.push(h);
  }
  return hours;
}

export function timelineTrackHeightPx(): number {
  return timelineAxisHours().length * TIMELINE_ROW_PX;
}

export function timelineHours(): number[] {
  return Array.from({ length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 }, (_, i) => i + TIMELINE_START_HOUR);
}

export function blockStyle(p: CustomerPass, dayStartHour = TIMELINE_START_HOUR) {
  const start = passStart(p);
  const end = passEnd(p);
  const topMin = (start.getHours() - dayStartHour) * 60 + start.getMinutes();
  const durMin = Math.max(30, (end.getTime() - start.getTime()) / 60000);

  return {
    top: topMin * TIMELINE_PX_PER_MINUTE,
    height: durMin * TIMELINE_PX_PER_MINUTE,
  };
}



export function statusLabel(p: CustomerPass, now: Date | number = Date.now()): string {

  if (p.liveStatus === "Inside") return "Checked in";

  if (!isPassActive(p, now)) return "Expired";

  if (p.liveStatus === "Active") return "Confirmed";

  if (p.liveStatus === "Exited") return "Completed";

  return p.liveStatus;

}



export function isPastBookingDate(ymd: string): boolean {
  return ymd < todayYmd();
}



export function dateLabel(ymd: string): string {

  const d = parseYmd(ymd);

  if (isToday(d)) return "Today";

  return format(d, "EEE, MMM d");

}



export function shortDateLabel(ymd: string): string {

  return format(parseYmd(ymd), "MMM d");

}



export function passesInWeek(passes: CustomerPass[], weekStart: Date): string[] {

  const end = endOfWeek(weekStart, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: weekStart, end });

  return days

    .map((d) => format(d, "yyyy-MM-dd"))

    .filter((ymd) => passes.some((p) => passBookingDate(p) === ymd));

}


