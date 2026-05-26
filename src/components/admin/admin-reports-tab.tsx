"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { BarChart3 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminReportsFilters } from "@/components/admin/admin-reports-filters";
import { AdminReportsSection } from "@/components/admin/admin-reports-section";
import { exportReportsCsv } from "@/components/admin/admin-reports-utils";
import { ADMIN_PAGE_BG } from "@/components/admin/admin-theme";
import { useAdminFilterOptions } from "@/components/admin/use-admin-filter-options";
import { useAdminTableFilters } from "@/hooks/use-admin-table-filters";
import {
  adminListEvents,
  adminListSlots,
  adminReports,
} from "@/lib/admin.functions";
import { adminListQueryDefaults, adminReportsQueryDefaults } from "@/lib/admin-query";
import {
  emptyAdminTableFilters,
  toServerFilters,
  type AdminTableFilters,
} from "@/lib/admin-filters.types";
import { buildRegistrationFilterChips } from "@/lib/admin-filter-utils";

export function AdminReportsTab() {
  const [serverFilters, setServerFilters] = useState<AdminTableFilters>(emptyAdminTableFilters());

  const { data: eventsData } = useQuery({
    queryKey: ["a-events"],
    queryFn: () => adminListEvents(),
    ...adminListQueryDefaults,
  });
  const { data: slotsData } = useQuery({
    queryKey: ["a-slots"],
    queryFn: () => adminListSlots(),
    ...adminListQueryDefaults,
  });

  const { data, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["a-reports", serverFilters],
    queryFn: () => adminReports(toServerFilters(serverFilters)),
    ...adminReportsQueryDefaults,
  });

  const onServerApply = useCallback((f: AdminTableFilters) => {
    setServerFilters(f);
  }, []);

  const tableFilters = useAdminTableFilters({
    rows: data ? [data] : [],
    filterRow: () => true,
    onServerApply,
  });

  const { eventOptions, slotOptions, statusOptions, eventLabel, slotLabel } = useAdminFilterOptions(
    eventsData?.events ?? [],
    slotsData?.slots ?? [],
    tableFilters.filters,
  );

  const chips = buildRegistrationFilterChips(tableFilters.filters, eventLabel, slotLabel);

  const handleExport = useCallback(() => {
    if (!data) return;
    const f = tableFilters.filters;
    exportReportsCsv(
      data,
      f,
      f.eventId ? eventLabel(f.eventId) : undefined,
      f.slotId ? slotLabel(f.slotId) : undefined,
    );
  }, [data, tableFilters.filters, eventLabel, slotLabel]);

  const heatmapRegistrations = data?.heatmapRegistrations ?? [];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6" style={{ background: ADMIN_PAGE_BG }}>
      <AdminPageHeader
        icon={BarChart3}
        title="Reports"
        subtitle="Analyze registrations, guests, and scan activity across events."
      />

      <AdminReportsFilters
        filters={tableFilters.filters}
        onFiltersChange={tableFilters.setFilters}
        mode={tableFilters.mode}
        onModeChange={tableFilters.setMode}
        eventOptions={eventOptions}
        slotOptions={slotOptions}
        statusOptions={statusOptions}
        onApplyServer={tableFilters.applyServerFilter}
        onClearServer={tableFilters.clearServerFilters}
        chips={chips}
        onRemoveChip={tableFilters.removeChip}
        onClearAll={tableFilters.clearAll}
        hasActive={tableFilters.hasActive}
        applying={isFetching && tableFilters.mode === "server"}
        onExport={handleExport}
      />

      {tableFilters.mode === "local" && tableFilters.hasActive && (
        <p className="px-1 text-xs text-[#94a3b8]">
          Reports use server data — switch to Server mode and click Apply for filtered totals.
        </p>
      )}

      {isFetching && !data && (
        <p className="px-1 text-sm text-[#94a3b8]">Loading reports…</p>
      )}

      {data && (
        <AdminReportsSection
          data={data}
          events={(eventsData?.events ?? []).map((e) => ({
            id: e.id,
            name: e.name,
          }))}
          slots={(slotsData?.slots ?? []).map((s) => ({
            id: s.id,
            event_id: s.event_id,
          }))}
          heatmapRegistrations={heatmapRegistrations}
          isFetching={isFetching}
          dataUpdatedAt={dataUpdatedAt}
          onRefresh={() => refetch()}
        />
      )}
    </div>
  );
}
