"use client";

import { Calendar, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect, type SelectOption } from "@/components/searchable-select";
import { ADMIN_CARD, ADMIN_TEAL } from "@/components/admin/admin-theme";
import { cn } from "@/lib/utils";
import type { AdminFilterChip } from "@/hooks/use-admin-table-filters";
import type { AdminFilterMode, AdminTableFilters } from "@/lib/admin-filters.types";

const fieldClass =
  "h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white text-sm font-medium text-[#134e4a] shadow-sm outline-none transition placeholder:text-[#94a3b8] hover:border-[#cbd5e1] focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15";

const selectClass =
  "h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white text-sm font-medium text-[#134e4a] shadow-sm";

const filterLabelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]";

export function AdminBookingsFilters({
  filters,
  onFiltersChange,
  mode,
  onModeChange,
  eventOptions,
  slotOptions,
  statusOptions,
  onApplyServer,
  onClearServer,
  chips,
  onRemoveChip,
  onClearAll,
  hasActive,
  applying,
}: {
  filters: AdminTableFilters;
  onFiltersChange: (patch: Partial<AdminTableFilters>) => void;
  mode: AdminFilterMode;
  onModeChange: (mode: AdminFilterMode) => void;
  eventOptions: SelectOption[];
  slotOptions: SelectOption[];
  statusOptions: SelectOption[];
  onApplyServer?: () => void;
  onClearServer?: () => void;
  chips: AdminFilterChip[];
  onRemoveChip: (key: keyof AdminTableFilters) => void;
  onClearAll: () => void;
  hasActive: boolean;
  applying?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div id="admin-bookings-filters" className={cn(ADMIN_CARD, "p-5 sm:p-6")}>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Label className={filterLabelClass}>Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <Input
                value={filters.search}
                onChange={(e) => onFiltersChange({ search: e.target.value })}
                placeholder="Name, mobile, slot..."
                className={cn(fieldClass, "pl-10")}
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <Label className={filterLabelClass}>Event</Label>
            <SearchableSelect
              value={filters.eventId}
              onChange={(v) => onFiltersChange({ eventId: v, slotId: "" })}
              placeholder="All events"
              searchPlaceholder="Search events…"
              options={[{ value: "", label: "All events" }, ...eventOptions]}
              className={selectClass}
            />
          </div>

          <div className="lg:col-span-2">
            <Label className={filterLabelClass}>Slot</Label>
            <SearchableSelect
              value={filters.slotId}
              onChange={(v) => onFiltersChange({ slotId: v })}
              placeholder="All slots"
              searchPlaceholder="Search slots…"
              options={[{ value: "", label: "All slots" }, ...slotOptions]}
              className={selectClass}
              disabled={!slotOptions.length && !!filters.eventId}
            />
          </div>

          <div className="lg:col-span-2">
            <Label className={filterLabelClass}>Status</Label>
            <SearchableSelect
              value={filters.status}
              onChange={(v) => onFiltersChange({ status: v })}
              placeholder="All statuses"
              searchable={false}
              options={[{ value: "", label: "All statuses" }, ...statusOptions]}
              className={selectClass}
            />
          </div>

          <div className="lg:col-span-3">
            <Label className={filterLabelClass}>Date range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onFiltersChange({ dateFrom: e.target.value })}
                  className={cn(fieldClass, "pl-10")}
                  aria-label="From date"
                  title="mm/dd/yyyy"
                />
              </div>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <Input
                  type="date"
                  value={filters.dateTo}
                  min={filters.dateFrom || undefined}
                  onChange={(e) => onFiltersChange({ dateTo: e.target.value })}
                  className={cn(fieldClass, "pl-10")}
                  aria-label="To date"
                  title="mm/dd/yyyy"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#f1f5f9] pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="inline-flex rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-1"
              role="group"
              aria-label="Filter mode"
            >
              {(["local", "server"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onModeChange(m)}
                  className={cn(
                    "rounded-[10px] px-3.5 py-1.5 text-xs font-semibold transition",
                    mode === m ? "text-white shadow-sm" : "text-[#64748b] hover:bg-white",
                  )}
                  style={mode === m ? { background: ADMIN_TEAL } : undefined}
                >
                  {m === "local" ? "Local" : "Server"}
                </button>
              ))}
            </div>
            <span className="text-xs text-[#94a3b8]">
              {mode === "local" ? "Instant — current page data" : "Apply to query database"}
            </span>
          </div>

          {mode === "server" && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={applying}
                onClick={onApplyServer}
                className="inline-flex h-9 items-center justify-center rounded-[12px] px-4 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
                style={{ background: ADMIN_TEAL }}
              >
                {applying ? "Applying…" : "Apply Server Filter"}
              </button>
              <button
                type="button"
                onClick={onClearServer}
                className="inline-flex h-9 items-center justify-center rounded-[12px] border border-[#e2e8f0] bg-white px-4 text-xs font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {hasActive && chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          {chips.map((chip) => (
            <span
              key={`${chip.key}-${chip.label}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] shadow-sm"
            >
              {chip.label}
              {chip.key !== "mode" && (
                <button
                  type="button"
                  onClick={() => onRemoveChip(chip.key as keyof AdminTableFilters)}
                  className="grid h-4 w-4 place-items-center rounded-full text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#334155]"
                  aria-label={`Remove ${chip.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-semibold text-[#0d9488] hover:underline"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
