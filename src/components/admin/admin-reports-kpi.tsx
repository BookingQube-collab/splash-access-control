"use client";

import {
  CircleCheck,
  Clock3,
  LogIn,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { AnimatedCount } from "@/components/animated-count";
import { ADMIN_CARD } from "@/components/admin/admin-theme";
import type { ReportsKpiStats } from "@/components/admin/admin-reports-utils";
import { cn } from "@/lib/utils";

type KpiConfig = {
  label: string;
  value: keyof ReportsKpiStats | "totalGuests";
  sub?: (s: ReportsKpiStats) => string | null;
  growthKey?: "regGrowthPct" | "guestGrowthPct";
  icon: typeof Users;
  accent: string;
  iconWrap: string;
};

const KPI_CARDS: KpiConfig[] = [
  {
    label: "Total Registrations",
    value: "totalReg",
    growthKey: "regGrowthPct",
    sub: (s) =>
      s.regGrowthPct != null
        ? `${s.regGrowthPct >= 0 ? "+" : ""}${s.regGrowthPct}% vs last 7 days`
        : null,
    icon: Users,
    accent: "text-[#0d9488]",
    iconWrap: "bg-[#ccfbf1] text-[#0f766e]",
  },
  {
    label: "Total Guests",
    value: "totalGuests",
    growthKey: "guestGrowthPct",
    sub: (s) =>
      s.guestGrowthPct != null
        ? `${s.guestGrowthPct >= 0 ? "+" : ""}${s.guestGrowthPct}% vs last 7 days`
        : null,
    icon: UserCheck,
    accent: "text-[#16a34a]",
    iconWrap: "bg-[#dcfce7] text-[#16a34a]",
  },
  {
    label: "Active",
    value: "activeReg",
    sub: (s) => (s.totalReg > 0 ? `${s.activePct}% of total` : null),
    icon: CircleCheck,
    accent: "text-[#2563eb]",
    iconWrap: "bg-[#dbeafe] text-[#2563eb]",
  },
  {
    label: "Pending",
    value: "pending",
    sub: (s) => (s.totalReg > 0 ? `${s.pendingPct}% of total` : null),
    icon: Clock3,
    accent: "text-[#d97706]",
    iconWrap: "bg-[#ffedd5] text-[#d97706]",
  },
  {
    label: "Checked In",
    value: "checkedIn",
    sub: (s) => (s.totalReg > 0 ? `${s.checkedInPct}% of total` : null),
    icon: LogIn,
    accent: "text-[#7c3aed]",
    iconWrap: "bg-[#ede9fe] text-[#7c3aed]",
  },
  {
    label: "Cancelled",
    value: "cancelled",
    sub: (s) => (s.totalReg > 0 ? `${s.cancelledPct}% of total` : null),
    icon: XCircle,
    accent: "text-[#dc2626]",
    iconWrap: "bg-[#fee2e2] text-[#dc2626]",
  },
];

function kpiValue(stats: ReportsKpiStats, key: KpiConfig["value"]): number {
  if (key === "totalGuests") return stats.totalGuests;
  return stats[key] as number;
}

export function AdminReportsKpi({ stats }: { stats: ReportsKpiStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {KPI_CARDS.map((card) => {
        const value = kpiValue(stats, card.value);
        const sub = card.sub?.(stats);
        const growthPct =
          card.growthKey != null ? stats[card.growthKey] : null;
        const growthUp = growthPct != null && growthPct >= 0;
        const showGrowth = growthPct != null;

        return (
          <article
            key={card.label}
            className={cn(
              ADMIN_CARD,
              "flex flex-col p-5 transition-shadow hover:shadow-[0_8px_28px_-6px_rgba(15,118,110,0.12)]",
            )}
          >
            <div
              className={cn(
                "mb-3 grid h-11 w-11 place-items-center rounded-full",
                card.iconWrap,
              )}
            >
              <card.icon className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <p
              className={cn(
                "font-display text-3xl font-extrabold tabular-nums leading-none",
                card.accent,
              )}
            >
              <AnimatedCount value={value} />
            </p>
            <p className="mt-2 text-xs font-semibold text-[#64748b]">{card.label}</p>
            {sub && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#94a3b8]">
                {showGrowth &&
                  (growthUp ? (
                    <TrendingUp className="h-3 w-3 text-[#16a34a]" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-[#dc2626]" />
                  ))}
                {sub}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
