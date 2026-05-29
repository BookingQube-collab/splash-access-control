import { addDays } from "date-fns";
import { parseYmd, todayYmd } from "@/lib/utils";

/** Local calendar day [start, end) as ISO timestamps for timestamptz filters. */
export function localCalendarDayBoundsIso(ymd: string = todayYmd()): {
  startIso: string;
  endIso: string;
} {
  const start = parseYmd(ymd);
  const end = addDays(start, 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Inclusive local calendar range [dateFrom, dateTo] as half-open [startIso, endIso). */
export function localCalendarRangeBoundsIso(
  dateFrom?: string,
  dateTo?: string,
): { startIso?: string; endIso?: string } {
  let startIso: string | undefined;
  let endIso: string | undefined;
  if (dateFrom) {
    startIso = parseYmd(dateFrom).toISOString();
  }
  if (dateTo) {
    endIso = addDays(parseYmd(dateTo), 1).toISOString();
  }
  return { startIso, endIso };
}
