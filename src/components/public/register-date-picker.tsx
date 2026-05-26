"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  allowedBookingDates,
  cn,
  formatYmd,
  monthsSpanBookableRange,
  parseYmd,
  todayYmd,
  ymdMonthIndex,
} from "@/lib/utils";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function MonthFlourish({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 56 10"
      className={cn("h-2.5 w-12 shrink-0 text-[#00a8b5]/40 sm:w-14", className)}
      aria-hidden
    >
      <path
        d="M0 5 C4 2 8 8 14 5 S24 2 28 5 S38 8 44 5 S52 2 56 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RegisterDatePicker({
  eventStart,
  eventEnd,
  selected,
  onSelect,
  fullyBookedDates = [],
}: {
  eventStart: string;
  eventEnd: string;
  selected: string;
  onSelect: (ymd: string) => void;
  fullyBookedDates?: string[];
}) {
  const today = todayYmd();
  const { allowedStart, allowedEnd, dates: bookableDates } = useMemo(
    () => allowedBookingDates(eventStart, eventEnd, today),
    [eventStart, eventEnd, today],
  );

  const bookableSet = useMemo(() => new Set(bookableDates), [bookableDates]);
  const fullyBookedSet = useMemo(() => new Set(fullyBookedDates), [fullyBookedDates]);

  const [displayMonth, setDisplayMonth] = useState(() =>
    startOfMonth(parseYmd(selected)),
  );

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(displayMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [displayMonth]);

  if (allowedStart > allowedEnd) {
    return (
      <p className="rounded-2xl border border-[#e5e7eb] bg-[#faf8f4] px-4 py-6 text-sm text-[#5a7a80]">
        No bookable dates remaining for this event.
      </p>
    );
  }

  const monthLabel = format(displayMonth, "MMMM yyyy").toUpperCase();
  const showNav = monthsSpanBookableRange(allowedStart, allowedEnd);
  const firstBookableMonth = ymdMonthIndex(allowedStart);
  const lastBookableMonth = ymdMonthIndex(allowedEnd);
  const displayMonthIndex =
    displayMonth.getFullYear() * 12 + displayMonth.getMonth();
  const canGoPrev = displayMonthIndex > firstBookableMonth;
  const canGoNext = displayMonthIndex < lastBookableMonth;

  const goPrevMonth = () => {
    if (!canGoPrev) return;
    setDisplayMonth((m) => {
      const next = subMonths(m, 1);
      const nextIdx = next.getFullYear() * 12 + next.getMonth();
      return nextIdx < firstBookableMonth ? m : next;
    });
  };

  const goNextMonth = () => {
    if (!canGoNext) return;
    setDisplayMonth((m) => {
      const next = addMonths(m, 1);
      const nextIdx = next.getFullYear() * 12 + next.getMonth();
      return nextIdx > lastBookableMonth ? m : next;
    });
  };

  return (
    <div className="register-calendar w-full" aria-label="Pick a date">
      <div
        className={cn(
          "mb-4 flex w-full items-center gap-2 sm:gap-3",
          showNav ? "justify-between" : "justify-center",
        )}
      >
        {showNav ? (
          <button
            type="button"
            onClick={goPrevMonth}
            disabled={!canGoPrev}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a8b5] text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00a8b5]/40",
              canGoPrev
                ? "hover:brightness-110"
                : "cursor-not-allowed opacity-40",
            )}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          </button>
        ) : null}

        <div
          className={cn(
            "flex min-w-0 items-center justify-center gap-2 sm:gap-3",
            showNav && "flex-1",
          )}
        >
          <MonthFlourish />
          <p className="truncate font-display text-sm font-bold uppercase tracking-[0.16em] text-[#0a4a52] sm:text-[0.9rem] sm:tracking-[0.2em]">
            {monthLabel}
          </p>
          <MonthFlourish className="scale-x-[-1]" />
        </div>

        {showNav ? (
          <button
            type="button"
            onClick={goNextMonth}
            disabled={!canGoNext}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a8b5] text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00a8b5]/40",
              canGoNext
                ? "hover:brightness-110"
                : "cursor-not-allowed opacity-40",
            )}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-7 gap-x-0.5 gap-y-1 sm:gap-x-1 sm:gap-y-1.5">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="pb-1 text-center text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#9ca3af] sm:text-[0.68rem]"
          >
            {label}
          </div>
        ))}

        {calendarDays.map((date) => {
          const ds = formatYmd(date);
          const inMonth = isSameMonth(date, displayMonth);
          const isPast = ds < today;
          const inRange = ds >= allowedStart && ds <= allowedEnd;
          const isDisabled = isPast || !inRange;
          const isSelected = ds === selected;
          const isToday = ds === today;
          const isAvailable = bookableSet.has(ds) && !fullyBookedSet.has(ds);
          const isFull = fullyBookedSet.has(ds);
          const showDot = inRange && !isPast && !isSelected;

          return (
            <button
              key={ds}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect(ds)}
              className={cn(
                "register-cal-day relative flex aspect-square w-full min-h-[2.75rem] max-h-[3.25rem] flex-col items-center justify-center rounded-xl border-0 bg-transparent p-0.5 sm:min-h-[3rem]",
                "focus:outline-none focus-visible:ring-0",
                isSelected && "bg-[#00a8b5] text-white",
                !isSelected && inMonth && !isPast && !isDisabled && "text-[#0a4a52]",
                !isSelected && (isPast || !inMonth) && "text-[#d1d5db]",
                isDisabled && "cursor-not-allowed",
                isDisabled &&
                  inMonth &&
                  !isSelected &&
                  !isPast &&
                  "opacity-40",
                !isDisabled && !isSelected && "hover:bg-[#00a8b5]/8",
              )}
              aria-label={format(date, "EEEE, MMMM d, yyyy")}
              aria-pressed={isSelected}
            >
              <span
                className={cn(
                  "font-display text-sm font-semibold leading-none",
                  isSelected && "text-white",
                  !isSelected && isPast && inMonth && "text-[#d1d5db]",
                )}
              >
                {date.getDate()}
              </span>

              {isSelected && isToday && (
                <span className="mt-0.5 text-[7px] font-bold uppercase leading-none tracking-[0.14em] text-white/95">
                  TODAY
                </span>
              )}

              {showDot && (
                <span
                  className={cn(
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                    isFull ? "bg-[#9ca3af]" : isAvailable ? "bg-[#00a8b5]" : "bg-transparent",
                  )}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
