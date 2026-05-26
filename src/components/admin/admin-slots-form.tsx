"use client";

import { Calendar, Clock, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect, type SelectOption } from "@/components/searchable-select";
import { ADMIN_CARD, ADMIN_TEAL } from "@/components/admin/admin-theme";
import { cn } from "@/lib/utils";
import { formatSlotCreationSummary } from "@/components/admin/admin-slots-utils";
import { formatSlotTimeRangeFromHm } from "@/lib/slot-time";

export const pillInput =
  "h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white px-3.5 text-sm font-medium text-[#134e4a] shadow-sm outline-none transition placeholder:text-[#94a3b8] hover:border-[#cbd5e1] focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15";

export const pillSelect =
  "h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white text-sm font-medium text-[#134e4a] shadow-sm";

export function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#64748b]">
        {label}
      </Label>
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
        <Input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className={cn(pillInput, "pl-10")}
        />
      </div>
    </div>
  );
}

export function AdminSlotFields({
  eventId,
  onEventIdChange,
  eventOptions,
  name,
  onNameChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  capacity,
  onCapacityChange,
  visibleToGuests,
  onVisibleToGuestsChange,
  eventDateMin,
  eventDateMax,
}: {
  eventId: string;
  onEventIdChange: (v: string) => void;
  eventOptions: SelectOption[];
  name: string;
  onNameChange: (v: string) => void;
  startDate: string;
  onStartDateChange: (v: string) => void;
  endDate: string;
  onEndDateChange: (v: string) => void;
  startTime: string;
  onStartTimeChange: (v: string) => void;
  endTime: string;
  onEndTimeChange: (v: string) => void;
  capacity: number;
  onCapacityChange: (v: number) => void;
  visibleToGuests: boolean;
  onVisibleToGuestsChange: (v: boolean) => void;
  eventDateMin?: string;
  eventDateMax?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#64748b]">
            Event
          </Label>
          <SearchableSelect
            value={eventId}
            onChange={onEventIdChange}
            placeholder="Select an event..."
            searchPlaceholder="Search events…"
            options={eventOptions}
            className={pillSelect}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#64748b]">
            Slot name
          </Label>
          <Input
            placeholder="e.g. Park Guest"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className={pillInput}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DateField
          label="Start date"
          value={startDate}
          min={eventDateMin}
          max={eventDateMax}
          onChange={onStartDateChange}
        />
        <DateField
          label="End date"
          value={endDate}
          min={startDate || eventDateMin}
          max={eventDateMax}
          onChange={onEndDateChange}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#64748b]">
            Slot start time
          </Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className={pillInput}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#64748b]">
            Slot end time
          </Label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className={pillInput}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#64748b]">
            Capacity
          </Label>
          <Input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => onCapacityChange(Number(e.target.value))}
            className={pillInput}
          />
        </div>
      </div>

      {startTime && endTime ? (
        <p className="flex items-center gap-2 text-sm font-medium text-[#0f766e]">
          <Clock className="h-4 w-4 shrink-0 text-[#64748b]" aria-hidden />
          <span>
            Slot time:{" "}
            <span className="text-[#134e4a]">{formatSlotTimeRangeFromHm(startTime, endTime)}</span>
          </span>
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-4 rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-[#334155]">Visible to guests / POS</div>
          <div className="text-xs text-[#64748b]">
            When off, the slot is hidden from homepage, register, and POS booking
          </div>
        </div>
        <Switch checked={visibleToGuests} onCheckedChange={onVisibleToGuestsChange} />
      </div>
    </div>
  );
}

export function AdminSlotsForm({
  eventId,
  onEventIdChange,
  eventOptions,
  name,
  onNameChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  capacity,
  onCapacityChange,
  visibleToGuests,
  onVisibleToGuestsChange,
  onCreate,
  creating,
  eventDateMin,
  eventDateMax,
}: {
  eventId: string;
  onEventIdChange: (v: string) => void;
  eventOptions: SelectOption[];
  name: string;
  onNameChange: (v: string) => void;
  startDate: string;
  onStartDateChange: (v: string) => void;
  endDate: string;
  onEndDateChange: (v: string) => void;
  startTime: string;
  onStartTimeChange: (v: string) => void;
  endTime: string;
  onEndTimeChange: (v: string) => void;
  capacity: number;
  onCapacityChange: (v: number) => void;
  visibleToGuests: boolean;
  onVisibleToGuestsChange: (v: boolean) => void;
  onCreate: () => void;
  creating?: boolean;
  eventDateMin?: string;
  eventDateMax?: string;
}) {
  const summary = formatSlotCreationSummary(
    startDate,
    endDate,
    startTime,
    endTime,
    capacity,
  );

  return (
    <div className={cn(ADMIN_CARD, "p-5 sm:p-6")}>
      <AdminSlotFields
        eventId={eventId}
        onEventIdChange={onEventIdChange}
        eventOptions={eventOptions}
        name={name}
        onNameChange={onNameChange}
        startDate={startDate}
        onStartDateChange={onStartDateChange}
        endDate={endDate}
        onEndDateChange={onEndDateChange}
        startTime={startTime}
        onStartTimeChange={onStartTimeChange}
        endTime={endTime}
        onEndTimeChange={onEndTimeChange}
        capacity={capacity}
        onCapacityChange={onCapacityChange}
        visibleToGuests={visibleToGuests}
        onVisibleToGuestsChange={onVisibleToGuestsChange}
        eventDateMin={eventDateMin}
        eventDateMax={eventDateMax}
      />

      <div className="mt-5 flex flex-col gap-4 border-t border-[#f1f5f9] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-[#64748b]">{summary}</p>
        <button
          type="button"
          onClick={onCreate}
          disabled={creating}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] px-6 text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgba(13,148,136,0.45)] transition hover:brightness-105 disabled:opacity-60"
          style={{ background: ADMIN_TEAL }}
        >
          <Plus className="h-4 w-4" />
          Create slot
        </button>
      </div>
    </div>
  );
}
