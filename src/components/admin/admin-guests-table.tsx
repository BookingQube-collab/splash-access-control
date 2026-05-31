"use client";

import { Check, MoreHorizontal, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADMIN_CARD } from "@/components/admin/admin-theme";
import { AdminGuestsPagination } from "@/components/admin/admin-guests-pagination";
import {
  STAFF_ROLES,
  formatGuestDateLines,
  guestAvatarPalette,
  guestDisplayName,
  guestInitials,
  guestLastActiveAt,
  isGuestActive,
  type AdminGuestRow,
  type StaffRole,
} from "@/components/admin/admin-guests-utils";
import { cn } from "@/lib/utils";

const HEADERS = [
  "Guest",
  "Role(s)",
  "Status",
  "Last Active",
  "Joined On",
  "Actions",
] as const;

const ACTION_BTN =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#334155] shadow-sm transition hover:border-[#cbd5e1] hover:bg-[#f8fafc]";

const KEBAB_BTN =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] shadow-sm transition hover:border-[#cbd5e1] hover:bg-[#f8fafc]";

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        active
          ? "bg-[#dcfce7] text-[#16a34a]"
          : "bg-[#fee2e2] text-[#dc2626]",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-[#16a34a]" : "bg-[#dc2626]",
        )}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function RoleChip({
  role,
  assigned,
  onToggle,
}: {
  role: StaffRole;
  assigned: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition",
        assigned
          ? "bg-[#ccfbf1] text-[#0f766e] ring-1 ring-[#0d9488]/25"
          : "border border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] hover:bg-white",
      )}
    >
      {assigned ? <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} /> : null}
      {role}
    </button>
  );
}

function DateCell({ iso }: { iso: string }) {
  const { date, time } = formatGuestDateLines(iso);
  return (
    <div className="min-w-[120px]">
      <div className="font-medium text-[#334155]">{date}</div>
      <div className="text-xs text-[#94a3b8]">{time}</div>
    </div>
  );
}

export function AdminGuestsTable({
  rows,
  total,
  page,
  pageSize,
  isLoading,
  isError,
  errorMessage,
  onPageChange,
  onEdit,
  onToggleRole,
  onDelete,
}: {
  rows: AdminGuestRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onPageChange: (page: number) => void;
  onEdit: (user: AdminGuestRow) => void;
  onToggleRole: (user: AdminGuestRow, role: StaffRole) => void;
  onDelete: (user: AdminGuestRow) => void;
}) {
  return (
    <div className={ADMIN_CARD}>
      {isError && errorMessage ? (
        <p className="mx-5 mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive sm:mx-6">
          {errorMessage}
        </p>
      ) : null}

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
            {isLoading ? (
              <tr>
                <td colSpan={HEADERS.length} className="px-6 py-16 text-center text-[#64748b]">
                  Loading guests…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length} className="px-6 py-16 text-center text-[#64748b]">
                  No guests match your filters.
                </td>
              </tr>
            ) : (
              rows.map((u, idx) => {
                const active = isGuestActive(u);
                const palette = guestAvatarPalette(idx);
                const displayName = guestDisplayName(u.email);
                const lastActiveIso = guestLastActiveAt(u).toISOString();

                return (
                  <tr
                    key={u.id}
                    className="border-b border-[#f1f5f9] transition-colors last:border-0 hover:bg-[#f8fafc]/80"
                  >
                    <td className="px-5 py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold",
                            palette.bg,
                            palette.text,
                          )}
                        >
                          {guestInitials(u.email)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-[#134e4a]">
                            {displayName}
                          </div>
                          <div className="truncate text-xs text-[#94a3b8]">{u.email}</div>
                          {u.username ? (
                            <div className="truncate text-xs font-medium text-[#0d9488]">
                              @{u.username}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex max-w-[280px] flex-wrap gap-1.5">
                        {STAFF_ROLES.map((r) => (
                          <RoleChip
                            key={r}
                            role={r}
                            assigned={u.roles.includes(r)}
                            onToggle={() => onToggleRole(u, r)}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill active={active} />
                    </td>
                    <td className="px-5 py-4">
                      <DateCell iso={lastActiveIso} />
                    </td>
                    <td className="px-5 py-4">
                      <DateCell iso={u.created_at} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 pr-6 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(u)}
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
                            <DropdownMenuItem onClick={() => onEdit(u)}>
                              Edit roles
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(u)}
                              className="text-[#dc2626] focus:text-[#dc2626]"
                            >
                              Delete guest
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

      <AdminGuestsPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
