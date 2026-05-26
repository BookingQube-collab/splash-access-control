"use client";

import { Download, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/searchable-select";
import { ADMIN_CARD, ADMIN_TEAL } from "@/components/admin/admin-theme";
import type { GuestFilters } from "@/components/admin/admin-guests-utils";
import { STAFF_ROLES } from "@/components/admin/admin-guests-utils";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white text-sm font-medium text-[#134e4a] shadow-sm outline-none transition placeholder:text-[#94a3b8] hover:border-[#cbd5e1] focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15";

const selectClass =
  "h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white text-sm font-medium text-[#134e4a] shadow-sm";

const filterLabelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]";

const LAST_ACTIVE_OPTIONS = [
  { value: "", label: "Anytime" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export function AdminGuestsFilters({
  filters,
  onFiltersChange,
  onExport,
  onCreate,
}: {
  filters: GuestFilters;
  onFiltersChange: (patch: Partial<GuestFilters>) => void;
  onExport: () => void;
  onCreate: () => void;
}) {
  return (
    <div id="admin-guests-filters" className={cn(ADMIN_CARD, "p-5 sm:p-6")}>
      <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-4">
          <Label className={filterLabelClass}>Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              placeholder="Search by name or email..."
              className={cn(fieldClass, "pl-10")}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <Label className={filterLabelClass}>Role</Label>
          <SearchableSelect
            value={filters.role}
            onChange={(v) => onFiltersChange({ role: v })}
            placeholder="All Roles"
            searchable={false}
            options={[
              { value: "", label: "All Roles" },
              ...STAFF_ROLES.map((r) => ({
                value: r,
                label: r.charAt(0).toUpperCase() + r.slice(1),
              })),
            ]}
            className={selectClass}
          />
        </div>

        <div className="lg:col-span-2">
          <Label className={filterLabelClass}>Status</Label>
          <SearchableSelect
            value={filters.status}
            onChange={(v) => onFiltersChange({ status: v })}
            placeholder="All Statuses"
            searchable={false}
            options={[
              { value: "", label: "All Statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            className={selectClass}
          />
        </div>

        <div className="lg:col-span-2">
          <Label className={filterLabelClass}>Last Active</Label>
          <SearchableSelect
            value={filters.lastActive}
            onChange={(v) => onFiltersChange({ lastActive: v })}
            placeholder="Anytime"
            searchable={false}
            options={LAST_ACTIVE_OPTIONS}
            className={selectClass}
          />
        </div>

        <div className="flex flex-wrap gap-2 lg:col-span-2 lg:justify-end">
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border border-[#e2e8f0] bg-white px-4 text-sm font-semibold text-[#334155] shadow-sm transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] sm:flex-none sm:min-w-[108px]"
          >
            <Download className="h-4 w-4 shrink-0 text-[#64748b]" />
            Export
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgba(13,148,136,0.45)] transition hover:brightness-105 sm:flex-none"
            style={{ background: ADMIN_TEAL }}
          >
            <Plus className="h-4 w-4" />
            Create Guest
          </button>
        </div>
      </div>
    </div>
  );
}
