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
import { AdminDeleteAllRegistrationsDialog, AdminDeleteAllRegistrationsTrigger } from "@/components/admin/admin-delete-all-registrations-dialog";
import {
  adminDeleteAllRegistrations,
  adminDeleteRegistration,
  adminListEvents,
  adminListRegistrations,
  adminListSlots,
  adminRegistrationBookingStats,
  adminResendDigitalPassEmail,
  adminUpdateRegistration,
} from "@/lib/admin.functions";
import { adminListQueryDefaults } from "@/lib/admin-query";
import { formatActionError, todayYmd } from "@/lib/utils";
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
const LOCAL_FETCH_LIMIT = 500;
const SERVER_FILTER_DEBOUNCE_MS = 350;

function defaultBookingsFilters(): AdminTableFilters {
  const today = todayYmd();
  return { ...emptyAdminTableFilters(), dateFrom: today, dateTo: today };
}

export function AdminBookingsSection() {
  const qc = useQueryClient();
  const { consumeBookingsSearch } = useAdminNavigation();
  const [serverFilters, setServerFilters] = useState<AdminTableFilters>(defaultBookingsFilters);
  const [page, setPage] = useState(1);
  const [editRow, setEditRow] = useState<AdminRegistrationRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllScope, setDeleteAllScope] = useState<"all" | "filtered">("all");

  const serverFilterPayload = useMemo(() => toServerFilters(serverFilters), [serverFilters]);

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

  const onServerApply = useCallback((f: AdminTableFilters) => {
    setServerFilters(f);
    setPage(1);
  }, []);

  const tableFilters = useAdminTableFilters({
    mode: "server",
    initialFilters: defaultBookingsFilters(),
    rows: [],
    filterRow: filterRegistrationRow,
    onServerApply,
  });

  const listPageSize = PAGE_SIZE;

  const { data, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["a-regs", serverFilterPayload, page, listPageSize],
    queryFn: () =>
      adminListRegistrations(serverFilterPayload, {
        page,
        pageSize: listPageSize,
      }),
    enabled: tableFilters.mode === "server",
    ...adminListQueryDefaults,
  });

  const rows = (data?.registrations ?? []) as unknown as AdminRegistrationRow[];
  const serverTotal = data?.total ?? 0;

  const { data: statsData, isFetching: statsFetching } = useQuery({
    queryKey: ["a-regs-stats", serverFilterPayload],
    queryFn: () => adminRegistrationBookingStats(serverFilterPayload),
    enabled: tableFilters.mode === "server",
    ...adminListQueryDefaults,
  });

  const { data: localBulkData, isFetching: localBulkFetching } = useQuery({
    queryKey: ["a-regs-local", serverFilterPayload],
    queryFn: () =>
      adminListRegistrations(serverFilterPayload, {
        page: 1,
        pageSize: LOCAL_FETCH_LIMIT,
      }),
    enabled: tableFilters.mode === "local",
    ...adminListQueryDefaults,
  });

  const localRows = (localBulkData?.registrations ?? []) as unknown as AdminRegistrationRow[];

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

  useEffect(() => {
    if (tableFilters.mode !== "server") return;
    const timer = window.setTimeout(() => {
      onServerApply({ ...tableFilters.filters, search: tableFilters.debouncedSearch });
    }, SERVER_FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [
    tableFilters.mode,
    tableFilters.filters,
    tableFilters.debouncedSearch,
    onServerApply,
  ]);

  const { eventOptions, slotOptions, statusOptions, eventLabel, slotLabel } = useAdminFilterOptions(
    events,
    slots,
    tableFilters.filters,
  );

  const allSlotOptions = useAdminFilterOptions(events, slots, emptyAdminTableFilters()).slotOptions;

  const invalidateRegistrations = () => {
    void qc.invalidateQueries({ queryKey: ["a-regs"] });
    void qc.invalidateQueries({ queryKey: ["a-regs-stats"] });
    void qc.invalidateQueries({ queryKey: ["a-regs-local"] });
    void qc.invalidateQueries({ queryKey: ["a-slots"] });
    void qc.invalidateQueries({ queryKey: ["a-reg-slot-totals"] });
    void qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const hasFilterScope = useMemo(() => {
    const f = serverFilters;
    return Boolean(
      f.search?.trim() ||
        f.eventId ||
        f.slotId ||
        f.status ||
        f.dateFrom ||
        f.dateTo,
    );
  }, [serverFilters]);

  const openBulkDelete = (scope: "all" | "filtered") => {
    setDeleteAllScope(scope);
    setDeleteAllOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    const res = await adminDeleteAllRegistrations({
      confirmPhrase: "DELETE ALL",
      scope: deleteAllScope,
      filters: deleteAllScope === "filtered" ? serverFilterPayload : undefined,
    });
    toast.success(`Deleted ${res.deleted.toLocaleString()} registration(s)`);
    setPage(1);
    invalidateRegistrations();
    await refetch();
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

  const handleResend = async (row: AdminRegistrationRow) => {
    if (!row.email?.trim()) {
      toast.error("This registration has no email address");
      return;
    }
    setResendingId(row.id);
    try {
      await adminResendDigitalPassEmail({ id: row.id });
      toast.success(`Pass email sent to ${row.email}`);
      invalidateRegistrations();
    } catch (e: unknown) {
      toast.error(formatActionError(e));
      invalidateRegistrations();
    } finally {
      setResendingId(null);
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

  const localFilteredRows = useMemo(() => {
    if (tableFilters.mode !== "local") return [];
    const local = { ...tableFilters.filters, search: tableFilters.debouncedSearch };
    return localRows.filter((row) =>
      filterRegistrationRow(row, local, tableFilters.debouncedSearch),
    );
  }, [
    tableFilters.mode,
    localRows,
    tableFilters.filters,
    tableFilters.debouncedSearch,
  ]);

  const displayRows = tableFilters.mode === "server" ? rows : localFilteredRows;

  const stats = useMemo(() => {
    if (tableFilters.mode === "server" && statsData?.stats) {
      return statsData.stats;
    }
    return computeBookingStats(displayRows);
  }, [tableFilters.mode, statsData?.stats, displayRows]);

  const total =
    tableFilters.mode === "server" ? serverTotal : displayRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows =
    tableFilters.mode === "server"
      ? displayRows
      : displayRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
    serverFilterPayload,
  ]);

  useEffect(() => {
    const search = consumeBookingsSearch();
    if (search) {
      tableFilters.setFilters({ search });
      if (tableFilters.mode === "server") {
        onServerApply({ ...tableFilters.filters, search });
      }
    }
    // Apply pending search once when the Bookings tab mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tableFilters.mode !== "local") return;
    onServerApply(tableFilters.filters);
  }, [tableFilters.mode]);

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
        onClearServer={() => {
          const empty = defaultBookingsFilters();
          tableFilters.clearServerFilters();
          onServerApply(empty);
        }}
        chips={chips}
        onRemoveChip={tableFilters.removeChip}
        onClearAll={tableFilters.clearAll}
        hasActive={tableFilters.hasActive}
        applying={
          tableFilters.mode === "server"
            ? isFetching || statsFetching
            : localBulkFetching
        }
        bulkDeleteSlot={
          <div className="flex flex-wrap items-center gap-2">
            {hasFilterScope && tableFilters.mode === "server" ? (
              <AdminDeleteAllRegistrationsTrigger
                variant="filtered"
                label={`Delete filtered (${total.toLocaleString()})`}
                onClick={() => openBulkDelete("filtered")}
              />
            ) : null}
            <AdminDeleteAllRegistrationsTrigger
              variant="all"
              label="Delete all registrations"
              onClick={() => openBulkDelete("all")}
            />
          </div>
        }
      />

      <AdminDeleteAllRegistrationsDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        scope={deleteAllScope}
        matchCount={deleteAllScope === "filtered" ? total : stats.total}
        onConfirm={handleBulkDeleteConfirm}
      />

      <AdminBookingsTable
        rows={pageRows}
        slotsById={slotsById}
        total={total}
        page={safePage}
        pageSize={PAGE_SIZE}
        mode={tableFilters.mode}
        isFetching={isFetching || localBulkFetching}
        dataUpdatedAt={dataUpdatedAt}
        onPageChange={setPage}
        onRefresh={() => void refetch()}
        onEdit={setEditRow}
        onDelete={(row) => void handleDelete(row)}
        onResend={(row) => void handleResend(row)}
        resendingId={resendingId}
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
