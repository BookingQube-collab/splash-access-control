"use client";

import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ADMIN_CARD, ADMIN_TEAL } from "@/components/admin/admin-theme";
import { cn } from "@/lib/utils";
import type { AdminEventRow } from "@/components/admin/admin-events-utils";

const pillInput =
  "h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white px-3.5 text-sm font-medium text-[#134e4a] shadow-sm outline-none transition placeholder:text-[#94a3b8] hover:border-[#cbd5e1] focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15";

export function AdminEventsFilters({
  events,
  name,
  onNameChange,
  start,
  onStartChange,
  end,
  onEndChange,
  onClearDates,
  onAdd,
  adding,
}: {
  events: AdminEventRow[];
  name: string;
  onNameChange: (v: string) => void;
  start: string;
  onStartChange: (v: string) => void;
  end: string;
  onEndChange: (v: string) => void;
  onClearDates?: () => void;
  onAdd: () => void;
  adding: boolean;
}) {
  const hasDateFilter = Boolean(start || end);

  return (
    <div className={cn(ADMIN_CARD, "p-5 sm:p-6")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
        <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-3">
          <div className="min-w-0">
            <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
              New event name
            </Label>
            <Input
              list="admin-event-names"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="SummerSplash"
              className={pillInput}
            />
            <datalist id="admin-event-names">
              {events.map((e) => (
                <option key={e.id} value={e.name} />
              ))}
            </datalist>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
              Filter from
            </Label>
            <Input
              type="date"
              value={start}
              onChange={(e) => onStartChange(e.target.value)}
              className={pillInput}
              aria-label="Filter events from date"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">Filter to</Label>
            <Input
              type="date"
              value={end}
              min={start || undefined}
              onChange={(e) => onEndChange(e.target.value)}
              className={pillInput}
              aria-label="Filter events to date"
            />
            {hasDateFilter && onClearDates ? (
              <button
                type="button"
                onClick={onClearDates}
                className="mt-1.5 text-xs font-semibold text-[#0d9488] hover:underline"
              >
                Show all dates
              </button>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={adding}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] px-6 text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgba(13,148,136,0.45)] transition hover:brightness-105 disabled:opacity-60"
          style={{ background: ADMIN_TEAL }}
        >
          <Plus className="h-4 w-4" />
          Add Event
        </button>
      </div>
    </div>
  );
}
