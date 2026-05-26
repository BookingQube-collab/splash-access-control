"use client";

import { useMemo } from "react";
import { AdminReportsCard, AdminReportsEmpty } from "@/components/admin/reports/admin-reports-card";
import {
  buildHeatmapMatrixFromDaily,
  buildHeatmapMatrixFromRegistrations,
  formatHeatmapHourLabel,
  hasHeatmapSourceData,
  heatmapMatrixTotal,
  HEATMAP_HOURS,
  type AdminReportsData,
} from "@/components/admin/admin-reports-utils";
import { cn } from "@/lib/utils";

const WEEKDAY_ROWS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const HOUR_LABELS = HEATMAP_HOURS.map(formatHeatmapHourLabel);
const GRID_COLS = `36px repeat(${HEATMAP_HOURS.length}, minmax(20px, 1fr))`;

export function AdminReportsHeatmap({
  registrations,
  registrationsByDay,
}: {
  registrations: { created_at: string }[];
  registrationsByDay: AdminReportsData["registrationsByDay"];
}) {
  const usesTimestamps = registrations.length > 0;

  const grid = useMemo(() => {
    if (usesTimestamps) {
      return buildHeatmapMatrixFromRegistrations(registrations);
    }
    return buildHeatmapMatrixFromDaily(registrationsByDay);
  }, [usesTimestamps, registrations, registrationsByDay]);

  const maxVal = useMemo(() => Math.max(1, ...grid.flat()), [grid]);
  const total = useMemo(() => heatmapMatrixTotal(grid), [grid]);
  const hasSource = hasHeatmapSourceData(registrations, registrationsByDay);

  return (
    <AdminReportsCard title="Registrations heatmap">
      {!hasSource || total === 0 ? (
        <AdminReportsEmpty message="No registration activity for this period." />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[520px]">
            <div
              className="mb-2 grid gap-1 text-[10px] font-semibold text-[#94a3b8]"
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              <span />
              {HOUR_LABELS.map((label) => (
                <span key={label} className="text-center">
                  {label}
                </span>
              ))}
            </div>
            {WEEKDAY_ROWS.map((dayLabel, wi) => (
              <div
                key={dayLabel}
                className="mb-1 grid gap-1"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <span className="flex items-center text-[10px] font-semibold text-[#64748b]">
                  {dayLabel}
                </span>
                {HEATMAP_HOURS.map((hour, hi) => {
                  const v = grid[wi][hi];
                  const intensity = v / maxVal;
                  return (
                    <div
                      key={`${dayLabel}-${hour}`}
                      title={`${dayLabel} ${HOUR_LABELS[hi]} — ${v} registration${v === 1 ? "" : "s"}`}
                      className={cn(
                        "aspect-square min-h-[20px] rounded-[6px] transition-colors",
                        v === 0 ? "bg-[#f1f5f9]" : "",
                      )}
                      style={
                        v > 0
                          ? {
                              backgroundColor: `rgba(13, 148, 136, ${0.28 + intensity * 0.72})`,
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ))}
            <p className="mt-3 text-center text-[10px] font-medium text-[#94a3b8]">
              {usesTimestamps
                ? "By registration time (local timezone)"
                : "Estimated from daily totals (no timestamps loaded)"}
            </p>
          </div>
        </div>
      )}
    </AdminReportsCard>
  );
}
