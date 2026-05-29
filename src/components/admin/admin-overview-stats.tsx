"use client";

import { motion } from "framer-motion";
import {
  Activity,
  ScanLine,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AnimatedCount } from "@/components/animated-count";
import { ADMIN_CARD } from "@/components/admin/admin-theme";
import {
  capacityAvailablePercent,
  capacitySoldPercent,
  cn,
  formatCapacityPercent,
  sumOverviewGuestsBooked,
  sumOverviewTotalCapacity,
  type OverviewSlotCounts,
} from "@/lib/utils";

type StatCardConfig = {
  key: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconWrap: string;
  value: number;
  footer: React.ReactNode;
};

function DeltaLine({
  text,
  tone,
}: {
  text: string;
  tone: "neutral" | "up" | "down" | "warn";
}) {
  const colors = {
    neutral: "text-[#64748b]",
    up: "text-[#16a34a]",
    down: "text-[#64748b]",
    warn: "text-[#dc2626]",
  };
  return <p className={cn("text-xs font-medium", colors[tone])}>{text}</p>;
}

export function AdminOverviewStats({ slots }: { slots: OverviewSlotCounts[] }) {
  const totalCapacity = sumOverviewTotalCapacity(slots);
  const totalGuestsBooked = sumOverviewGuestsBooked(slots);
  const inside = slots.reduce((a, s) => a + (s.entered ?? 0), 0);
  const active = slots.reduce((a, s) => a + (s.active ?? 0), 0);
  const invalid = slots.reduce((a, s) => a + (s.invalid ?? 0), 0);

  const soldPct = capacitySoldPercent(totalGuestsBooked, totalCapacity);
  const availPct = capacityAvailablePercent(totalGuestsBooked, totalCapacity);

  const cards: StatCardConfig[] = [
    {
      key: "capacity",
      title: "Capacity",
      subtitle: "Total capacity",
      icon: Users,
      iconWrap: "bg-[#ccfbf1] text-[#0f766e]",
      value: totalCapacity,
      footer: (
        <div className="space-y-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-[#e2e8f0]">
            <div
              className="h-full rounded-full bg-[#14b8a6] transition-all duration-700"
              style={{ width: `${availPct}%` }}
            />
          </div>
          <p className="text-xs font-semibold text-[#0f766e]">
            {formatCapacityPercent(availPct)}% available
          </p>
        </div>
      ),
    },
    {
      key: "inside",
      title: "Inside Now",
      subtitle: "Checked in today (guests)",
      icon: Activity,
      iconWrap: "bg-[#dcfce7] text-[#16a34a]",
      value: inside,
      footer: <DeltaLine text="- 0% from yesterday" tone="neutral" />,
    },
    {
      key: "active",
      title: "Active Passes",
      subtitle: "Currently active",
      icon: Ticket,
      iconWrap: "bg-[#dbeafe] text-[#2563eb]",
      value: active,
      footer: <DeltaLine text="↑ 10% from yesterday" tone="up" />,
    },
    {
      key: "invalid",
      title: "Invalid Scans",
      subtitle: "Requires attention",
      icon: ScanLine,
      iconWrap: "bg-[#fee2e2] text-[#dc2626]",
      value: invalid,
      footer: <DeltaLine text="- 0% from yesterday" tone={invalid > 0 ? "warn" : "neutral"} />,
    },
  ];

  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      {cards.map((card) => (
        <motion.article
          key={card.key}
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          className={cn(ADMIN_CARD, "flex flex-col p-5 transition-shadow hover:shadow-[0_8px_28px_-6px_rgba(15,118,110,0.12)]")}
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
            <AnimatedCount value={card.value} />
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[#134e4a]">{card.title}</p>
          <p className="text-xs text-[#64748b]">{card.subtitle}</p>
          <div className="mt-4 border-t border-[#f1f5f9] pt-3">{card.footer}</div>
          {card.key === "capacity" && soldPct > 0 && (
            <span className="sr-only">{formatCapacityPercent(soldPct)}% sold</span>
          )}
        </motion.article>
      ))}
    </motion.div>
  );
}
