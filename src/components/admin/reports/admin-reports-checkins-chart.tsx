"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
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

const config = { checkins: { label: "Check-ins", color: "#7c3aed" } } satisfies ChartConfig;

export function AdminReportsCheckinsChart({
  scansByDay,
}: {
  scansByDay: AdminReportsData["scansByDay"];
}) {
  const chartData = useMemo(() => sliceLastNDays(scansByDay, 7), [scansByDay]);
  const chartDataWithCheckins = useMemo(
    () => chartData.map((d) => ({ ...d, checkins: d.checkins ?? 0 })),
    [chartData],
  );
  const stats = useMemo(
    () =>
      computeDayTrendStats(
        chartDataWithCheckins.map((d) => ({ date: d.date, total: d.checkins })),
        "total",
      ),
    [chartDataWithCheckins],
  );
  const totalCheckins = useMemo(
    () => chartDataWithCheckins.reduce((s, d) => s + d.checkins, 0),
    [chartDataWithCheckins],
  );

  return (
    <AdminReportsCard title="Check-ins over time">
      {chartData.length === 0 ? (
        <AdminReportsEmpty message="No scans in this range." />
      ) : (
        <>
          <ChartContainer config={config} className="h-[220px] w-full">
            <LineChart data={chartDataWithCheckins} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
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
              <Line
                type="monotone"
                dataKey="checkins"
                stroke="var(--color-checkins)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#7c3aed", strokeWidth: 0 }}
              />
            </LineChart>
          </ChartContainer>
          <AdminReportsStatBlocks
            columns={2}
            stats={[
              { label: "Total check-ins", value: String(totalCheckins) },
              { label: "Avg per day", value: String(stats.average) },
            ]}
          />
        </>
      )}
    </AdminReportsCard>
  );
}
