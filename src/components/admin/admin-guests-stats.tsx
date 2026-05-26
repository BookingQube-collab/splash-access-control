"use client";

import { Lock, Shield, UserPlus, Users, type LucideIcon } from "lucide-react";
import { AnimatedCount } from "@/components/animated-count";
import { ADMIN_CARD } from "@/components/admin/admin-theme";
import type { GuestStats } from "@/components/admin/admin-guests-utils";
import { formatGuestPct } from "@/components/admin/admin-guests-utils";
import { cn } from "@/lib/utils";

type StatConfig = {
  key: keyof GuestStats;
  label: string;
  icon: LucideIcon;
  iconWrap: string;
  sub: (stats: GuestStats) => { text: string; positive?: boolean };
};

const STAT_CARDS: StatConfig[] = [
  {
    key: "total",
    label: "Total Guests",
    icon: Users,
    iconWrap: "bg-[#ccfbf1] text-[#0f766e]",
    sub: (s) => {
      if (s.totalGrowthPct == null) return { text: "All accounts" };
      const sign = s.totalGrowthPct >= 0 ? "↑" : "↓";
      return {
        text: `${sign} ${Math.abs(s.totalGrowthPct)}% vs last 7 days`,
        positive: s.totalGrowthPct >= 0,
      };
    },
  },
  {
    key: "active",
    label: "Active Guests",
    icon: Shield,
    iconWrap: "bg-[#dbeafe] text-[#2563eb]",
    sub: (s) => ({
      text: `${formatGuestPct(s.active, s.total)}% of total`,
    }),
  },
  {
    key: "newThisWeek",
    label: "New This Week",
    icon: UserPlus,
    iconWrap: "bg-[#ede9fe] text-[#7c3aed]",
    sub: (s) => {
      if (s.newWeekGrowthPct == null) return { text: "Created in last 7 days" };
      const sign = s.newWeekGrowthPct >= 0 ? "↑" : "↓";
      return {
        text: `${sign} ${Math.abs(s.newWeekGrowthPct)}% vs last week`,
        positive: s.newWeekGrowthPct >= 0,
      };
    },
  },
  {
    key: "roles",
    label: "Roles",
    icon: Lock,
    iconWrap: "bg-[#ffedd5] text-[#d97706]",
    sub: () => ({ text: "System roles" }),
  },
];

export function AdminGuestsStats({ stats }: { stats: GuestStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {STAT_CARDS.map((card) => {
        const sub = card.sub(stats);
        const value =
          card.key === "roles" ? stats.roles : (stats[card.key] as number);
        return (
          <article
            key={card.key}
            className={cn(
              ADMIN_CARD,
              "flex flex-col p-5 transition-shadow hover:shadow-[0_8px_28px_-6px_rgba(15,118,110,0.12)]",
            )}
          >
            <div
              className={cn(
                "mb-4 grid h-12 w-12 place-items-center rounded-full",
                card.iconWrap,
              )}
            >
              <card.icon className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight text-[#134e4a]">
              <AnimatedCount value={value} />
            </p>
            <p className="mt-1 text-xs font-semibold text-[#64748b]">{card.label}</p>
            <p
              className={cn(
                "mt-1.5 text-[10px] font-semibold",
                sub.positive === true
                  ? "text-[#16a34a]"
                  : sub.positive === false
                    ? "text-[#dc2626]"
                    : "text-[#94a3b8]",
              )}
            >
              {sub.text}
            </p>
          </article>
        );
      })}
    </div>
  );
}
