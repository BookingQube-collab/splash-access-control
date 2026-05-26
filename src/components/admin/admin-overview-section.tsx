"use client";

import { useQuery } from "@tanstack/react-query";
import { startOfMonth, startOfWeek } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AdminEventSelector } from "@/components/admin/admin-event-selector";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ShieldCheck } from "lucide-react";
import { AdminOverviewStats } from "@/components/admin/admin-overview-stats";
import { useAdminNavigation } from "@/components/admin/admin-navigation";
import { OverviewPanel } from "@/components/dashboard/overview-panel";
import { ScheduleGrid } from "@/components/dashboard/schedule-grid";
import { adminOverviewBootstrap } from "@/lib/admin.functions";
import { getDashboardSchedule } from "@/lib/summersplash.functions";
import { adminOverviewQueryDefaults } from "@/lib/admin-query";
import { ADMIN_CARD } from "@/components/admin/admin-theme";
import { cn, formatYmd } from "@/lib/utils";

export function AdminOverviewSection() {
  const { navigateToBookings } = useAdminNavigation();
  const [eventId, setEventId] = useState<string>("");
  const [weekStart, setWeekStart] = useState(() =>
    formatYmd(startOfWeek(new Date(), { weekStartsOn: 1 })),
  );
  const [fullScheduleOpen, setFullScheduleOpen] = useState(false);
  const [monthStart, setMonthStart] = useState(() =>
    formatYmd(startOfMonth(new Date())),
  );

  const bootstrapQuery = useQuery({
    queryKey: ["a-overview", eventId, weekStart],
    queryFn: () =>
      adminOverviewBootstrap({
        eventId: eventId || undefined,
        weekStart,
      }),
    ...adminOverviewQueryDefaults,
  });

  const monthScheduleQuery = useQuery({
    queryKey: ["a-dash-schedule-month", eventId, monthStart],
    queryFn: () =>
      getDashboardSchedule({
        eventId: eventId || undefined,
        monthStart,
      }),
    enabled: fullScheduleOpen,
    ...adminOverviewQueryDefaults,
    refetchInterval: fullScheduleOpen ? adminOverviewQueryDefaults.refetchInterval : false,
  });

  const countsData = bootstrapQuery.data?.counts;
  const schedule = bootstrapQuery.data?.schedule;
  const events =
    (countsData as {
      events?: { id: string; name: string; days: number; start_date: string; end_date: string }[];
    })?.events ?? [];
  const slots = countsData?.slots ?? [];

  useEffect(() => {
    if (!eventId && schedule?.selectedEventId) {
      setEventId(schedule.selectedEventId);
    }
  }, [eventId, schedule?.selectedEventId]);

  const recentGuests = useMemo(() => {
    const seen = new Set<string>();
    const out: { name: string; guests: number }[] = [];
    for (const r of [...(schedule?.registrations ?? [])].reverse()) {
      if (seen.has(r.customer_name)) continue;
      seen.add(r.customer_name);
      out.push({ name: r.customer_name, guests: r.guest_count });
      if (out.length >= 6) break;
    }
    return out;
  }, [schedule?.registrations]);

  const scrollToSchedule = () => {
    document.getElementById("admin-schedule")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scheduleLoading = bootstrapQuery.isPending && !schedule;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <AdminPageHeader
        icon={ShieldCheck}
        title="Overview"
        subtitle="Monitor event activity and performance in real time."
      />

      <AdminEventSelector
        eventId={eventId}
        events={events}
        onChange={(id) => {
          setEventId(id);
          const week = formatYmd(startOfWeek(new Date(), { weekStartsOn: 1 }));
          setWeekStart(week);
          setMonthStart(formatYmd(startOfMonth(new Date())));
        }}
        onCalendarClick={scrollToSchedule}
      />

      <AdminOverviewStats slots={slots} />

      <motion.div id="admin-schedule" className="scroll-mt-28" layout>
        {scheduleLoading ? (
          <div className={cn(ADMIN_CARD, "py-20 text-center text-[#64748b]")}>Loading schedule…</div>
        ) : schedule ? (
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
            <ScheduleGrid
              variant="premium"
              schedule={schedule}
              countsLoading={bootstrapQuery.isFetching}
              onWeekChange={setWeekStart}
              onEventChange={(id) => {
                setEventId(id);
                const week = formatYmd(startOfWeek(new Date(), { weekStartsOn: 1 }));
                setWeekStart(week);
                setMonthStart(formatYmd(startOfMonth(new Date())));
              }}
              fullMonth={{
                open: fullScheduleOpen,
                onOpenChange: setFullScheduleOpen,
                schedule: monthScheduleQuery.data,
                monthStart,
                onMonthChange: setMonthStart,
                countsLoading:
                  monthScheduleQuery.isFetching || bootstrapQuery.isFetching,
              }}
            />
            <OverviewPanel
              variant="premium"
              slots={slots}
              schedule={schedule}
              recentGuests={recentGuests}
              onRecentGuestClick={(guest) => navigateToBookings(guest.name)}
              onViewAllGuests={() => navigateToBookings()}
            />
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
