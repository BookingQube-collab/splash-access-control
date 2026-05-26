"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AdminReportsCard, AdminReportsEmpty } from "@/components/admin/reports/admin-reports-card";
import {
  computeStatusDonutSlices,
  type ReportsKpiStats,
} from "@/components/admin/admin-reports-utils";

const config = { count: { label: "Count", color: "#0d9488" } } satisfies ChartConfig;

export function AdminReportsStatusDonut({
  stats,
  totalReg,
}: {
  stats: ReportsKpiStats;
  totalReg: number;
}) {
  const slices = computeStatusDonutSlices(stats);
  const total = totalReg || slices.reduce((s, r) => s + r.count, 0);
  const hasData = total > 0;

  return (
    <AdminReportsCard title="Status breakdown">
      {!hasData ? (
        <AdminReportsEmpty message="No registrations in this range." />
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative w-full max-w-[200px] shrink-0 sm:max-w-[180px]">
            <ChartContainer config={config} className="mx-auto h-[200px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                <Pie
                  data={slices}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.key} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-extrabold text-[#134e4a]">{total}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                Total
              </span>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-2.5">
            {slices.map((r) => {
              const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
              return (
                <li key={r.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 text-[#64748b]">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: r.color }}
                    />
                    {r.label}
                  </span>
                  <span className="font-semibold tabular-nums text-[#134e4a]">
                    {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </AdminReportsCard>
  );
}
