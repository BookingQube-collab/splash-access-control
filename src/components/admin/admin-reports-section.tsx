"use client";

import { useMemo } from "react";
import { AdminReportsCheckinsChart } from "@/components/admin/reports/admin-reports-checkins-chart";
import { AdminReportsCapacityGauges } from "@/components/admin/reports/admin-reports-capacity-gauges";
import { AdminReportsGuestsBySlot } from "@/components/admin/reports/admin-reports-guests-by-slot";
import { AdminReportsHeatmap } from "@/components/admin/reports/admin-reports-heatmap";
import { AdminReportsRegistrationsChart } from "@/components/admin/reports/admin-reports-registrations-chart";
import { AdminReportsScanDonut } from "@/components/admin/reports/admin-reports-scan-donut";
import { AdminReportsStatusDonut } from "@/components/admin/reports/admin-reports-status-donut";
import { AdminReportsTopEvents } from "@/components/admin/reports/admin-reports-top-events";
import { AdminReportsFooter } from "@/components/admin/admin-reports-footer";
import { AdminReportsKpi } from "@/components/admin/admin-reports-kpi";
import { AdminReportsScanTable } from "@/components/admin/admin-reports-scan-table";
import {
  computeReportsKpis,
  computeTopEvents,
  guestsBySlotWithIds,
  type AdminReportsData,
} from "@/components/admin/admin-reports-utils";

type EventRow = { id: string; name: string };
type SlotRow = { id: string; event_id: string };

type HeatmapRegistration = { created_at: string };

export function AdminReportsSection({
  data,
  events,
  slots,
  heatmapRegistrations = [],
  isFetching,
  dataUpdatedAt,
  onRefresh,
}: {
  data: AdminReportsData;
  events: EventRow[];
  slots: SlotRow[];
  heatmapRegistrations?: HeatmapRegistration[];
  isFetching?: boolean;
  dataUpdatedAt?: number;
  onRefresh: () => void;
}) {
  const kpis = useMemo(() => computeReportsKpis(data), [data]);

  const topEvents = useMemo(() => {
    const eventNames = new Map(events.map((e) => [e.id, e.name]));
    const slotIdToEventId = new Map(
      slots.filter((s) => s.id && s.event_id).map((s) => [s.id, s.event_id]),
    );
    const withIds = guestsBySlotWithIds(data.guestsBySlot, data.capacityBySlot);
    return computeTopEvents(withIds, slotIdToEventId, eventNames);
  }, [data.guestsBySlot, data.capacityBySlot, events, slots]);

  return (
    <div className="space-y-6">
      <AdminReportsKpi stats={kpis} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminReportsRegistrationsChart registrationsByDay={data.registrationsByDay} />
        </div>
        <div>
          <AdminReportsStatusDonut stats={kpis} totalReg={data.totalReg} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <AdminReportsGuestsBySlot guestsBySlot={data.guestsBySlot} />
        <AdminReportsCapacityGauges capacityBySlot={data.capacityBySlot} />
        <AdminReportsCheckinsChart scansByDay={data.scansByDay} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminReportsHeatmap
            registrations={heatmapRegistrations}
            registrationsByDay={data.registrationsByDay}
          />
        </div>
        <AdminReportsTopEvents rows={topEvents} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminReportsScanTable rows={[]} />
        </div>
        <AdminReportsScanDonut
          validScans={data.validScans}
          invalidScans={data.invalidScans}
          scansByResult={data.scansByResult}
        />
      </div>

      <AdminReportsFooter
        onRefresh={onRefresh}
        isRefreshing={isFetching}
        dataUpdatedAt={dataUpdatedAt}
      />
    </div>
  );
}
