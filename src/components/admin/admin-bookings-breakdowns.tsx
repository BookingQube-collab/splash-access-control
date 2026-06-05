"use client";

import { ADMIN_CARD } from "@/components/admin/admin-theme";
import type { AdminSlotRow } from "@/components/admin/admin-slots-utils";
import type { BookingBreakdownItem, BookingStats } from "@/components/admin/admin-bookings-utils";
import { formatBookingPct } from "@/components/admin/admin-bookings-utils";
import { cn } from "@/lib/utils";

function resolveSlotLabel(
  item: BookingBreakdownItem,
  slotsById?: Map<string, AdminSlotRow>,
): string {
  if (item.label !== "Unknown slot") return item.label;
  return slotsById?.get(item.key)?.name ?? item.label;
}

function BreakdownCard({
  title,
  items,
  total,
  resolveLabel,
}: {
  title: string;
  items: BookingBreakdownItem[];
  total: number;
  resolveLabel?: (item: BookingBreakdownItem) => string;
}) {
  return (
    <article className={cn(ADMIN_CARD, "flex flex-col p-5")}>
      <h3 className="font-display text-sm font-bold tracking-tight text-[#134e4a]">{title}</h3>
      {items.length === 0 || total <= 0 ? (
        <p className="mt-4 text-xs font-semibold text-[#94a3b8]">No registrations in this filter set.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const label = resolveLabel ? resolveLabel(item) : item.label;
            const pct = Number(formatBookingPct(item.count, total));
            return (
              <li key={item.key}>
                <div className="mb-1.5 flex items-start justify-between gap-3">
                  <span className="min-w-0 text-xs font-semibold leading-snug text-[#475569]">
                    {label}
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-[#134e4a]">
                    {item.count.toLocaleString()}{" "}
                    <span className="font-semibold text-[#0d9488]">({formatBookingPct(item.count, total)}%)</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f5f9]">
                  <div
                    className="h-full rounded-full bg-[#0d9488] transition-all"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

export function AdminBookingsBreakdowns({
  stats,
  slotsById,
}: {
  stats: BookingStats;
  slotsById?: Map<string, AdminSlotRow>;
}) {
  const total = stats.total;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <BreakdownCard title="Nationality" items={stats.byNationality} total={total} />
      <BreakdownCard title="Age group" items={stats.byAgeGroup} total={total} />
      <BreakdownCard
        title="By slot"
        items={stats.bySlot}
        total={total}
        resolveLabel={(item) => resolveSlotLabel(item, slotsById)}
      />
    </div>
  );
}
