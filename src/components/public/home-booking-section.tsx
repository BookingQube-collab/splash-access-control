"use client";

import Link from "next/link";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { formatSlotTimeRange, isSlotPastForDate, slotUnavailableLabel } from "@/lib/slot-time";
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  QrCode,
  Sparkles,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  PublicRegisterDialog,
  type PublicRegisterSuccess,
} from "@/components/public/public-register-dialog";
import { MY_PASSES_QUERY_KEY } from "@/hooks/use-my-passes";
import { usePublicPassReady } from "@/hooks/use-public-pass-ready";
import { getPublicEvent, getPublicSlotsForDate } from "@/lib/summersplash.functions";
import {
  allowedBookingDates,
  cn,
  eventDateRange,
  formatYmd,
  parseYmd,
  todayYmd,
} from "@/lib/utils";

const HOME_EVENT_META_STALE_MS = 60_000;
const HOME_EVENT_SLOTS_STALE_MS = 15_000;
const VISIBLE_DATE_COUNT = 4;

type PublicEventPayload = Awaited<ReturnType<typeof getPublicEvent>>;

export function HomeBookingSection() {
  const queryClient = useQueryClient();
  const { onRegisterSuccess: showPassReady, PassReadyModal } = usePublicPassReady();
  const [bookingDate, setBookingDate] = useState<string | undefined>();
  const [dateOffset, setDateOffset] = useState(0);
  const [slotId, setSlotId] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: meta, isLoading: metaLoading } = useQuery<PublicEventPayload>({
    queryKey: ["home-event-meta"],
    queryFn: () => getPublicEvent(),
    staleTime: HOME_EVENT_META_STALE_MS,
    refetchInterval: 30_000,
  });

  const event = meta?.event;
  const defaultDate = meta?.bookingDate;
  const resolvedDate = bookingDate ?? defaultDate;

  const {
    data: slotsData,
    isFetching: slotsFetching,
    refetch,
  } = useQuery<PublicEventPayload>({
    queryKey: ["home-event-slots", event?.id, resolvedDate],
    queryFn: () => getPublicSlotsForDate({ eventId: event!.id, date: resolvedDate! }),
    enabled: Boolean(event?.id && resolvedDate),
    initialData:
      event?.id && resolvedDate === meta?.bookingDate && meta?.slots
        ? meta
        : undefined,
    placeholderData: keepPreviousData,
    staleTime: HOME_EVENT_SLOTS_STALE_MS,
    refetchInterval: 8_000,
  });

  const activeDate = resolvedDate;
  const slots = slotsData?.slots ?? [];

  const prefetchDate = useCallback(
    (d: string) => {
      if (!event?.id) return;
      void queryClient.prefetchQuery({
        queryKey: ["home-event-slots", event.id, d],
        queryFn: () => getPublicSlotsForDate({ eventId: event.id, date: d }),
        staleTime: HOME_EVENT_SLOTS_STALE_MS,
      });
    },
    [event?.id, queryClient],
  );

  useEffect(() => {
    if (!event || !resolvedDate) return;
    const { dates } = allowedBookingDates(event.start_date, event.end_date);
    const idx = dates.indexOf(resolvedDate);
    if (idx < 0) return;
    for (let i = Math.max(0, idx - 1); i <= Math.min(dates.length - 1, idx + 2); i++) {
      prefetchDate(dates[i]!);
    }
  }, [event, resolvedDate, prefetchDate]);

  const range = useMemo(
    () => (event ? eventDateRange(event) : { start: todayYmd(), end: todayYmd() }),
    [event],
  );

  const { allowedStart, allowedEnd, dates: allDates } = useMemo(
    () => allowedBookingDates(range.start, range.end),
    [range.start, range.end],
  );

  const visibleDates = useMemo(
    () => allDates.slice(dateOffset, dateOffset + VISIBLE_DATE_COUNT),
    [allDates, dateOffset],
  );

  const maxDateOffset = Math.max(0, allDates.length - VISIBLE_DATE_COUNT);

  useEffect(() => {
    visibleDates.forEach((d) => prefetchDate(d));
  }, [visibleDates, prefetchDate]);

  useEffect(() => {
    if (!activeDate || allDates.length === 0) return;
    const idx = allDates.indexOf(activeDate);
    if (idx >= 0 && (idx < dateOffset || idx >= dateOffset + VISIBLE_DATE_COUNT)) {
      setDateOffset(Math.max(0, Math.min(idx, maxDateOffset)));
    }
  }, [activeDate, allDates, dateOffset, maxDateOffset]);

  const popularSlotId = useMemo(() => {
    const open = slots.filter(
      (s) => s.remaining > 0 && (!activeDate || !isSlotPastForDate(s, activeDate)),
    );
    if (open.length === 0) return null;
    const night = open.find((s) => /night|evening|sunset/i.test(s.name));
    if (night) return night.id;
    const byFill = [...open].sort((a, b) => {
      const fa = (a.capacity - a.remaining) / Math.max(1, a.capacity);
      const fb = (b.capacity - b.remaining) / Math.max(1, b.capacity);
      return fb - fa;
    });
    return byFill[0]?.id ?? null;
  }, [slots, activeDate]);

  const dateLabel = activeDate ? format(parseYmd(activeDate), "EEEE, MMMM d") : "—";
  const shortDate = activeDate ? format(parseYmd(activeDate), "EEE d MMM") : "—";

  const canPrev = dateOffset > 0;
  const canNext = dateOffset < maxDateOffset;

  const goToDateWindow = (nextOffset: number) => {
    const clamped = Math.max(0, Math.min(maxDateOffset, nextOffset));
    setDateOffset(clamped);
    const idx = activeDate ? allDates.indexOf(activeDate) : -1;
    const stillVisible =
      idx >= 0 && idx >= clamped && idx < clamped + VISIBLE_DATE_COUNT;
    if (!stillVisible) {
      const nextDate = allDates[clamped];
      if (nextDate) {
        setBookingDate(nextDate);
        setSlotId("");
      }
    }
  };

  const dateStripGridCols =
    visibleDates.length >= 4
      ? "sm:grid-cols-4"
      : visibleDates.length === 3
        ? "sm:grid-cols-3"
        : visibleDates.length === 2
          ? "sm:grid-cols-2"
          : "sm:grid-cols-1";

  const selectedSlot = slots.find((s) => s.id === slotId);
  const selectedSlotIndex = selectedSlot ? slots.findIndex((s) => s.id === slotId) : -1;

  useEffect(() => {
    if (!slotId || !activeDate) return;
    const s = slots.find((x) => x.id === slotId);
    if (!s || s.remaining <= 0 || isSlotPastForDate(s, activeDate)) setSlotId("");
  }, [slots, slotId, activeDate]);
  const canBook = Boolean(
    activeDate &&
      selectedSlot &&
      selectedSlot.remaining > 0 &&
      !isSlotPastForDate(selectedSlot, activeDate),
  );

  const onBook = () => {
    if (!canBook) return;
    setDetailsOpen(true);
  };

  const onRegisterSuccess = (result: PublicRegisterSuccess) => {
    setSlotId("");
    void queryClient.invalidateQueries({ queryKey: [MY_PASSES_QUERY_KEY] });
    showPassReady(result);
  };

  return (
    <section id="booking" className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="rounded-[28px] border border-white/70 bg-white/72 p-6 shadow-[0_24px_60px_-20px_rgba(10,74,82,0.14)] backdrop-blur-md sm:p-8 lg:p-10">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-[#0a4a52] sm:text-3xl">
            Book your experience
          </h2>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={!event || allowedStart > allowedEnd}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#dce8ea] bg-[#faf8f4] px-4 py-2 text-sm font-semibold text-brand-teal transition hover:bg-[#eef6f7] disabled:opacity-40"
              >
                <Calendar className="h-4 w-4" />
                Calendar view
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              {activeDate && (
                <CalendarPicker
                  mode="single"
                  selected={parseYmd(activeDate)}
                  defaultMonth={parseYmd(activeDate)}
                  onSelect={(d) => d && setBookingDate(formatYmd(d))}
                  disabled={(d) => {
                    const ds = formatYmd(d);
                    return ds < allowedStart || ds > allowedEnd;
                  }}
                  initialFocus
                  className="pointer-events-auto p-3"
                />
              )}
            </PopoverContent>
          </Popover>
        </div>

        {metaLoading && !event ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[#5a7a80]">
            <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
            Loading availability…
          </div>
        ) : !event ? (
          <p className="py-12 text-center text-[#5a7a80]">
            No active event right now. Check back soon.
          </p>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.95fr)] xl:gap-6">
            {/* Column 1 — dates */}
            <div className="min-w-0">
              <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-[#5a7a80]">
                1. Pick a date
              </h3>
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous dates"
                  disabled={!canPrev}
                  onClick={() => goToDateWindow(dateOffset - VISIBLE_DATE_COUNT)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e8eef0] text-[#5a7a80] transition hover:border-brand-teal hover:text-brand-teal disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div
                  className={cn(
                    "min-w-0 flex-1",
                    visibleDates.length > 0 &&
                      cn(
                        "flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none sm:grid sm:gap-2 sm:overflow-visible",
                        dateStripGridCols,
                      ),
                  )}
                >
                  {visibleDates.length === 0 ? (
                    <p className="text-sm text-[#5a7a80]">No bookable dates.</p>
                  ) : (
                    visibleDates.map((d) => {
                      const dt = parseYmd(d);
                      const selected = d === activeDate;
                      const isToday = d === todayYmd();
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setBookingDate(d);
                            setSlotId("");
                          }}
                          className={cn(
                            "flex w-[4.75rem] shrink-0 snap-center flex-col items-center rounded-2xl border-2 px-2 py-3 transition sm:w-full sm:min-w-0",
                            selected
                              ? "border-brand-teal bg-[#e6f7f8] text-[#0a4a52] shadow-glow-aqua"
                              : "border-transparent bg-[#f3efe6] text-[#0a4a52]/80 ring-1 ring-[#e8eef0] hover:bg-[#eef6f7]",
                          )}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                            {dt.toLocaleDateString([], { weekday: "short" })}
                          </span>
                          <span className="font-display text-2xl font-extrabold leading-none tabular-nums">
                            {dt.getDate()}
                          </span>
                          {isToday && (
                            <span
                              className={cn(
                                "mt-1 text-[9px] font-bold uppercase tracking-wide",
                                selected ? "text-brand-teal" : "text-[#5a7a80]",
                              )}
                            >
                              Today
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Next dates"
                  disabled={!canNext}
                  onClick={() => goToDateWindow(dateOffset + VISIBLE_DATE_COUNT)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e8eef0] text-[#5a7a80] transition hover:border-brand-teal hover:text-brand-teal disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#dce8ea] bg-[#faf8f4] px-4 py-3.5 text-left transition hover:border-brand-teal/50 hover:bg-[#eef6f7]"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-teal shadow-sm">
                      <Calendar className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[#0a4a52]">
                        Flexible dates
                      </span>
                      <span className="text-xs text-[#5a7a80]">Open calendar to browse all days</span>
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  {activeDate && (
                    <CalendarPicker
                      mode="single"
                      selected={parseYmd(activeDate)}
                      defaultMonth={parseYmd(activeDate)}
                      onSelect={(d) => d && setBookingDate(formatYmd(d))}
                      disabled={(d) => {
                        const ds = formatYmd(d);
                        return ds < allowedStart || ds > allowedEnd;
                      }}
                      initialFocus
                      className="pointer-events-auto p-3"
                    />
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Column 2 — slots */}
            <div className="min-w-0 xl:border-l xl:border-[#e8eef0] xl:pl-6">
              <h3 className="mb-4 flex items-center justify-between font-display text-sm font-bold uppercase tracking-wide text-[#5a7a80]">
                <span>2. Pick a slot</span>
                {slotsFetching && (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin text-brand-teal"
                    aria-label="Updating availability"
                  />
                )}
              </h3>
              {slots.length === 0 ? (
                slotsFetching ? (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#e8eef0] bg-[#faf8f4] px-4 py-8 text-sm text-[#5a7a80]">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-teal" />
                    Loading slots…
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-[#e8eef0] bg-[#faf8f4] px-4 py-8 text-center text-sm text-[#5a7a80]">
                    No slots for this date yet.
                  </p>
                )
              ) : (
                <div
                  className={cn(
                    "flex max-h-[340px] flex-col gap-3 overflow-y-auto pr-1 transition-opacity",
                    slotsFetching && "opacity-80",
                  )}
                >
                  {slots.map((s) => {
                    const full = s.remaining <= 0;
                    const past =
                      activeDate != null && isSlotPastForDate(s, activeDate);
                    const unavailable = full || past;
                    const endedLabel =
                      past && activeDate
                        ? slotUnavailableLabel(s, activeDate)
                        : null;
                    const selected = slotId === s.id;
                    const popular = s.id === popularSlotId && !unavailable;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={unavailable}
                        onClick={() => !unavailable && setSlotId(s.id)}
                        className={cn(
                          "relative rounded-2xl border-2 p-4 text-left transition",
                          selected
                            ? "border-brand-teal bg-[#e6f7f8]/50 shadow-glow-aqua"
                            : "border-[#e8eef0] bg-white hover:border-brand-teal/40",
                          unavailable && "cursor-not-allowed opacity-50",
                        )}
                      >
                        {popular && (
                          <span className="absolute right-3 top-3 rounded-full bg-coral-gradient px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            Popular
                          </span>
                        )}
                        <div className="font-display font-bold text-[#0a4a52]">{s.name}</div>
                        <p className="mt-1 flex items-center gap-1 text-xs text-[#5a7a80]">
                          <Clock className="h-3 w-3" />
                          {formatSlotTimeRange(s.starts_at, s.ends_at)}
                        </p>
                        <p className="mt-2 text-xs font-medium">
                          {full ? (
                            <span className="text-[#ff7e67]">Sold out</span>
                          ) : past && endedLabel ? (
                            <span className="text-[#9ca3af]">{endedLabel}</span>
                          ) : (
                            <>
                              <span className="text-brand-teal">{s.remaining}</span>
                              <span className="text-[#5a7a80]"> spots left</span>
                            </>
                          )}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column 3 — review */}
            <div className="min-w-0 xl:border-l xl:border-[#e8eef0] xl:pl-6">
              <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-[#5a7a80]">
                3. Review &amp; continue
              </h3>
              <div className="rounded-2xl border border-[#e8eef0] bg-[#faf8f4] p-4">
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#5a7a80]">Date</dt>
                    <dd className="font-semibold text-[#0a4a52]">{shortDate}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#5a7a80]">Slot</dt>
                    <dd className="text-right font-semibold text-[#0a4a52]">
                      {selectedSlot?.name ?? "Select a slot"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#5a7a80]">Spots</dt>
                    <dd className="font-semibold text-brand-teal">
                      {selectedSlot && activeDate
                        ? isSlotPastForDate(selectedSlot, activeDate)
                          ? slotUnavailableLabel(selectedSlot, activeDate) ?? "Unavailable"
                          : selectedSlot.remaining > 0
                            ? `${selectedSlot.remaining} left`
                            : "Sold out"
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-4 flex gap-3 rounded-2xl border border-[#e8eef0] bg-white p-4 shadow-sm">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-teal/10 text-brand-teal">
                  <QrCode className="h-5 w-5" />
                </span>
                <div>
                  <p className="flex items-center gap-1.5 font-display text-sm font-bold text-[#0a4a52]">
                    <Sparkles className="h-3.5 w-3.5 text-[#ff9f68]" />
                    Digital pass included
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#5a7a80]">
                    Your QR pass is issued instantly after booking — show it at the gate on{" "}
                    {dateLabel}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onBook}
          disabled={!canBook}
          className="group mt-10 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-coral-gradient text-base font-bold text-white shadow-glow-sunset transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Book a slot
          <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
        </button>
        <p className="mt-4 text-center text-sm text-[#5a7a80]">
          Looking for full access?{" "}
          <Link href="/register" className="font-semibold text-brand-teal hover:underline">
            Open full registration
          </Link>
        </p>
      </div>

      <PublicRegisterDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        slot={selectedSlot}
        slotIndex={selectedSlotIndex}
        activeDate={activeDate}
        eventName={event?.name}
        onSuccess={onRegisterSuccess}
        onRefetch={() => void refetch()}
      />
      {PassReadyModal}
    </section>
  );
}
