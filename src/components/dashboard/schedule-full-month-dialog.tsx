"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DashboardSchedulePayload } from "@/lib/dashboard.types";
import { cn, formatYmd, parseYmd } from "@/lib/utils";
import { SlotGridRow } from "@/components/dashboard/schedule-grid";

function monthStartsBetween(startYmd: string, endYmd: string): Date[] {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  const months: Date[] = [];
  let cursor = startOfMonth(start);
  const last = startOfMonth(end);
  while (cursor <= last) {
    months.push(new Date(cursor));
    cursor = addMonths(cursor, 1);
  }
  return months;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function ScheduleFullMonthDialog({
  open,
  onOpenChange,
  schedule,
  countsLoading,
  monthStart,
  onMonthChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: DashboardSchedulePayload | undefined;
  countsLoading?: boolean;
  monthStart: string;
  onMonthChange: (monthStart: string) => void;
}) {
  const event = schedule?.event;
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(parseYmd(monthStart)));

  useEffect(() => {
    if (!open) return;
    setDisplayMonth(startOfMonth(parseYmd(monthStart)));
  }, [open, monthStart]);

  const monthOptions = useMemo(() => {
    if (!event) return [];
    return monthStartsBetween(event.start_date, event.end_date);
  }, [event]);

  const usageByKey = useMemo(
    () =>
      new Map(
        (schedule?.daySlotUsage ?? []).map((u) => [`${u.date}:${u.slot_id}`, u]),
      ),
    [schedule?.daySlotUsage],
  );

  const regsByCell = useMemo(() => {
    const map = new Map<string, import("@/lib/dashboard.types").DashboardRegistrationCard[]>();
    for (const r of schedule?.registrations ?? []) {
      const key = `${r.booking_date}:${r.slot_id}`;
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return map;
  }, [schedule?.registrations]);

  const monthDays = schedule?.weekDays ?? [];
  const slots = schedule?.slots ?? [];
  const rangeLabel = format(displayMonth, "MMMM yyyy");

  const prevMonthEnd = formatYmd(endOfMonth(subMonths(displayMonth, 1)));
  const nextMonthStart = formatYmd(startOfMonth(addMonths(displayMonth, 1)));
  const canPrevMonth = event != null && prevMonthEnd >= event.start_date;
  const canNextMonth = event != null && nextMonthStart <= event.end_date;

  const syncMonth = (d: Date) => {
    setDisplayMonth(d);
    onMonthChange(formatYmd(d));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/40"
        className="fixed inset-0 left-0 top-0 z-50 flex h-[100dvh] w-screen max-h-none max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-[#e2e8f0] p-0 shadow-none data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:rounded-none"
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-[#e2e8f0] px-5 py-4 pr-14 sm:px-6 sm:pr-16">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <DialogTitle className="font-display text-xl font-bold text-[#134e4a]">
                Full schedule
              </DialogTitle>
              <p className="mt-0.5 text-sm text-[#64748b]">
                {event?.name ?? "No active event"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-0.5 rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-1 py-0.5 shadow-sm">
                <button
                  type="button"
                  disabled={!canPrevMonth}
                  onClick={() => syncMonth(subMonths(displayMonth, 1))}
                  className="grid h-9 w-9 place-items-center rounded-full text-[#134e4a] transition hover:bg-white disabled:opacity-30"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[7.5rem] px-2 text-center text-sm font-semibold text-[#134e4a] tabular-nums">
                  {rangeLabel}
                </span>
                <button
                  type="button"
                  disabled={!canNextMonth}
                  onClick={() => syncMonth(addMonths(displayMonth, 1))}
                  className="grid h-9 w-9 place-items-center rounded-full text-[#134e4a] transition hover:bg-white disabled:opacity-30"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {monthOptions.length > 1 && (
                <div className="relative">
                  <CalendarDays
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0d9488]"
                    aria-hidden
                  />
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]"
                    aria-hidden
                  />
                  <select
                    aria-label="Choose month"
                    value={monthKey(displayMonth)}
                    onChange={(e) => {
                      const picked = monthOptions.find((m) => monthKey(m) === e.target.value);
                      if (picked) syncMonth(picked);
                    }}
                    className="h-10 min-w-[11rem] cursor-pointer appearance-none rounded-full border border-[#e2e8f0] bg-white py-0 pl-9 pr-9 text-sm font-semibold text-[#134e4a] outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/20"
                  >
                    {monthOptions.map((m) => (
                      <option key={monthKey(m)} value={monthKey(m)}>
                        {m.toLocaleDateString([], { month: "long", year: "numeric" })}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {countsLoading && (
                <span className="text-xs text-[#64748b]">Updating…</span>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
          {!schedule ? (
            <div className="flex flex-1 items-center justify-center py-16 text-center text-sm text-[#64748b]">
              Loading schedule…
            </div>
          ) : slots.length === 0 || monthDays.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl bg-[#f8fafc] px-6 py-16 text-center text-sm text-[#64748b]">
              No slots or dates in this month. Choose another month or configure slots in admin.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <div
                className="grid h-full min-w-full gap-px rounded-2xl border border-[#e2e8f0] bg-[#e2e8f0]"
                style={{
                  gridTemplateColumns: `minmax(200px, 240px) repeat(${monthDays.length}, minmax(80px, 1fr))`,
                }}
              >
                <div className="bg-[#f8fafc] p-3" />
                {monthDays.map((d) => {
                  const isToday = d === formatYmd(new Date());
                  return (
                    <div
                      key={d}
                      className={cn(
                        "p-2 text-center text-xs font-semibold uppercase tracking-wide",
                        isToday ? "bg-[#ccfbf1] text-[#0f766e]" : "bg-[#f8fafc] text-[#475569]",
                      )}
                    >
                      <div>{format(parseYmd(d), "EEE")}</div>
                      <div
                        className={cn(
                          "mt-0.5 font-display text-base tabular-nums",
                          isToday && "font-extrabold",
                        )}
                      >
                        {format(parseYmd(d), "d")}
                      </div>
                    </div>
                  );
                })}
                {slots.map((slot) => (
                  <SlotGridRow
                    key={slot.id}
                    slot={slot}
                    weekDays={monthDays}
                    usageByKey={usageByKey}
                    regsByCell={regsByCell}
                    premium
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#e2e8f0] bg-[#f8fafc] px-5 py-3 sm:px-6">
          <div className="flex items-start gap-2 text-xs text-[#64748b]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#94a3b8]" aria-hidden />
            <p>
              Bookings show total guests per slot window. Empty cells mean no reservations. Use month
              arrows or the month picker to navigate the event calendar.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
