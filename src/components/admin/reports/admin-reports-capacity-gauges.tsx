"use client";

import { AdminReportsCard, AdminReportsEmpty } from "@/components/admin/reports/admin-reports-card";
import {
  groupCapacityGauges,
  overallCapacityTotals,
  type AdminReportsData,
  type CapacityGaugeGroup,
} from "@/components/admin/admin-reports-utils";

const GAUGE_LABELS: Record<string, string> = {
  Park: "Park Guest",
  General: "General Guest",
  Night: "Night Slot",
};

function SemiGauge({ group }: { group: CapacityGaugeGroup }) {
  const pct = group.utilizationPct;
  const r = 36;
  const cx = 44;
  const cy = 44;
  const startAngle = 180;
  const endAngle = 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const sweep = ((180 - (startAngle - endAngle)) * pct) / 100;
  const end = startAngle - sweep;
  const x2 = cx + r * Math.cos(toRad(end));
  const y2 = cy + r * Math.sin(toRad(end));
  const large = sweep > 180 ? 1 : 0;
  const displayLabel = GAUGE_LABELS[group.label] ?? group.label;

  return (
    <div className="flex flex-col items-center">
      <svg width={88} height={52} viewBox="0 0 88 52" className="overflow-visible">
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
            fill="none"
            stroke="#0d9488"
            strokeWidth={8}
            strokeLinecap="round"
          />
        )}
      </svg>
      <p className="mt-1 font-display text-lg font-extrabold tabular-nums text-[#134e4a]">{pct}%</p>
      <p className="text-center text-xs font-semibold text-[#64748b]">{displayLabel}</p>
    </div>
  );
}

export function AdminReportsCapacityGauges({
  capacityBySlot,
}: {
  capacityBySlot: AdminReportsData["capacityBySlot"];
}) {
  const groups = groupCapacityGauges(capacityBySlot);
  const totals = overallCapacityTotals(capacityBySlot);
  const hasData = capacityBySlot.length > 0;

  return (
    <AdminReportsCard title="Capacity utilization">
      {!hasData ? (
        <AdminReportsEmpty message="No slots configured for this filter." />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {groups.map((g) => (
              <SemiGauge key={g.label} group={g} />
            ))}
          </div>
          <div className="mt-5 rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-center">
            <p className="text-xs font-medium text-[#64748b]">
              Overall utilization{" "}
              <span className="font-display text-base font-extrabold text-[#0f766e]">
                {totals.pct}%
              </span>{" "}
              <span className="tabular-nums text-[#94a3b8]">
                ({totals.booked} / {totals.capacity} capacity)
              </span>
            </p>
          </div>
        </>
      )}
    </AdminReportsCard>
  );
}
