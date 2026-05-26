"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown } from "lucide-react";
import { type DayButtonProps } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  allowedBookingDates,
  cn,
  formatYmd,
  parseYmd,
  todayYmd,
} from "@/lib/utils";

function monthStartsBetween(startYmd: string, endYmd: string): Date[] {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  const months: Date[] = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    months.push(new Date(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return months;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function PosPickSlotSection({
  eventStart,
  eventEnd,
  selectedDate,
  onSelectDate,
  onPrefetchDate,
  daySales,
  ctaLabel,
  blocked,
  blockReason,
  onBook,
}: {
  eventStart: string;
  eventEnd: string;
  selectedDate?: string;
  onSelectDate: (d: string) => void;
  onPrefetchDate?: (d: string) => void;
  daySales?: number;
  ctaLabel: string;
  blocked: boolean;
  blockReason: string;
  onBook: () => void;
}) {
  const today = todayYmd();
  const { dates, allowedStart, allowedEnd } = useMemo(
    () => allowedBookingDates(eventStart, eventEnd, today),
    [eventStart, eventEnd, today],
  );
  const availableSet = useMemo(() => new Set(dates), [dates]);
  const selected = selectedDate ? parseYmd(selectedDate) : undefined;
  const monthOptions = useMemo(
    () => monthStartsBetween(allowedStart, allowedEnd),
    [allowedStart, allowedEnd],
  );

  const [displayMonth, setDisplayMonth] = useState<Date>(() => {
    if (selected) return new Date(selected.getFullYear(), selected.getMonth(), 1);
    return monthOptions[0] ?? new Date();
  });

  useEffect(() => {
    if (!selectedDate) return;
    const d = parseYmd(selectedDate);
    setDisplayMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [selectedDate]);

  const selectedLabel = selected
    ? selected.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const soldCount = daySales ?? 0;
  const displayMonthKey = monthKey(displayMonth);

  return (
    <div className="pos-pick-slot-calendar-card flex w-full min-h-0 flex-col">
      <div className="pos-pick-slot-toolbar flex shrink-0 items-center justify-end gap-3">
        <span className="pos-pick-slot-sold-pill inline-flex shrink-0 items-center rounded-full bg-[#e6f7f8] px-3.5 py-1.5 text-sm font-bold text-[#007a87]">
          {soldCount} sold
        </span>

        <div className="relative min-w-0">
          <CalendarDays
            className="pointer-events-none absolute left-3.5 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#00a8b5]"
            aria-hidden
          />
          <ChevronDown
            className="pointer-events-none absolute right-3.5 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#5a7a80]"
            aria-hidden
          />
          <select
            aria-label="Choose month"
            value={displayMonthKey}
            onChange={(e) => {
              const picked = monthOptions.find((m) => monthKey(m) === e.target.value);
              if (picked) setDisplayMonth(picked);
            }}
            className="pos-month-select h-11 min-w-[11.5rem] max-w-[13rem] cursor-pointer appearance-none truncate rounded-xl border border-[#ddeaf0] bg-white py-0 pl-10 pr-10 text-sm font-bold text-[#0b2b44] shadow-none outline-none focus-visible:ring-2 focus-visible:ring-[#00a8b5]/30"
          >
            {monthOptions.map((m) => (
              <option key={monthKey(m)} value={monthKey(m)}>
                {m.toLocaleDateString([], { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pos-month-calendar shrink-0">
        <Calendar
          mode="single"
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          selected={selected}
          onSelect={(d) => {
            if (!d) return;
            onSelectDate(formatYmd(d));
          }}
          onDayMouseEnter={(d) => {
            const ds = formatYmd(d);
            if (availableSet.has(ds)) onPrefetchDate?.(ds);
          }}
          disabled={(d) => {
            const ds = formatYmd(d);
            if (ds < allowedStart || ds > allowedEnd) return true;
            return (
              d.getMonth() !== displayMonth.getMonth() ||
              d.getFullYear() !== displayMonth.getFullYear()
            );
          }}
          modifiers={{
            available: (d) => availableSet.has(formatYmd(d)),
          }}
          showOutsideDays
          hideNavigation
          formatters={{
            formatWeekdayName: (date) =>
              date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
          }}
          className="w-full bg-transparent p-0"
          classNames={{
            root: "w-full",
            months: "w-full",
            month: "pos-cal-month w-full",
            month_caption: "hidden",
            nav: "hidden",
            caption_label: "hidden",
            weekdays: "pos-cal-weekdays flex w-full",
            weekday: "pos-cal-weekday flex-1 text-center",
            week: "pos-cal-week flex w-full",
            day: "pos-cal-day relative flex flex-1 items-start justify-center p-0",
            outside: "text-[#b9c7cf]",
            disabled: "text-[#b9c7cf] opacity-100",
            today: "",
          }}
          components={{
            MonthCaption: () => <></>,
            Nav: () => <></>,
            DayButton: PosCalendarDayButton,
          }}
        />
      </div>

      <div className="pos-pick-slot-footer flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 sm:flex-none sm:shrink-0">
          <p className="pos-pick-slot-selected-label font-medium text-[#8aa3a8]">Selected date</p>
          <p className="pos-pick-slot-selected-value font-display font-bold text-[#00a8b5]">
            {selectedLabel}
          </p>
        </div>

        <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:min-w-[220px] sm:max-w-[min(100%,280px)] sm:items-end sm:justify-end">
          <button
            type="button"
            onClick={onBook}
            disabled={blocked}
            aria-disabled={blocked}
            aria-describedby={blocked && blockReason ? "pos-pick-slot-block-hint" : undefined}
            className="pos-pick-slot-cta group inline-flex w-full shrink-0 items-center justify-center gap-2 bg-gradient-to-r from-[#00b4c4] to-[#00a8b5] px-4 font-bold text-white shadow-[0_10px_28px_-8px_rgba(0,168,181,0.4)] transition hover:from-[#00a8b5] hover:to-[#009199] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-white" aria-hidden />
            <span className="truncate">{ctaLabel}</span>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-white transition group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
          {blocked && blockReason ? (
            <p
              id="pos-pick-slot-block-hint"
              className="text-center text-[11px] font-medium leading-tight text-[#8aa3a8] sm:text-right"
            >
              {blockReason}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PosCalendarDayButton({ day, modifiers, className, ...props }: DayButtonProps) {
  const available = modifiers.available;
  const isSelected =
    modifiers.selected &&
    !modifiers.range_start &&
    !modifiers.range_end &&
    !modifiers.range_middle;
  const isInactive = (modifiers.outside || modifiers.disabled) && !isSelected;

  return (
    <button
      type="button"
      data-selected-single={isSelected}
      className={cn(
        "pos-cal-day-btn mx-auto flex w-full max-w-[3rem] flex-col items-center border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a8b5]/35",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "pos-cal-day-num flex items-center justify-center rounded-full tabular-nums",
          isSelected && "pos-cal-day-num--selected",
          isInactive && "pos-cal-day-num--inactive",
          !isSelected && !isInactive && "hover:bg-[#eefafb]",
        )}
      >
        {day.date.getDate()}
      </span>
      {available && !modifiers.disabled && (
        <span
          className={cn(
            "pos-cal-avail-dot shrink-0 rounded-full bg-[#00a8b5]",
            isSelected && "bg-[#00a8b5]",
          )}
          aria-hidden
        />
      )}
    </button>
  );
}
