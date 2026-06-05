"use client";

import {
  CircleCheck,
  Clock3,
  MapPin,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { AnimatedCount } from "@/components/animated-count";
import { ADMIN_CARD } from "@/components/admin/admin-theme";
import type { BookingStats } from "@/components/admin/admin-bookings-utils";
import { formatBookingPct } from "@/components/admin/admin-bookings-utils";
import { cn } from "@/lib/utils";

type StatCardKey = "total" | "totalGuestsRegistered" | "active" | "pending" | "checkedIn";

type StatConfig = {
  key: StatCardKey;
  label: string;
  icon: LucideIcon;
  iconWrap: string;
  sub: (stats: BookingStats) => string;
};

const STAT_CARDS: StatConfig[] = [
  {
    key: "total",
    label: "Total Registrations",
    icon: Users,
    iconWrap: "bg-[#ccfbf1] text-[#0f766e]",
    sub: () => "All time",
  },
  {
    key: "totalGuestsRegistered",
    label: "Total Guest Registered",
    icon: UsersRound,
    iconWrap: "bg-[#e0f2fe] text-[#0284c7]",
    sub: (s) =>
      s.total > 0
        ? `${(s.totalGuestsRegistered / s.total).toFixed(1)} avg per registration`
        : "Sum of guest counts",
  },
  {
    key: "active",
    label: "Active",
    icon: CircleCheck,
    iconWrap: "bg-[#dcfce7] text-[#16a34a]",
    sub: (s) =>
      s.totalGuestsRegistered > 0
        ? `${formatBookingPct(s.active, s.totalGuestsRegistered)}% of guests`
        : "0% of guests",
  },
  {
    key: "pending",
    label: "Pending",
    icon: Clock3,
    iconWrap: "bg-[#ffedd5] text-[#d97706]",
    sub: (s) =>
      s.totalGuestsRegistered > 0
        ? `${formatBookingPct(s.pending, s.totalGuestsRegistered)}% of guests`
        : "0% of guests",
  },
  {
    key: "checkedIn",
    label: "Checked In",
    icon: MapPin,
    iconWrap: "bg-[#ede9fe] text-[#7c3aed]",
    sub: (s) =>
      s.totalGuestsRegistered > 0
        ? `${formatBookingPct(s.checkedIn, s.totalGuestsRegistered)}% of guests`
        : "0% of guests",
  },
];

export function AdminBookingsStats({ stats }: { stats: BookingStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {STAT_CARDS.map((card) => (
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
            <AnimatedCount value={stats[card.key]} />
          </p>
          <p className="mt-1 text-xs font-semibold text-[#64748b]">{card.label}</p>
          <p className="mt-1.5 text-[10px] font-semibold text-[#94a3b8]">{card.sub(stats)}</p>
        </article>
      ))}
    </div>
  );
}
