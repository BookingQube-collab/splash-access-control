"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminEventsFilters } from "@/components/admin/admin-events-filters";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CalendarDays } from "lucide-react";
import {
  AdminEventsTable,
  type EventRowMetrics,
} from "@/components/admin/admin-events-table";
import {
  adminDeleteEvent,
  adminListEvents,
  adminListSlots,
  adminRegistrationSlotTotals,
  adminUpsertEvent,
} from "@/lib/admin.functions";
import { adminListQueryDefaults } from "@/lib/admin-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ADMIN_TEAL } from "@/components/admin/admin-theme";
import {
  deriveEventStatus,
  formatEventDateRange,
  eventDateRange,
  eventOverlapsFilter,
  mergeFilterRangeForEvent,
  slotTotalCapacity,
  type AdminEventRow,
} from "@/components/admin/admin-events-utils";
import { format } from "date-fns";

const PAGE_SIZE = 5;

const pillInput =
  "h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white px-3.5 text-sm font-medium text-[#134e4a] shadow-sm outline-none transition placeholder:text-[#94a3b8] hover:border-[#cbd5e1] focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15";

function eventYmd(e: AdminEventRow, fallback: string) {
  return (e.start_date ?? e.event_date ?? fallback).slice(0, 10);
}

function eventEndYmd(e: AdminEventRow, fallback: string) {
  return (e.end_date ?? e.event_date ?? fallback).slice(0, 10);
}

export function AdminEventsSection() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("SummerSplash");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [createStart, setCreateStart] = useState(today);
  const [createEnd, setCreateEnd] = useState(today);
  const [page, setPage] = useState(1);
  const [viewEvent, setViewEvent] = useState<AdminEventRow | null>(null);
  const [editEvent, setEditEvent] = useState<AdminEventRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState(today);
  const [editEnd, setEditEnd] = useState(today);
  const [editActive, setEditActive] = useState(true);

  const { data } = useQuery({
    queryKey: ["a-events"],
    queryFn: () => adminListEvents(),
    ...adminListQueryDefaults,
  });
  const { data: slotsData } = useQuery({
    queryKey: ["a-slots"],
    queryFn: () => adminListSlots(),
    ...adminListQueryDefaults,
  });
  const { data: regsData } = useQuery({
    queryKey: ["a-reg-slot-totals"],
    queryFn: () => adminRegistrationSlotTotals(),
    ...adminListQueryDefaults,
  });

  const events = (data?.events ?? []) as AdminEventRow[];

  const metricsByEventId = useMemo(() => {
    const eventsById = Object.fromEntries(events.map((e) => [e.id, e]));
    const map: Record<string, EventRowMetrics> = {};
    for (const s of slotsData?.slots ?? []) {
      const eid = (s as { event_id?: string }).event_id;
      if (!eid) continue;
      if (!map[eid]) map[eid] = { slots: 0, bookings: 0, capacity: 0 };
      map[eid].slots += 1;
      const perDay = Number((s as { capacity?: number }).capacity ?? 0);
      const event = eventsById[eid];
      map[eid].capacity += event ? slotTotalCapacity(perDay, event) : perDay;
    }
    const slotEventById = Object.fromEntries(
      (slotsData?.slots ?? []).map((s) => [(s as { id: string }).id, (s as { event_id?: string }).event_id]),
    );
    for (const r of regsData?.registrations ?? []) {
      const sid = (r as { slot_id?: string }).slot_id;
      const eid = sid ? slotEventById[sid] : undefined;
      if (!eid || !map[eid]) continue;
      map[eid].bookings += 1;
    }
    return map;
  }, [events, slotsData?.slots, regsData?.registrations]);

  const filtered = useMemo(() => {
    return events.filter((e) => eventOverlapsFilter(e, filterStart, filterEnd));
  }, [events, filterStart, filterEnd]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const m = useMutation({
    mutationFn: () =>
      adminUpsertEvent({
        name: name.trim(),
        start_date: createStart,
        end_date: createEnd,
        is_active: true,
      }),
    onSuccess: () => {
      toast.success("Event saved");
      qc.invalidateQueries({ queryKey: ["a-events"] });
      setPage(1);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editEvent) throw new Error("No event selected");
      const start = editStart;
      const end = editEnd;
      await adminUpsertEvent({
        id: editEvent.id,
        name: editName.trim(),
        start_date: start,
        end_date: end,
        is_active: editActive,
      });
      return { start, end };
    },
    onSuccess: ({ start, end }) => {
      toast.success("Event updated");
      const nextRange = mergeFilterRangeForEvent(filterStart, filterEnd, start, end);
      setFilterStart(nextRange.start);
      setFilterEnd(nextRange.end);
      setPage(1);
      qc.invalidateQueries({ queryKey: ["a-events"] });
      setEditEvent(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = (e: AdminEventRow) => {
    setEditEvent(e);
    setEditName(e.name);
    setEditStart(eventYmd(e, today));
    setEditEnd(eventEndYmd(e, today));
    setEditActive(e.is_active);
  };

  const handleToggleActive = async (e: AdminEventRow) => {
    await adminUpsertEvent({
      id: e.id,
      name: e.name,
      start_date: (e.start_date ?? e.event_date ?? today).slice(0, 10),
      end_date: (e.end_date ?? e.event_date ?? today).slice(0, 10),
      is_active: !e.is_active,
    });
    qc.invalidateQueries({ queryKey: ["a-events"] });
    toast.success(e.is_active ? "Event deactivated" : "Event activated");
  };

  const handleDelete = async (e: AdminEventRow) => {
    if (!confirm(`Delete "${e.name}"?`)) return;
    await adminDeleteEvent({ id: e.id });
    qc.invalidateQueries({ queryKey: ["a-events"] });
    toast.success("Event deleted");
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <AdminPageHeader
        icon={CalendarDays}
        title="Events"
        subtitle="Create, manage and track all your events in one place."
      />

      {events.length > 0 && filtered.length === 0 ? (
        <div className="rounded-[14px] border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-sm text-[#9a3412]">
          <span className="font-semibold">{events.length} event(s)</span> exist but none overlap the
          date filter
          {filterStart || filterEnd
            ? ` (${filterStart || "…"} – ${filterEnd || "…"})`
            : ""}
          .{" "}
          <button
            type="button"
            className="font-semibold text-[#c2410c] underline hover:no-underline"
            onClick={() => {
              setFilterStart("");
              setFilterEnd("");
              setPage(1);
            }}
          >
            Show all events
          </button>
        </div>
      ) : null}

      <AdminEventsFilters
        events={events}
        name={name}
        onNameChange={setName}
        start={filterStart}
        onStartChange={(v) => {
          setFilterStart(v);
          setPage(1);
        }}
        end={filterEnd}
        onEndChange={(v) => {
          setFilterEnd(v);
          setPage(1);
        }}
        onClearDates={() => {
          setFilterStart("");
          setFilterEnd("");
          setPage(1);
        }}
        onAdd={() => {
          if (!name.trim()) return toast.error("Event name is required");
          if (createEnd < createStart)
            return toast.error("End date must be on or after start date");
          m.mutate();
        }}
        adding={m.isPending}
      />

      <AdminEventsTable
        events={pageRows}
        metricsByEventId={metricsByEventId}
        page={safePage}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        onView={setViewEvent}
        onEdit={openEdit}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
        emptyMessage={
          events.length === 0
            ? "No events yet. Create one above."
            : "No events match the date filter. Try Show all dates or widen the range."
        }
      />

      <Dialog open={!!editEvent} onOpenChange={(open) => !open && setEditEvent(null)}>
        <DialogContent className="max-w-md rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-[#134e4a]">Edit event</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">Event name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={pillInput}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
                  Start date
                </Label>
                <Input
                  type="date"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className={pillInput}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">End date</Label>
                <Input
                  type="date"
                  value={editEnd}
                  min={editStart}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className={pillInput}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-[#334155]">Active</div>
                <div className="text-xs text-[#64748b]">When off, event shows as draft/cancelled</div>
              </div>
              <Switch checked={editActive} onCheckedChange={setEditActive} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setEditEvent(null)}
              className="inline-flex h-10 items-center justify-center rounded-[14px] border border-[#e2e8f0] bg-white px-5 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={editMutation.isPending}
              onClick={() => {
                if (!editName.trim()) return toast.error("Event name is required");
                if (editEnd < editStart)
                  return toast.error("End date must be on or after start date");
                editMutation.mutate();
              }}
              className="inline-flex h-10 items-center justify-center rounded-[14px] px-5 text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgba(13,148,136,0.45)] transition hover:brightness-105 disabled:opacity-60"
              style={{ background: ADMIN_TEAL }}
            >
              {editMutation.isPending ? "Saving…" : "Save changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewEvent} onOpenChange={(open) => !open && setViewEvent(null)}>
        <DialogContent className="max-w-md rounded-[20px]">
          {viewEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-[#134e4a]">
                  {viewEvent.name}
                </DialogTitle>
              </DialogHeader>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4 border-b border-[#f1f5f9] py-2">
                  <dt className="text-[#64748b]">Date range</dt>
                  <dd className="font-medium text-[#334155]">{formatEventDateRange(viewEvent)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-[#f1f5f9] py-2">
                  <dt className="text-[#64748b]">Status</dt>
                  <dd className="font-medium text-[#334155]">{deriveEventStatus(viewEvent)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-[#f1f5f9] py-2">
                  <dt className="text-[#64748b]">Active flag</dt>
                  <dd className="font-medium text-[#334155]">
                    {viewEvent.is_active ? "Yes" : "No"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-[#64748b]">Created window</dt>
                  <dd className="font-medium text-[#334155]">
                    {format(eventDateRange(viewEvent).start, "MMM d, yyyy")} –{" "}
                    {format(eventDateRange(viewEvent).end, "MMM d, yyyy")}
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
