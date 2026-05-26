"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminSlotsFilters } from "@/components/admin/admin-slots-filters";
import { AdminSlotFields, AdminSlotsForm } from "@/components/admin/admin-slots-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Clock4 } from "lucide-react";
import { AdminSlotsTable } from "@/components/admin/admin-slots-table";
import {
  deriveSlotStatus,
  eventEndYmd,
  eventStartYmd,
  filterSlotRowWithStatus,
  formatSlotDateTimeRange,
  formatYmdLabel,
  slotDatesWithinEvent,
  slotFormValuesFromRow,
  SLOT_STATUS_OPTIONS,
  type AdminSlotRow,
} from "@/components/admin/admin-slots-utils";
import { useAdminFilterOptions } from "@/components/admin/use-admin-filter-options";
import { useAdminTableFilters } from "@/hooks/use-admin-table-filters";
import {
  adminDeleteSlot,
  adminListEvents,
  adminListSlots,
  adminRegistrationSlotTotals,
  adminUpsertSlot,
} from "@/lib/admin.functions";
import { adminListQueryDefaults } from "@/lib/admin-query";
import {
  emptyAdminTableFilters,
  toServerFilters,
  type AdminTableFilters,
} from "@/lib/admin-filters.types";
import { buildSlotFilterChips } from "@/lib/admin-filter-utils";
import { formatActionError } from "@/lib/utils";
import type { SelectOption } from "@/components/searchable-select";
import type { AdminFilterChip } from "@/hooks/use-admin-table-filters";
import { ADMIN_TEAL } from "@/components/admin/admin-theme";

const PAGE_SIZE = 10;

type AdminEventRow = {
  id: string;
  name: string;
  start_date?: string | null;
  event_date?: string | null;
  end_date?: string | null;
};

function formatEventOptionLabel(e: AdminEventRow, fallback: string) {
  const startYmd = eventStartYmd(e, fallback);
  const endYmd = eventEndYmd(e, fallback);
  const startLabel = formatYmdLabel(startYmd) ?? "—";
  const endLabel = formatYmdLabel(endYmd) ?? "—";
  return `${e.name} · ${startLabel} → ${endLabel}`;
}

export function AdminSlotsSection() {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [eventId, setEventId] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("13:00");
  const [cap, setCap] = useState(50);
  const [visibleToGuests, setVisibleToGuests] = useState(true);
  const [page, setPage] = useState(1);
  const [viewSlot, setViewSlot] = useState<AdminSlotRow | null>(null);
  const [editSlot, setEditSlot] = useState<AdminSlotRow | null>(null);
  const [editEventId, setEditEventId] = useState("");
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("10:00");
  const [editEndTime, setEditEndTime] = useState("13:00");
  const [editCap, setEditCap] = useState(50);
  const [editVisibleToGuests, setEditVisibleToGuests] = useState(true);
  const [serverFilters, setServerFilters] = useState<AdminTableFilters>(
    emptyAdminTableFilters(),
  );

  const { data: eventsData } = useQuery({
    queryKey: ["a-events"],
    queryFn: () => adminListEvents(),
    ...adminListQueryDefaults,
  });
  const { data: slotsData, isFetching } = useQuery({
    queryKey: ["a-slots", serverFilters],
    queryFn: () => adminListSlots(toServerFilters(serverFilters)),
    ...adminListQueryDefaults,
  });
  const { data: regsData } = useQuery({
    queryKey: ["a-reg-slot-totals"],
    queryFn: () => adminRegistrationSlotTotals(),
    ...adminListQueryDefaults,
  });

  const events = (eventsData?.events ?? []) as AdminEventRow[];
  const rows = (slotsData?.slots ?? []) as AdminSlotRow[];

  const selectedEvent = events.find((e) => e.id === eventId);
  const editSelectedEvent = events.find((e) => e.id === editEventId);

  useEffect(() => {
    if (eventId || events.length === 0) return;
    const preferred = events.find((e) => e.name === "SummerSplash") ?? events[0];
    setEventId(preferred.id);
  }, [events, eventId]);

  useEffect(() => {
    if (!selectedEvent) return;
    setStartDate(eventStartYmd(selectedEvent, today));
    setEndDate(eventEndYmd(selectedEvent, today));
  }, [
    eventId,
    selectedEvent?.start_date,
    selectedEvent?.end_date,
    selectedEvent?.event_date,
    today,
  ]);

  const eventFormOptions: SelectOption[] = useMemo(
    () =>
      events.map((e) => {
        const label = formatEventOptionLabel(e, today);
        return { value: e.id, label, search: label };
      }),
    [events, today],
  );

  const onServerApply = useCallback((f: AdminTableFilters) => {
    setServerFilters(f);
    setPage(1);
  }, []);

  const tableFilters = useAdminTableFilters({
    rows,
    filterRow: filterSlotRowWithStatus,
    onServerApply,
  });

  const { eventOptions, slotOptions, eventLabel, slotLabel } = useAdminFilterOptions(
    events,
    rows,
    tableFilters.filters,
  );

  const statusOptions: SelectOption[] = useMemo(
    () => SLOT_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );

  const chips: AdminFilterChip[] = useMemo(() => {
    const base = buildSlotFilterChips(tableFilters.filters, eventLabel, slotLabel);
    if (tableFilters.filters.status) {
      base.push({
        key: "status",
        label: `Status: ${tableFilters.filters.status}`,
      });
    }
    return base;
  }, [tableFilters.filters, eventLabel, slotLabel]);

  const displayRows =
    tableFilters.mode === "local" ? tableFilters.filteredRows : rows;

  const bookedBySlotId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of regsData?.registrations ?? []) {
      const sid = (r as { slot_id?: string }).slot_id;
      if (!sid) continue;
      const guests = (r as { guest_count?: number }).guest_count ?? 1;
      map[sid] = (map[sid] ?? 0) + guests;
    }
    return map;
  }, [regsData?.registrations]);

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

  const createMutation = useMutation({
    mutationFn: () => {
      const starts_at = new Date(`${startDate}T${startTime}:00`).toISOString();
      const ends_at = new Date(`${endDate}T${endTime}:00`).toISOString();
      return adminUpsertSlot({
        event_id: eventId,
        name,
        starts_at,
        ends_at,
        capacity: cap,
        hidden_from_booking: !visibleToGuests,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["a-slots"] });
      toast.success("Slot created");
      setName("");
      setPage(1);
    },
    onError: (e: unknown) => toast.error(formatActionError(e)),
  });

  const visibilityMutation = useMutation({
    mutationFn: (slot: AdminSlotRow) =>
      adminUpsertSlot({
        id: slot.id,
        event_id: slot.event_id,
        name: slot.name,
        starts_at: slot.starts_at,
        ends_at: slot.ends_at,
        capacity: slot.capacity,
        hidden_from_booking: !(slot.hidden_from_booking ?? false),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["a-slots"] });
      toast.success("Slot visibility updated");
    },
    onError: (e: unknown) => toast.error(formatActionError(e)),
  });

  const editMutation = useMutation({
    mutationFn: () => {
      if (!editSlot) throw new Error("No slot selected");
      const starts_at = new Date(`${editStartDate}T${editStartTime}:00`).toISOString();
      const ends_at = new Date(`${editEndDate}T${editEndTime}:00`).toISOString();
      return adminUpsertSlot({
        id: editSlot.id,
        event_id: editEventId,
        name: editName,
        starts_at,
        ends_at,
        capacity: editCap,
        hidden_from_booking: !editVisibleToGuests,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["a-slots"] });
      toast.success("Slot updated");
      setEditSlot(null);
    },
    onError: (e: unknown) => toast.error(formatActionError(e)),
  });

  const handleCreate = () => {
    if (!eventId || !name) return toast.error("Pick an event and slot name");
    if (!selectedEvent) return toast.error("Pick a valid event");
    if (endDate < startDate) return toast.error("End date must be on or after start date");
    if (endTime <= startTime) return toast.error("End time must be after start time");
    if (!slotDatesWithinEvent(startDate, endDate, selectedEvent)) {
      const evStart = eventStartYmd(selectedEvent);
      const evEnd = eventEndYmd(selectedEvent);
      return toast.error(`Slot dates must fall within event range (${evStart} – ${evEnd})`);
    }
    createMutation.mutate();
  };

  const openEdit = (slot: AdminSlotRow) => {
    const values = slotFormValuesFromRow(slot);
    setEditSlot(slot);
    setEditEventId(values.eventId);
    setEditName(values.name);
    setEditStartDate(values.startDate);
    setEditEndDate(values.endDate);
    setEditStartTime(values.startTime);
    setEditEndTime(values.endTime);
    setEditCap(values.capacity);
    setEditVisibleToGuests(values.visibleToGuests);
  };

  const handleSaveEdit = () => {
    if (!editEventId || !editName.trim()) return toast.error("Pick an event and slot name");
    if (!editSelectedEvent) return toast.error("Pick a valid event");
    if (editEndDate < editStartDate) return toast.error("End date must be on or after start date");
    if (editEndTime <= editStartTime) return toast.error("End time must be after start time");
    if (!slotDatesWithinEvent(editStartDate, editEndDate, editSelectedEvent)) {
      const evStart = eventStartYmd(editSelectedEvent);
      const evEnd = eventEndYmd(editSelectedEvent);
      return toast.error(`Slot dates must fall within event range (${evStart} – ${evEnd})`);
    }
    editMutation.mutate();
  };

  const handleDelete = async (slot: AdminSlotRow) => {
    if (!confirm("Delete slot?")) return;
    try {
      await adminDeleteSlot({ id: slot.id });
      qc.invalidateQueries({ queryKey: ["a-slots"] });
      toast.success("Slot deleted");
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    }
  };

  const createEventDateMin = selectedEvent ? eventStartYmd(selectedEvent) : undefined;
  const createEventDateMax = selectedEvent ? eventEndYmd(selectedEvent) : undefined;
  const editEventDateMin = editSelectedEvent ? eventStartYmd(editSelectedEvent) : undefined;
  const editEventDateMax = editSelectedEvent ? eventEndYmd(editSelectedEvent) : undefined;
  const editDatesOutsideEvent =
    editSelectedEvent &&
    editStartDate &&
    editEndDate &&
    !slotDatesWithinEvent(editStartDate, editEndDate, editSelectedEvent);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <AdminPageHeader
        icon={Clock4}
        title="Slots & Capacity"
        subtitle="Create, manage and control event slots with capacity limits."
      />

      <AdminSlotsForm
        eventId={eventId}
        onEventIdChange={setEventId}
        eventOptions={eventFormOptions}
        name={name}
        onNameChange={setName}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        startTime={startTime}
        onStartTimeChange={setStartTime}
        endTime={endTime}
        onEndTimeChange={setEndTime}
        capacity={cap}
        onCapacityChange={setCap}
        visibleToGuests={visibleToGuests}
        onVisibleToGuestsChange={setVisibleToGuests}
        onCreate={handleCreate}
        creating={createMutation.isPending}
        eventDateMin={createEventDateMin}
        eventDateMax={createEventDateMax}
      />

      <AdminSlotsFilters
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

      <AdminSlotsTable
        slots={pageRows}
        bookedBySlotId={bookedBySlotId}
        page={safePage}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        onView={setViewSlot}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggleVisibility={(slot) => visibilityMutation.mutate(slot)}
        togglingVisibilityId={
          visibilityMutation.isPending ? visibilityMutation.variables?.id : undefined
        }
      />

      <Dialog open={!!editSlot} onOpenChange={(open) => !open && setEditSlot(null)}>
        <DialogContent className="max-w-lg rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-[#134e4a]">Edit slot</DialogTitle>
          </DialogHeader>
          <AdminSlotFields
            eventId={editEventId}
            onEventIdChange={setEditEventId}
            eventOptions={eventFormOptions}
            name={editName}
            onNameChange={setEditName}
            startDate={editStartDate}
            onStartDateChange={setEditStartDate}
            endDate={editEndDate}
            onEndDateChange={setEditEndDate}
            startTime={editStartTime}
            onStartTimeChange={setEditStartTime}
            endTime={editEndTime}
            onEndTimeChange={setEditEndTime}
            capacity={editCap}
            onCapacityChange={setEditCap}
            visibleToGuests={editVisibleToGuests}
            onVisibleToGuestsChange={setEditVisibleToGuests}
            eventDateMin={editEventDateMin}
            eventDateMax={editEventDateMax}
          />
          {editDatesOutsideEvent && editSelectedEvent && (
            <p className="text-xs font-medium text-[#d97706]">
              Slot dates are outside the event range (
              {eventStartYmd(editSelectedEvent)} – {eventEndYmd(editSelectedEvent)}). Adjust
              dates before saving.
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setEditSlot(null)}
              className="inline-flex h-10 items-center justify-center rounded-[14px] border border-[#e2e8f0] bg-white px-5 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={editMutation.isPending}
              onClick={handleSaveEdit}
              className="inline-flex h-10 items-center justify-center rounded-[14px] px-5 text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgba(13,148,136,0.45)] transition hover:brightness-105 disabled:opacity-60"
              style={{ background: ADMIN_TEAL }}
            >
              {editMutation.isPending ? "Saving…" : "Save changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewSlot} onOpenChange={(open) => !open && setViewSlot(null)}>
        <DialogContent className="max-w-md rounded-[20px]">
          {viewSlot && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-[#134e4a]">
                  {viewSlot.name}
                </DialogTitle>
              </DialogHeader>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4 border-b border-[#f1f5f9] py-2">
                  <dt className="text-[#64748b]">Event</dt>
                  <dd className="font-medium text-[#334155]">{viewSlot.events?.name ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-[#f1f5f9] py-2">
                  <dt className="text-[#64748b]">Schedule</dt>
                  <dd className="text-right font-medium text-[#334155]">
                    {formatSlotDateTimeRange(viewSlot)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-[#f1f5f9] py-2">
                  <dt className="text-[#64748b]">Capacity</dt>
                  <dd className="font-medium text-[#334155]">{viewSlot.capacity}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-[#f1f5f9] py-2">
                  <dt className="text-[#64748b]">Booked</dt>
                  <dd className="font-medium text-[#334155]">
                    {bookedBySlotId[viewSlot.id] ?? 0} guests
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-[#f1f5f9] py-2">
                  <dt className="text-[#64748b]">Status</dt>
                  <dd className="font-medium text-[#334155]">{deriveSlotStatus(viewSlot)}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-[#64748b]">Guest / POS booking</dt>
                  <dd className="font-medium text-[#334155]">
                    {viewSlot.hidden_from_booking ? "Hidden" : "Visible"}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
