"use client";

import { ChevronRight } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AdminReportsCard } from "@/components/admin/reports/admin-reports-card";
import { scanSuccessRate, type AdminReportsData } from "@/components/admin/admin-reports-utils";

const config = { count: { label: "Scans", color: "#16a34a" } } satisfies ChartConfig;
const COLORS = { valid: "#16a34a", invalid: "#dc2626" };

export function AdminReportsScanDonut({
  validScans,
  invalidScans,
}: {
  validScans: number;
  invalidScans: number;
  scansByResult?: AdminReportsData["scansByResult"];
}) {
  const rows = [
    { result: "valid", label: "Valid", count: validScans },
    { result: "invalid", label: "Invalid", count: invalidScans },
  ];
  const total = validScans + invalidScans;
  const success = scanSuccessRate(validScans, invalidScans);

  return (
    <AdminReportsCard title="Scan results">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-full max-w-[200px]">
          <ChartContainer config={config} className="mx-auto h-[180px] w-full">
            <PieChart>
              {total > 0 && (
                <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              )}
              <Pie
                data={total > 0 ? rows : [{ result: "empty", label: "No scans", count: 1 }]}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={78}
                paddingAngle={total > 0 ? 3 : 0}
                strokeWidth={0}
              >
                {total > 0 ? (
                  rows.map((r) => (
                    <Cell
                      key={r.result}
                      fill={COLORS[r.result as keyof typeof COLORS] ?? "#94a3b8"}
                    />
                  ))
                ) : (
                  <Cell fill="#f1f5f9" />
                )}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-extrabold text-[#134e4a]">{total}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
              Total scans
            </span>
          </div>
        </div>
        <ul className="w-full space-y-2 text-sm">
          {rows.map((r) => {
            const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
            return (
              <li key={r.result} className="flex justify-between text-[#64748b]">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: COLORS[r.result as keyof typeof COLORS] ?? "#94a3b8",
                    }}
                  />
                  {r.label}
                </span>
                <span className="font-semibold tabular-nums text-[#134e4a]">
                  {r.count}
                  {total > 0 ? ` (${pct}%)` : ""}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="w-full rounded-[16px] border border-[#e2e8f0] bg-[#f0fdf4] px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Scan success rate
          </p>
          <p className="font-display text-2xl font-extrabold text-[#16a34a]">{success}%</p>
          <p className="text-xs text-[#64748b]">
            {validScans} valid / {invalidScans} invalid
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0d9488] hover:underline"
        >
          View scan details
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </AdminReportsCard>
  );
}
