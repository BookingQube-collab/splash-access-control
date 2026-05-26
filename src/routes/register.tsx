"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getPublicEvent } from "@/lib/summersplash.functions";
import { MY_PASSES_QUERY_KEY } from "@/hooks/use-my-passes";
import { usePublicPassReady } from "@/hooks/use-public-pass-ready";
import { toast } from "sonner";
import { isSlotPastForDate } from "@/lib/slot-time";
import {
  allowedBookingDates,
  clampBookingDate,
  eventDateRange,
  todayYmd,
} from "@/lib/utils";
import { RegisterBeachLayout } from "@/components/public/register-beach-layout";
import { RegisterHero } from "@/components/public/register-hero";
import { RegisterBookingCard } from "@/components/public/register-booking-card";
import {
  PublicRegisterDialog,
  type PublicRegisterSuccess,
} from "@/components/public/public-register-dialog";

type PublicEventData = Awaited<ReturnType<typeof getPublicEvent>>;

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { onRegisterSuccess: showPassReady, PassReadyModal } = usePublicPassReady();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const slotParam = searchParams.get("slot") ?? "";

  const [bookingDate, setBookingDate] = useState<string | undefined>(
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined,
  );
  const [slotId, setSlotId] = useState(slotParam);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const userPickedDateRef = useRef(false);
  const lastEventIdRef = useRef<string | null>(null);
  const [fullyBookedCache, setFullyBookedCache] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = useQuery<PublicEventData>({
    queryKey: ["public-event", bookingDate ?? "auto"],
    queryFn: () => getPublicEvent(bookingDate ? { date: bookingDate } : {}),
    placeholderData: keepPreviousData,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const defaultBookingDate = useMemo(() => {
    if (!data?.event) return undefined;
    const { start, end } = eventDateRange(data.event);
    return clampBookingDate(todayYmd(), start, end);
  }, [data?.event]);

  const activeDate = bookingDate ?? data?.bookingDate ?? defaultBookingDate;

  useEffect(() => {
    if (!data?.event || !defaultBookingDate) return;
    const eventId = data.event.id;
    const eventChanged =
      lastEventIdRef.current !== null && lastEventIdRef.current !== eventId;
    lastEventIdRef.current = eventId;

    const { start, end } = eventDateRange(data.event);
    const { allowedStart, allowedEnd } = allowedBookingDates(start, end);

    const clampParam = (d: string) => {
      if (d < allowedStart) return allowedStart;
      if (d > allowedEnd) return allowedEnd;
      return d;
    };

    if (eventChanged) {
      userPickedDateRef.current = false;
      setBookingDate(defaultBookingDate);
      setSlotId("");
      setDetailsOpen(false);
      return;
    }

    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && !userPickedDateRef.current) {
      const clamped = clampParam(dateParam);
      if (bookingDate !== clamped) setBookingDate(clamped);
      return;
    }

    if (!userPickedDateRef.current && bookingDate === undefined) {
      setBookingDate(defaultBookingDate);
    }
  }, [data?.event, defaultBookingDate, bookingDate, dateParam]);

  useEffect(() => {
    if (slotParam) setSlotId(slotParam);
  }, [slotParam]);

  useEffect(() => {
    if (!activeDate || !data?.slots?.length) return;
    const allFull = data.slots.every((s) => s.remaining <= 0);
    setFullyBookedCache((prev) => {
      const next = new Set(prev);
      if (allFull) next.add(activeDate);
      else next.delete(activeDate);
      return next;
    });
  }, [activeDate, data?.slots]);

  const syncUrl = useCallback(
    (date: string, slot?: string) => {
      const params = new URLSearchParams();
      params.set("date", date);
      if (slot) params.set("slot", slot);
      router.replace(`/register?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const onSelectDate = (d: string) => {
    userPickedDateRef.current = true;
    setBookingDate(d);
    setSlotId("");
    setDetailsOpen(false);
    syncUrl(d);
  };

  const onSelectSlot = (id: string) => {
    setSlotId(id);
    if (activeDate) syncUrl(activeDate, id);
  };

  const onRegisterSuccess = (result: PublicRegisterSuccess) => {
    setSlotId("");
    setDetailsOpen(false);
    void queryClient.invalidateQueries({ queryKey: [MY_PASSES_QUERY_KEY] });
    showPassReady(result);
  };

  const slots = data?.slots ?? [];
  const fullyBookedDates = useMemo(() => Array.from(fullyBookedCache), [fullyBookedCache]);

  const openDetails = () => {
    if (!slotId) {
      toast.error("Pick a slot first");
      return;
    }
    const picked = slots.find((s) => s.id === slotId);
    if (activeDate && picked && isSlotPastForDate(picked, activeDate)) {
      toast.error("This slot has ended. Choose another slot or date.");
      return;
    }
    setDetailsOpen(true);
  };

  return (
    <RegisterBeachLayout>
      {isLoading && !data ? (
        <div className="grid place-items-center py-32">
          <motion.div className="h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      ) : !data?.event ? (
        <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
          <div className="rounded-3xl border border-white/70 bg-white/95 p-10 text-center shadow-soft">
            <p className="text-muted-foreground">No active event right now. Check back soon.</p>
          </div>
        </main>
      ) : (
        <>
          <RegisterHero activeDate={activeDate} />
          {activeDate && (
            <RegisterBookingCard
              eventStart={data.event.start_date}
              eventEnd={data.event.end_date}
              activeDate={activeDate}
              onSelectDate={onSelectDate}
              fullyBookedDates={fullyBookedDates}
              slots={slots}
              slotId={slotId}
              onSelectSlot={onSelectSlot}
              onRegisterClick={openDetails}
            />
          )}
        </>
      )}

      <PublicRegisterDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        slot={data?.slots.find((s) => s.id === slotId)}
        slotIndex={slots.findIndex((s) => s.id === slotId)}
        activeDate={activeDate}
        eventName={data?.event?.name}
        onSuccess={onRegisterSuccess}
        onRefetch={() => void refetch()}
      />
      {PassReadyModal}
    </RegisterBeachLayout>
  );
}
