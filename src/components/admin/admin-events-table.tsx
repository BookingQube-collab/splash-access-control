"use client";

import {
  Calendar,
  Car,
  Eye,
  MoreHorizontal,
  Pencil,
  Star,
  User,
  Waves,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADMIN_CARD } from "@/components/admin/admin-theme";
import { AdminEventsPagination } from "@/components/admin/admin-events-pagination";
import {
  EVENT_ICON_VARIANTS,
  EVENT_STATUS_STYLES,
  deriveEventStatus,
  formatEventDateRange,
  formatEventTimeHint,
  type AdminEventRow,
  type EventDisplayStatus,
} from "@/components/admin/admin-events-utils";
import { cn } from "@/lib/utils";

const HEADERS = [
  "Event name",
  "Date range",
  "Status",
  "Slots",
  "Bookings",
  "Capacity",
  "Actions",
] as const;

const ACTION_BTN =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#334155] shadow-sm transition hover:border-[#cbd5e1] hover:bg-[#f8fafc]";

const KEBAB_BTN =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] shadow-sm transition hover:border-[#cbd5e1] hover:bg-[#f8fafc]";

function EventIcon({ index }: { index: number }) {
  const v = EVENT_ICON_VARIANTS[index % EVENT_ICON_VARIANTS.length];
  const Icon =
    v.key === "car" ? Car : v.key === "person" ? User : v.key === "star" ? Star : Waves;
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full",
        v.bg,
        v.text,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.25} />
    </span>
  );
}

function StatusPill({ status }: { status: EventDisplayStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        EVENT_STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

export type EventRowMetrics = {
  slots: number;
  bookings: number;
  capacity: number;
};

export function AdminEventsTable({
  events,
  metricsByEventId,
  page,
  pageSize,
  total,
  onPageChange,
  onView,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  events: AdminEventRow[];
  metricsByEventId: Record<string, EventRowMetrics>;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onView: (e: AdminEventRow) => void;
  onEdit: (e: AdminEventRow) => void;
  onToggleActive: (e: AdminEventRow) => void;
  onDelete: (e: AdminEventRow) => void;
}) {
  return (
    <div className={ADMIN_CARD}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#f1f5f9]">
              {HEADERS.map((h) => (
                <th
                  key={h}
                  className={cn(
                    "px-5 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8] first:pl-6 last:pr-6",
                    h === "Actions" ? "text-right" : "text-left",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length} className="px-6 py-16 text-center text-[#64748b]">
                  No events match your filters.
                </td>
              </tr>
            ) : (
              events.map((e, idx) => {
                const status = deriveEventStatus(e);
                const metrics = metricsByEventId[e.id] ?? {
                  slots: 0,
                  bookings: 0,
                  capacity: 0,
                };
                return (
                  <tr
                    key={e.id}
                    className="border-b border-[#f1f5f9] transition-colors last:border-0 hover:bg-[#f8fafc]/80"
                  >
                    <td className="px-5 py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <EventIcon index={idx} />
                        <div className="min-w-0">
                          <div className="font-semibold text-[#134e4a]">{e.name}</div>
                          <div className="text-xs text-[#64748b]">{formatEventTimeHint(e)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-[#475569]">
                        <Calendar className="h-4 w-4 shrink-0 text-[#94a3b8]" />
                        <span>{formatEventDateRange(e)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill status={status} />
                    </td>
                    <td className="px-5 py-4 font-medium tabular-nums text-[#334155]">
                      {metrics.slots}
                    </td>
                    <td className="px-5 py-4 font-medium tabular-nums text-[#334155]">
                      {metrics.bookings}
                    </td>
                    <td
                      className="px-5 py-4 font-medium tabular-nums text-[#334155]"
                      title={
                        metrics.capacity > 0
                          ? "Total capacity (per-day slot capacity × event days, summed across slots)"
                          : undefined
                      }
                    >
                      {metrics.capacity > 0 ? metrics.capacity.toLocaleString() : "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 pr-6 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onView(e)}
                          className={ACTION_BTN}
                        >
                          <Eye className="h-3.5 w-3.5 shrink-0 text-[#64748b]" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(e)}
                          className={ACTION_BTN}
                        >
                          <Pencil className="h-3.5 w-3.5 shrink-0 text-[#64748b]" />
                          Edit
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={KEBAB_BTN}
                              aria-label="More actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => onEdit(e)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onToggleActive(e)}>
                              {e.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(e)}
                              className="text-[#dc2626] focus:text-[#dc2626]"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <AdminEventsPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
