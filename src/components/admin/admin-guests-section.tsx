"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Users2 } from "lucide-react";
import { toast } from "sonner";
import { AdminGuestsFilters } from "@/components/admin/admin-guests-filters";
import { AdminGuestsStats } from "@/components/admin/admin-guests-stats";
import { AdminGuestsTable } from "@/components/admin/admin-guests-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_TEAL } from "@/components/admin/admin-theme";
import {
  GUEST_PAGE_SIZE,
  STAFF_ROLES,
  computeGuestStats,
  emptyGuestFilters,
  exportGuestsCsv,
  filterGuestRows,
  type AdminGuestRow,
  type GuestFilters,
  type StaffRole,
} from "@/components/admin/admin-guests-utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminCreateUser,
  adminDeleteUser,
  adminListUsers,
  adminSetRole,
} from "@/lib/admin.functions";
import { adminUsersQueryDefaults } from "@/lib/admin-query";
import { formatActionError } from "@/lib/utils";

const pillInput =
  "h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white px-3.5 text-sm font-medium text-[#134e4a] shadow-sm outline-none transition placeholder:text-[#94a3b8] hover:border-[#cbd5e1] focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15";

export function AdminGuestsSection() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<GuestFilters>(emptyGuestFilters());
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminGuestRow | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createRole, setCreateRole] = useState<StaffRole>("scanner");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["a-users"],
    queryFn: () => adminListUsers(),
    ...adminUsersQueryDefaults,
  });

  const allUsers = (data?.users ?? []) as AdminGuestRow[];
  const stats = useMemo(() => computeGuestStats(allUsers), [allUsers]);
  const filtered = useMemo(
    () => filterGuestRows(allUsers, filters),
    [allUsers, filters],
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / GUEST_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * GUEST_PAGE_SIZE,
    safePage * GUEST_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.role, filters.status, filters.lastActive]);

  const patchFilters = (patch: Partial<GuestFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  };

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["a-users"] });
  };

  const handleToggleRole = async (user: AdminGuestRow, role: StaffRole) => {
    const has = user.roles.includes(role);
    try {
      await adminSetRole({ user_id: user.id, role, enabled: !has });
      invalidate();
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    }
  };

  const handleDelete = async (user: AdminGuestRow) => {
    if (!confirm(`Delete guest ${user.email}?`)) return;
    try {
      await adminDeleteUser({ user_id: user.id });
      toast.success("Guest deleted");
      invalidate();
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    }
  };

  const handleCreate = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Email is required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      await adminCreateUser({ email: trimmedEmail, password, role: createRole });
      toast.success("Guest created");
      setEmail("");
      setPassword("");
      setCreateOpen(false);
      await refetch();
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <AdminPageHeader
        icon={Users2}
        title="Guests"
        subtitle="Manage guest accounts, roles, and access permissions"
        helper="Control who can access your events, dashboards, POS and scanner."
      />

      <AdminGuestsStats stats={stats} />

      <AdminGuestsFilters
        filters={filters}
        onFiltersChange={patchFilters}
        onExport={() => exportGuestsCsv(filtered)}
        onCreate={() => setCreateOpen(true)}
      />

      <AdminGuestsTable
        rows={pageRows}
        total={total}
        page={safePage}
        pageSize={GUEST_PAGE_SIZE}
        isLoading={isLoading}
        isError={isError}
        errorMessage={isError ? formatActionError(error) : undefined}
        onPageChange={setPage}
        onEdit={setEditUser}
        onToggleRole={handleToggleRole}
        onDelete={handleDelete}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-[#134e4a]">
              Create guest
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
                Email
              </Label>
              <Input
                placeholder="guest@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={pillInput}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
                Password
              </Label>
              <Input
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={pillInput}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
                Initial role
              </Label>
              <SearchableSelect
                value={createRole}
                onChange={(v) => {
                  if (STAFF_ROLES.includes(v as StaffRole)) setCreateRole(v as StaffRole);
                }}
                searchable={false}
                options={STAFF_ROLES.map((r) => ({
                  value: r,
                  label: r.charAt(0).toUpperCase() + r.slice(1),
                }))}
                className="h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white text-sm font-medium text-[#134e4a] shadow-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#e2e8f0] bg-white px-4 text-sm font-semibold text-[#334155]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              className="inline-flex h-10 items-center justify-center rounded-[12px] px-5 text-sm font-semibold text-white shadow-sm"
              style={{ background: ADMIN_TEAL }}
            >
              Create guest
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-md rounded-[20px]">
          {editUser ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-[#134e4a]">
                  Edit roles
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-[#64748b]">{editUser.email}</p>
              <div className="flex flex-wrap gap-2 py-2">
                {STAFF_ROLES.map((r) => {
                  const has = editUser.roles.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={async () => {
                        await handleToggleRole(editUser, r);
                        setEditUser((prev) => {
                          if (!prev) return prev;
                          const roles = has
                            ? prev.roles.filter((x) => x !== r)
                            : [...prev.roles, r];
                          return { ...prev, roles };
                        });
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        has
                          ? "bg-[#ccfbf1] text-[#0f766e] ring-1 ring-[#0d9488]/25"
                          : "border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc]"
                      }`}
                    >
                      {has && "✓ "}
                      {r}
                    </button>
                  );
                })}
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#e2e8f0] bg-white px-4 text-sm font-semibold text-[#334155]"
                >
                  Done
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
