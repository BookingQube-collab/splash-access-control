"use client";

import { format, parseISO } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type EventOption = {
  id: string;
  name: string;
  days: number;
  start_date: string;
  end_date: string;
};

function formatEventLabel(e: EventOption): string {
  const start = format(parseISO(e.start_date), "MMM dd");
  const end = format(parseISO(e.end_date), "MMM dd, yyyy");
  return `${e.name} · ${e.days}d (${start} – ${end})`;
}

export function AdminEventSelector({
  eventId,
  events,
  onChange,
  onCalendarClick,
}: {
  eventId: string;
  events: EventOption[];
  onChange: (id: string) => void;
  onCalendarClick?: () => void;
}) {
  const selected = events.find((e) => e.id === eventId);
  const label = selected ? formatEventLabel(selected) : "Active (today)";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748b]">Event</span>
      <div className="flex items-center gap-2">
        <div className="relative">
          <select
            value={eventId}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "appearance-none rounded-full border border-[#cbd5e1] bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-[#134e4a]",
              "shadow-sm outline-none transition hover:border-[#0d9488]/40 focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15",
            )}
          >
            <option value="">Active (today)</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {formatEventLabel(e)}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]"
            aria-hidden
          />
          <span className="sr-only">{label}</span>
        </div>
        <button
          type="button"
          onClick={onCalendarClick}
          className="grid h-10 w-10 place-items-center rounded-xl border-2 border-[#0d9488]/35 bg-white text-[#0f766e] shadow-sm transition hover:border-[#0d9488] hover:bg-[#f0fdfa]"
          aria-label="Jump to schedule"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
