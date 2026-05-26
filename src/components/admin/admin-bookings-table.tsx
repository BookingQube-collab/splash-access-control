"use client";

import { ExternalLink, MoreHorizontal, Pencil, RefreshCw } from "lucide-react";
import { ADMIN_CARD } from "@/components/admin/admin-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminBookingsPagination } from "@/components/admin/admin-bookings-pagination";
import {
  BOOKING_STATUS_STYLES,
  bookingDisplayStatus,
  formatBookingsUpdatedLabel,
  formatRegistrationWhen,
} from "@/components/admin/admin-bookings-utils";
import { formatSlotTimeHint, type AdminSlotRow } from "@/components/admin/admin-slots-utils";
import type { AdminRegistrationRow } from "@/lib/admin-filter-utils";
import { cn } from "@/lib/utils";

const HEADERS = [
  "Name",
  "Mobile",
  "Event",
  "Slot",
  "Guests",
  "Status",
  "When",
  "Action",
] as const;

const ACTION_BTN =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#334155] shadow-sm transition hover:border-[#cbd5e1] hover:bg-[#f8fafc]";

const KEBAB_BTN =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] shadow-sm transition hover:border-[#cbd5e1] hover:bg-[#f8fafc]";

function StatusPill({ status }: { status: string }) {
  const label = bookingDisplayStatus(status);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        BOOKING_STATUS_STYLES[label],
      )}
    >
      {label}
    </span>
  );
}

export function AdminBookingsTable({
  rows,
  slotsById,
  total,
  page,
  pageSize,
  mode,
  isFetching,
  dataUpdatedAt,
  onPageChange,
  onRefresh,
  onEdit,
  onDelete,
}: {
  rows: AdminRegistrationRow[];
  slotsById: Map<string, AdminSlotRow>;
  total: number;
  page: number;
  pageSize: number;
  mode: "local" | "server";
  isFetching: boolean;
  dataUpdatedAt?: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onEdit: (row: AdminRegistrationRow) => void;
  onDelete: (row: AdminRegistrationRow) => void;
}) {
  const countLabel =
    mode === "local"
      ? `Showing ${total} registration${total === 1 ? "" : "s"} (filtered in browser)`
      : `Showing ${total} registration${total === 1 ? "" : "s"}`;

  const updatedLabel = isFetching
    ? "Updating…"
    : formatBookingsUpdatedLabel(dataUpdatedAt);

  return (
    <div className={ADMIN_CARD}>
      <div className="flex flex-col gap-2 border-b border-[#f1f5f9] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm font-medium text-[#475569]">{countLabel}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-[#94a3b8]">{updatedLabel}</p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="grid h-8 w-8 place-items-center rounded-full border border-[#e2e8f0] bg-white text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#0d9488] disabled:opacity-50"
            aria-label="Refresh registrations"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#f1f5f9]">
              {HEADERS.map((h) => (
                <th
                  key={h}
                  className={cn(
                    "px-5 py-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8] first:pl-6 last:pr-6",
                    h === "Action" ? "text-right" : "text-left",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length} className="px-6 py-16 text-center text-[#64748b]">
                  No registrations match your filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const slotId = r.slot_id ?? r.slots?.id;
                const slotDetail = slotId ? slotsById.get(slotId) : undefined;
                const slotName = r.slots?.name ?? slotDetail?.name;
                const slotStartsAt =
                  slotDetail?.starts_at ?? r.slots?.starts_at ?? null;

                return (
                  <tr
                    key={r.id}
                    className="border-b border-[#f1f5f9] transition-colors last:border-0 hover:bg-[#f8fafc]/80"
                  >
                    <td className="px-5 py-5 pl-6 font-semibold text-[#134e4a]">
                      {r.customer_name}
                    </td>
                    <td className="px-5 py-5 text-[#64748b]">{r.mobile}</td>
                    <td className="px-5 py-5 font-medium text-[#475569]">
                      {r.slots?.events?.name ?? "—"}
                    </td>
                    <td className="px-5 py-5">
                      {slotName ? (
                        <div className="min-w-0">
                          <div className="font-semibold text-[#134e4a]">{slotName}</div>
                          {slotDetail ? (
                            <div className="text-xs text-[#64748b]">
                              {formatSlotTimeHint(slotDetail)}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[#94a3b8]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-5 text-base font-bold tabular-nums text-[#134e4a]">
                      {r.guest_count}
                    </td>
                    <td className="px-5 py-5">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-5 py-5 text-[#64748b]">
                      {formatRegistrationWhen(r.created_at, slotStartsAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-5 pr-6 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <a
                          href={`/pass/${r.qr_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0d9488] transition hover:text-[#0f766e] hover:underline"
                        >
                          Pass
                          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </a>
                        <button
                          type="button"
                          onClick={() => onEdit(r)}
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
                            <DropdownMenuItem onClick={() => onEdit(r)}>
                              Edit registration
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(r)}
                              className="text-[#dc2626] focus:text-[#dc2626]"
                            >
                              Delete registration
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

      <AdminBookingsPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
