"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminBookingsEditDialog, type BookingEditForm } from "@/components/admin/admin-bookings-edit-dialog";
import { AdminBookingsFilters } from "@/components/admin/admin-bookings-filters";
import { AdminBookingsStats } from "@/components/admin/admin-bookings-stats";
import { AdminBookingsTable } from "@/components/admin/admin-bookings-table";
import { computeBookingStats } from "@/components/admin/admin-bookings-utils";
import { useAdminNavigation } from "@/components/admin/admin-navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { AdminSlotRow } from "@/components/admin/admin-slots-utils";
import { useAdminFilterOptions } from "@/components/admin/use-admin-filter-options";
import { useAdminTableFilters } from "@/hooks/use-admin-table-filters";
import {
  adminDeleteRegistration,
  adminListEvents,
  adminListRegistrations,
  adminListSlots,
  adminUpdateRegistration,
} from "@/lib/admin.functions";
import { adminListQueryDefaults } from "@/lib/admin-query";
import { formatActionError } from "@/lib/utils";
import {
  buildRegistrationFilterChips,
  filterRegistrationRow,
  type AdminRegistrationRow,
} from "@/lib/admin-filter-utils";
import {
  emptyAdminTableFilters,
  toServerFilters,
  type AdminTableFilters,
} from "@/lib/admin-filters.types";

const PAGE_SIZE = 12;

export function AdminBookingsSection() {
  const qc = useQueryClient();
  const { consumeBookingsSearch } = useAdminNavigation();
  const [serverFilters, setServerFilters] = useState<AdminTableFilters>(emptyAdminTableFilters());
  const [page, setPage] = useState(1);
  const [editRow, setEditRow] = useState<AdminRegistrationRow | null>(null);
  const [saving, setSaving] = useState(false);

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
    queryKey: ["a-regs", serverFilters],
    queryFn: () => adminListRegistrations(toServerFilters(serverFilters)),
    ...adminListQueryDefaults,
  });

  const rows = (data?.registrations ?? []) as unknown as AdminRegistrationRow[];
  const events = eventsData?.events ?? [];
  const slots = slotsData?.slots ?? [];

  const slotsById = useMemo(() => {
    const map = new Map<string, AdminSlotRow>();
    for (const slot of slots) {
      if (slot.id && slot.starts_at && slot.ends_at) {
        map.set(slot.id, slot as AdminSlotRow);
      }
    }
    return map;
  }, [slots]);

  const onServerApply = useCallback((f: AdminTableFilters) => {
    setServerFilters(f);
    setPage(1);
  }, []);

  const tableFilters = useAdminTableFilters({
    rows,
    filterRow: filterRegistrationRow,
    onServerApply,
  });

  const { eventOptions, slotOptions, statusOptions, eventLabel, slotLabel } = useAdminFilterOptions(
    events,
    slots,
    tableFilters.filters,
  );

  const allSlotOptions = useAdminFilterOptions(events, slots, emptyAdminTableFilters()).slotOptions;

  const invalidateRegistrations = () => {
    void qc.invalidateQueries({ queryKey: ["a-regs"] });
    void qc.invalidateQueries({ queryKey: ["a-slots"] });
  };

  const handleSaveEdit = async (form: BookingEditForm) => {
    if (!editRow) return;
    if (!form.customer_name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.mobile.trim()) {
      toast.error("Mobile is required");
      return;
    }
    if (!form.slot_id) {
      toast.error("Slot is required");
      return;
    }
    setSaving(true);
    try {
      await adminUpdateRegistration({
        id: editRow.id,
        customer_name: form.customer_name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim() || null,
        guest_count: form.guest_count,
        slot_id: form.slot_id,
        status: form.status as
          | "active"
          | "entered"
          | "exited"
          | "auto_exited"
          | "expired"
          | "invalid",
      });
      toast.success("Registration updated");
      setEditRow(null);
      invalidateRegistrations();
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: AdminRegistrationRow) => {
    const label = row.customer_name || row.mobile;
    if (!confirm(`Delete registration for ${label}? This frees ${row.guest_count} spot(s) on the slot.`)) {
      return;
    }
    try {
      await adminDeleteRegistration({ id: row.id });
      toast.success("Registration deleted");
      invalidateRegistrations();
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    }
  };

  const chips = buildRegistrationFilterChips(tableFilters.filters, eventLabel, slotLabel);
  const displayRows =
    tableFilters.mode === "local" ? tableFilters.filteredRows : rows;

  const stats = useMemo(() => computeBookingStats(displayRows), [displayRows]);

  const total = displayRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = displayRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [
    tableFilters.filters.search,
    tableFilters.filters.eventId,
    tableFilters.filters.slotId,
    tableFilters.filters.status,
    tableFilters.filters.dateFrom,
    tableFilters.filters.dateTo,
    tableFilters.mode,
  ]);

  useEffect(() => {
    const search = consumeBookingsSearch();
    if (search) {
      tableFilters.setFilters({ search });
    }
    // Apply pending search once when the Bookings tab mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <AdminPageHeader
        icon={CalendarCheck}
        title="Bookings"
        subtitle="View and filter guest registrations across events and slots."
        action={
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("admin-bookings-filters")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="grid h-11 w-11 place-items-center rounded-full border border-white/80 bg-white/95 text-[#0f766e] shadow-sm ring-1 ring-[#0d9488]/15 transition hover:bg-white"
            aria-label="Jump to filters"
          >
            <SlidersHorizontal className="h-5 w-5" strokeWidth={2.25} />
          </button>
        }
      />

      <AdminBookingsStats stats={stats} />

      <AdminBookingsFilters
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
      />

      <AdminBookingsTable
        rows={pageRows}
        slotsById={slotsById}
        total={total}
        page={safePage}
        pageSize={PAGE_SIZE}
        mode={tableFilters.mode}
        isFetching={isFetching}
        dataUpdatedAt={dataUpdatedAt}
        onPageChange={setPage}
        onRefresh={() => void refetch()}
        onEdit={setEditRow}
        onDelete={(row) => void handleDelete(row)}
      />

      <AdminBookingsEditDialog
        row={editRow}
        slotOptions={allSlotOptions}
        statusOptions={statusOptions}
        saving={saving}
        onClose={() => setEditRow(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
