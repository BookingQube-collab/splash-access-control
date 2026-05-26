"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AdminReportsCard,
  AdminReportsEmpty,
  AdminReportsStatBlocks,
} from "@/components/admin/reports/admin-reports-card";
import {
  computeDayTrendStats,
  sliceLastNDays,
  type AdminReportsData,
} from "@/components/admin/admin-reports-utils";

const config = {
  registrations: { label: "Registrations", color: "#0d9488" },
  guests: { label: "Guests", color: "#f97316" },
} satisfies ChartConfig;

const RANGE_OPTIONS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "All in range", days: 9999 },
];

export function AdminReportsRegistrationsChart({
  registrationsByDay,
}: {
  registrationsByDay: AdminReportsData["registrationsByDay"];
}) {
  const [rangeDays, setRangeDays] = useState(7);
  const chartData = useMemo(
    () => sliceLastNDays(registrationsByDay, rangeDays),
    [registrationsByDay, rangeDays],
  );
  const stats = useMemo(() => computeDayTrendStats(chartData), [chartData]);

  return (
    <AdminReportsCard
      title="Registrations over time"
      action={
        <select
          value={rangeDays}
          onChange={(e) => setRangeDays(Number(e.target.value))}
          className="h-8 rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-2.5 text-xs font-semibold text-[#334155] outline-none focus:border-[#0d9488]"
          aria-label="Chart date range"
        >
          {RANGE_OPTIONS.map((o) => (
            <option key={o.days} value={o.days}>
              {o.label}
            </option>
          ))}
        </select>
      }
    >
      {chartData.length === 0 ? (
        <AdminReportsEmpty message="No registrations in this range." />
      ) : (
        <>
          <ChartContainer config={config} className="h-[260px] w-full">
            <LineChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(v) => String(v).slice(5)}
              />
              <YAxis tickLine={false} axisLine={false} width={32} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="registrations"
                stroke="var(--color-registrations)"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="guests"
                stroke="var(--color-guests)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
            </LineChart>
          </ChartContainer>
          <AdminReportsStatBlocks
            stats={[
              { label: "Highest day", value: String(stats.highest) },
              { label: "Average per day", value: String(stats.average) },
              {
                label: "Growth rate",
                value:
                  stats.growthPct != null
                    ? `${stats.growthPct >= 0 ? "+" : ""}${stats.growthPct}%`
                    : "—",
              },
            ]}
          />
        </>
      )}
    </AdminReportsCard>
  );
}
