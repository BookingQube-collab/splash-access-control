"use client";

import { AdminReportsCard, AdminReportsEmpty } from "@/components/admin/reports/admin-reports-card";
import type { TopEventRow } from "@/components/admin/admin-reports-utils";

export function AdminReportsTopEvents({ rows }: { rows: TopEventRow[] }) {
  const max = rows[0]?.registrations ?? 1;

  return (
    <AdminReportsCard title="Top events">
      {rows.length === 0 ? (
        <AdminReportsEmpty message="No event breakdown available. Apply filters with slot data." />
      ) : (
        <ol className="space-y-4">
          {rows.map((row, i) => {
            const pct = Math.round((row.registrations / max) * 100);
            return (
              <li key={row.eventId}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#134e4a]">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#ccfbf1] text-xs font-bold text-[#0f766e]">
                      {i + 1}
                    </span>
                    {row.eventName}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-[#0d9488]">
                    {row.registrations}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#f1f5f9]">
                  <div
                    className="h-full rounded-full bg-[#0d9488] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </AdminReportsCard>
  );
}
