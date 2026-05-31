"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { startOfWeek } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/role-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ScheduleGrid } from "@/components/dashboard/schedule-grid";

const OverviewPanel = dynamic(
  () => import("@/components/dashboard/overview-panel").then((m) => ({ default: m.OverviewPanel })),
  {
    loading: () => (
      <div className="h-48 animate-pulse rounded-2xl bg-white/60 lg:col-span-1" aria-hidden />
    ),
  },
);
import { useAuth } from "@/hooks/use-auth";
import { getDashboardCounts, getDashboardSchedule } from "@/lib/summersplash.functions";
import { formatYmd } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ScanLine } from "lucide-react";

function HeaderLinks({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export default function DashboardPage() {
  return (
    <RoleGuard role="dashboard" bare>
      <DashboardContent />
    </RoleGuard>
  );
}

function DashboardContent() {
  const { user, hasRole } = useAuth();
  const [weekStart, setWeekStart] = useState(() =>
    formatYmd(startOfWeek(new Date(), { weekStartsOn: 1 })),
  );
  const [eventId, setEventId] = useState<string | undefined>(undefined);
  const [displayName, setDisplayName] = useState("Team");

  useEffect(() => {
    if (!user?.id) return;
    const meta = user.user_metadata?.full_name as string | undefined;
    if (meta) {
      setDisplayName(meta.split(" ")[0] || meta);
      return;
    }
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setDisplayName(data.full_name.split(" ")[0] || data.full_name);
        else if (data?.email) setDisplayName(data.email.split("@")[0] ?? "Team");
        else if (user.email) setDisplayName(user.email.split("@")[0] ?? "Team");
      });
  }, [user?.id, user?.email, user?.user_metadata]);

  const scheduleQuery = useQuery({
    queryKey: ["dash-schedule", eventId, weekStart],
    queryFn: () => getDashboardSchedule({ eventId, weekStart }),
    refetchInterval: 5000,
  });

  const countsQuery = useQuery({
    queryKey: ["dash", eventId],
    queryFn: () => getDashboardCounts({ eventId }),
    refetchInterval: 5000,
  });

  const schedule = scheduleQuery.data;
  const slots = countsQuery.data?.slots ?? [];

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

  const addHref = hasRole("admin") ? "/admin" : hasRole("pos") ? "/pos" : "/scanner";

  const headerExtra = (
    <HeaderLinks className="hidden items-center gap-2 sm:flex">
      {hasRole("scanner") && (
        <Link
          href="/scanner"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#dce8ea] bg-white px-3 py-2 text-xs font-semibold text-[#0a4a52]"
        >
          <ScanLine className="h-3.5 w-3.5" />
          Scanner
        </Link>
      )}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f7f8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <span className="relative flex h-2 w-2">
          <span className="absolute h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative h-2 w-2 rounded-full bg-primary" />
        </span>
        Live
      </span>
    </HeaderLinks>
  );

  if (!schedule) {
    return (
      <DashboardShell displayName={displayName} addHref={addHref} headerExtra={headerExtra}>
        <div className="flex flex-1 items-center justify-center text-[#5a7a80]">Loading dashboard…</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell displayName={displayName} addHref={addHref} headerExtra={headerExtra}>
      <ScheduleGrid
        schedule={schedule}
        countsLoading={scheduleQuery.isFetching || countsQuery.isFetching}
        onWeekChange={setWeekStart}
        onEventChange={(id) => {
          setEventId(id);
          setWeekStart(formatYmd(startOfWeek(new Date(), { weekStartsOn: 1 })));
        }}
      />
      <OverviewPanel slots={slots} schedule={schedule} recentGuests={recentGuests} />
    </DashboardShell>
  );
}