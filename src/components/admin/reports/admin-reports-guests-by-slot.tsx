"use client";

import { AdminReportsCard, AdminReportsEmpty } from "@/components/admin/reports/admin-reports-card";
import type { AdminReportsData } from "@/components/admin/admin-reports-utils";

export function AdminReportsGuestsBySlot({
  guestsBySlot,
}: {
  guestsBySlot: AdminReportsData["guestsBySlot"];
}) {
  const data = [...guestsBySlot]
    .sort((a, b) => b.guests - a.guests)
    .slice(0, 8);
  const max = data[0]?.guests ?? 1;

  return (
    <AdminReportsCard title="Guests by slot">
      {data.length === 0 ? (
        <AdminReportsEmpty message="No slot bookings in this range." />
      ) : (
        <ul className="space-y-4">
          {data.map((row) => {
            const pct = Math.round((row.guests / max) * 100);
            return (
              <li key={row.slotName}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-[#134e4a]">
                    {row.slotName}
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-[#0d9488]">
                    {row.guests}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#f1f5f9]">
                  <div
                    className="h-full rounded-full bg-[#0d9488] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminReportsCard>
  );
}
