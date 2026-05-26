"use client";

import {
  Calendar,
  Car,
  Eye,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
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
import { Switch } from "@/components/ui/switch";
import { ADMIN_CARD } from "@/components/admin/admin-theme";
import { AdminSlotsPagination } from "@/components/admin/admin-slots-pagination";
import {
  EVENT_ICON_VARIANTS,
  SLOT_STATUS_STYLES,
  deriveSlotStatus,
  formatSlotCreatedOn,
  formatSlotDateTimeRange,
  formatSlotTimeHint,
  slotBookedPct,
  type AdminSlotRow,
  type SlotDisplayStatus,
} from "@/components/admin/admin-slots-utils";
import { cn } from "@/lib/utils";

const HEADERS = [
  "Slot Name",
  "Event",
  "Date & Time",
  "Capacity",
  "Booked",
  "Guests / POS",
  "Status",
  "Created On",
  "Actions",
] as const;

const HIDDEN_BADGE = "inline-flex rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#b45309]";

const ACTION_BTN =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#334155] shadow-sm transition hover:border-[#cbd5e1] hover:bg-[#f8fafc]";

const KEBAB_BTN =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] shadow-sm transition hover:border-[#cbd5e1] hover:bg-[#f8fafc]";

function SlotIcon({ index }: { index: number }) {
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

function StatusPill({ status }: { status: SlotDisplayStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        SLOT_STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

export function AdminSlotsTable({
  slots,
  bookedBySlotId,
  page,
  pageSize,
  total,
  onPageChange,
  onView,
  onEdit,
  onDelete,
  onToggleVisibility,
  togglingVisibilityId,
}: {
  slots: AdminSlotRow[];
  bookedBySlotId: Record<string, number>;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onView: (slot: AdminSlotRow) => void;
  onEdit: (slot: AdminSlotRow) => void;
  onDelete: (slot: AdminSlotRow) => void;
  onToggleVisibility: (slot: AdminSlotRow) => void;
  togglingVisibilityId?: string;
}) {
  return (
    <div className={ADMIN_CARD}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
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
            {slots.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length} className="px-6 py-16 text-center text-[#64748b]">
                  No slots match your filters.
                </td>
              </tr>
            ) : (
              slots.map((s, idx) => {
                const status = deriveSlotStatus(s);
                const booked = bookedBySlotId[s.id] ?? 0;
                const pct = slotBookedPct(booked, s.capacity);
                return (
                  <tr
                    key={s.id}
                    className="border-b border-[#f1f5f9] transition-colors last:border-0 hover:bg-[#f8fafc]/80"
                  >
                    <td className="px-5 py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <SlotIcon index={idx} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[#134e4a]">{s.name}</span>
                            {s.hidden_from_booking ? (
                              <span className={HIDDEN_BADGE}>Hidden</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-[#64748b]">{formatSlotTimeHint(s)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-[#475569]">
                        <Calendar className="h-4 w-4 shrink-0 text-[#94a3b8]" />
                        <span className="font-medium">{s.events?.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[#475569]">{formatSlotDateTimeRange(s)}</td>
                    <td className="px-5 py-4 font-medium tabular-nums text-[#334155]">
                      {s.capacity}
                    </td>
                    <td className="px-5 py-4 font-medium tabular-nums text-[#334155]">
                      {booked > 0 ? (
                        <>
                          {booked}{" "}
                          <span className="text-[#64748b] font-normal">({pct}%)</span>
                        </>
                      ) : (
                        <span className="text-[#94a3b8]">0</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Switch
                        checked={!(s.hidden_from_booking ?? false)}
                        disabled={togglingVisibilityId === s.id}
                        onCheckedChange={() => onToggleVisibility(s)}
                        aria-label={`${s.name} visible to guests and POS`}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill status={status} />
                    </td>
                    <td className="px-5 py-4 text-[#64748b]">
                      {formatSlotCreatedOn(
                        (s as AdminSlotRow & { created_at?: string }).created_at,
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 pr-6 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button type="button" onClick={() => onView(s)} className={ACTION_BTN}>
                          <Eye className="h-3.5 w-3.5 shrink-0 text-[#64748b]" />
                          View
                        </button>
                        <button type="button" onClick={() => onEdit(s)} className={ACTION_BTN}>
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
                            <DropdownMenuItem onClick={() => onView(s)}>View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(s)}>Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(s)}
                              className="text-[#dc2626] focus:text-[#dc2626]"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
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
      <AdminSlotsPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
