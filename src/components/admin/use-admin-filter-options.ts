"use client";

import { createElement, useMemo } from "react";
import { format } from "date-fns";
import type { SelectOption } from "@/components/searchable-select";
import { formatSlotTimeHint, type AdminSlotRow } from "@/components/admin/admin-slots-utils";
import {
  REGISTRATION_STATUS_OPTIONS,
  type AdminTableFilters,
} from "@/lib/admin-filters.types";

type EventOption = { id: string; name: string; start_date?: string | null; event_date?: string | null; end_date?: string | null };
type SlotOption = {
  id: string;
  name: string;
  event_id: string;
  starts_at?: string;
  ends_at?: string;
  events?: { name?: string } | null;
};

function slotFilterOptionLabel(name: string, timeHint: string, eventName: string) {
  const secondary = [timeHint, eventName].filter(Boolean).join(" · ");
  return createElement(
    "span",
    { className: "flex min-w-0 flex-col gap-0.5" },
    createElement("span", { className: "font-semibold text-[#134e4a]" }, name),
    secondary
      ? createElement("span", { className: "text-xs text-[#64748b]" }, secondary)
      : null,
  );
}

export function useAdminFilterOptions(
  events: EventOption[],
  slots: SlotOption[],
  filters: AdminTableFilters,
) {
  const eventOptions: SelectOption[] = useMemo(
    () =>
      events.map((e) => {
        const start = e.start_date ?? e.event_date;
        const end = e.end_date ?? e.event_date;
        const label = start
          ? `${e.name} · ${format(new Date(start), "MMM d")}${end ? ` → ${format(new Date(end), "MMM d")}` : ""}`
          : e.name;
        return { value: e.id, label, search: label };
      }),
    [events],
  );

  const slotOptions: SelectOption[] = useMemo(() => {
    const filtered = filters.eventId
      ? slots.filter((s) => s.event_id === filters.eventId)
      : slots;
    return filtered.map((s) => {
      const eventName = s.events?.name ?? "";
      const timeHint =
        s.starts_at && s.ends_at ? formatSlotTimeHint(s as AdminSlotRow) : "";
      const search = [s.name, timeHint, eventName].filter(Boolean).join(" ");
      return {
        value: s.id,
        label: slotFilterOptionLabel(s.name, timeHint, eventName),
        triggerLabel: s.name,
        search,
      };
    });
  }, [slots, filters.eventId]);

  const statusOptions: SelectOption[] = useMemo(
    () => REGISTRATION_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );

  const eventLabel = (id: string) => events.find((e) => e.id === id)?.name ?? id;
  const slotLabel = (id: string) => slots.find((s) => s.id === id)?.name ?? id;

  return { eventOptions, slotOptions, statusOptions, eventLabel, slotLabel };
}
