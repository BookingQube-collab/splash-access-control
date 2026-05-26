"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect, type SelectOption } from "@/components/searchable-select";
import { cn } from "@/lib/utils";
import type { AdminFilterChip } from "@/hooks/use-admin-table-filters";
import type { AdminFilterMode, AdminTableFilters } from "@/lib/admin-filters.types";

const fieldClass =
  "h-10 border border-[#dce8ea] bg-white text-sm text-[#0a4a52] shadow-none focus-visible:ring-[#00a8b5]/30";

type AdminFilterBarProps = {
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
};

export function AdminFilterBar({
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
}: AdminFilterBarProps) {
  return (
    <div className="mb-5 space-y-3">
      <div className="rounded-xl border border-[#e8e4dc] bg-[#FAF8F4] p-4">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#5a7a80]">
              Search
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a7a80]" />
              <Input
                value={filters.search}
                onChange={(e) => onFiltersChange({ search: e.target.value })}
                placeholder="Name, mobile, slot…"
                className={cn(fieldClass, "pl-9")}
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#5a7a80]">
              Event
            </Label>
            <SearchableSelect
              value={filters.eventId}
              onChange={(v) => onFiltersChange({ eventId: v, slotId: "" })}
              placeholder="All events"
              searchPlaceholder="Search events…"
              options={[{ value: "", label: "All events" }, ...eventOptions]}
              className={fieldClass}
            />
          </div>

          <div className="lg:col-span-2">
            <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#5a7a80]">
              Slot
            </Label>
            <SearchableSelect
              value={filters.slotId}
              onChange={(v) => onFiltersChange({ slotId: v })}
              placeholder="All slots"
              searchPlaceholder="Search slots…"
              options={[{ value: "", label: "All slots" }, ...slotOptions]}
              className={fieldClass}
              disabled={!slotOptions.length && !!filters.eventId}
            />
          </div>

          <div className="lg:col-span-2">
            <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#5a7a80]">
              Status
            </Label>
            <SearchableSelect
              value={filters.status}
              onChange={(v) => onFiltersChange({ status: v })}
              placeholder="All statuses"
              searchable={false}
              options={[{ value: "", label: "All statuses" }, ...statusOptions]}
              className={fieldClass}
            />
          </div>

          <div className="lg:col-span-3">
            <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#5a7a80]">
              Date range
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFiltersChange({ dateFrom: e.target.value })}
                className={fieldClass}
                aria-label="From date"
              />
              <Input
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onChange={(e) => onFiltersChange({ dateTo: e.target.value })}
                className={fieldClass}
                aria-label="To date"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e8e4dc] pt-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a7a80]">
              Filter mode
            </span>
            <div
              className="inline-flex rounded-lg border border-[#dce8ea] bg-white p-0.5"
              role="group"
              aria-label="Filter mode"
            >
              {(["local", "server"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onModeChange(m)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition",
                    mode === m
                      ? "bg-[#0a7a84] text-white shadow-sm"
                      : "text-[#5a7a80] hover:bg-[#f0f7f8]",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <span className="hidden text-xs text-[#5a7a80] sm:inline">
              {mode === "local" ? "Instant — current page data" : "Apply to query database"}
            </span>
          </div>

          {mode === "server" && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={applying}
                onClick={onApplyServer}
                className="rounded-lg bg-[#0a7a84] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0a4a52] disabled:opacity-60"
              >
                {applying ? "Applying…" : "Apply Server Filter"}
              </button>
              <button
                type="button"
                onClick={onClearServer}
                className="rounded-lg border border-[#dce8ea] bg-white px-4 py-2 text-xs font-semibold text-[#0a4a52] hover:bg-[#f0f7f8]"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {hasActive && chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={`${chip.key}-${chip.label}`}
              className="inline-flex items-center gap-1 rounded-full border border-[#dce8ea] bg-white px-2.5 py-1 text-xs font-medium text-[#0a4a52]"
            >
              {chip.label}
              {chip.key !== "mode" && (
                <button
                  type="button"
                  onClick={() => onRemoveChip(chip.key as keyof AdminTableFilters)}
                  className="grid h-4 w-4 place-items-center rounded-full text-[#5a7a80] hover:bg-[#f0f7f8] hover:text-[#0a4a52]"
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
            className="text-xs font-semibold text-[#0a7a84] hover:underline"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
