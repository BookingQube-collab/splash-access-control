"use client";

import { ChevronRight } from "lucide-react";
import { AdminReportsCard } from "@/components/admin/reports/admin-reports-card";
import { cn } from "@/lib/utils";

export type RecentScanRow = {
  id: string;
  name: string;
  event: string;
  slot: string;
  status: "checked_in" | "pending";
  time: string;
};

const STATUS_STYLES = {
  checked_in: "bg-[#ccfbf1] text-[#0f766e]",
  pending: "bg-[#ffedd5] text-[#d97706]",
};

const STATUS_LABELS = {
  checked_in: "Checked In",
  pending: "Pending",
};

function AvatarInitial({ name }: { name: string }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ccfbf1] text-sm font-bold text-[#0f766e]">
      {initial}
    </span>
  );
}

export function AdminReportsScanTable({ rows }: { rows: RecentScanRow[] }) {
  return (
    <AdminReportsCard title="Recent scan activity">
      {rows.length === 0 ? (
        <div className="py-6">
          <p className="text-center text-sm text-[#94a3b8]">
            No recent scan rows in this range. Totals still appear in scan results.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0d9488] hover:underline"
            >
              View all scan activity
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#f1f5f9] text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                  <th className="pb-3 pr-4 font-semibold">Name</th>
                  <th className="pb-3 pr-4 font-semibold">Event</th>
                  <th className="pb-3 pr-4 font-semibold">Slot</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[#f8fafc] last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <AvatarInitial name={row.name} />
                        <span className="font-medium text-[#134e4a]">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-[#64748b]">{row.event}</td>
                    <td className="py-3 pr-4 text-[#64748b]">{row.slot}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          STATUS_STYLES[row.status],
                        )}
                      >
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="py-3 tabular-nums text-[#64748b]">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 border-t border-[#f1f5f9] pt-4">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0d9488] hover:underline"
            >
              View all scan activity
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </AdminReportsCard>
  );
}
