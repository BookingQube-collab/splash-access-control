"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { ScannerSearchRow } from "@/components/scanner/scanner-search-row";
import { formatSlotTimeRange } from "@/lib/slot-time";
import { cn } from "@/lib/utils";
import {
  formatDisplayPhone,
  formatGuestCountLabel,
  pastelInitialsClass,
  slotInitials,
  type ScannerTodaySlot,
  type SlotRegistrationItem,
} from "@/components/scanner/scanner-types";

const VISIBLE_ROWS = 5;
const ROW_HEIGHT_PX = 54;

function phoneMatches(reg: SlotRegistrationItem, query: string): boolean {
  const q = query.replace(/\D/g, "");
  if (!q) return true;
  return reg.mobile.replace(/\D/g, "").includes(q);
}

function slotTabLabel(slot: ScannerTodaySlot): string {
  const range = formatSlotTimeRange(slot.startsAt, slot.endsAt);
  return range ? `${slot.name} ${range}` : slot.name;
}

function slotTimeHeaderLabel(
  slotStartsAt?: string | null,
  slotEndsAt?: string | null,
  slotsLoading?: boolean,
  hasSlots?: boolean,
): string {
  if (slotStartsAt && slotEndsAt) {
    return formatSlotTimeRange(slotStartsAt, slotEndsAt);
  }
  if (slotsLoading) return "Loading…";
  if (!hasSlots) return "No slots";
  return "—";
}

export function ScannerCurrentSlotPanel({
  slots,
  slotsLoading,
  activeSlotId,
  onSelectSlot,
  slotStartsAt,
  slotEndsAt,
  registrations,
  loading,
}: {
  slots: ScannerTodaySlot[];
  slotsLoading?: boolean;
  activeSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  slotName?: string | null;
  slotStartsAt?: string | null;
  slotEndsAt?: string | null;
  registrations: SlotRegistrationItem[];
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [showAllDialog, setShowAllDialog] = useState(false);

  const timeBadge = slotTimeHeaderLabel(
    slotStartsAt,
    slotEndsAt,
    slotsLoading,
    slots.length > 0,
  );

  const filtered = useMemo(
    () => registrations.filter((r) => phoneMatches(r, search.trim())),
    [registrations, search],
  );
  const visible = filtered.slice(0, VISIBLE_ROWS);

  return (
    <>
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#ebebef] bg-white p-4 shadow-[0_2px_12px_rgba(15,39,74,0.06)]">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#fff4f0] text-[#ff7e67]">
              <Calendar className="h-4 w-4" strokeWidth={2} />
            </span>
            <h2 className="truncate text-sm font-bold text-[#1a2b4a]">Current slot</h2>
          </div>
          <span className="shrink-0 rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[10px] font-medium text-[#6b7280]">
            {timeBadge}
          </span>
        </div>

        {slotsLoading && slots.length === 0 ? (
          <div className="mb-3 h-9 animate-pulse rounded-lg bg-[#f5f5f7]" />
        ) : slots.length > 0 ? (
          <div
            className="mb-3 flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-[#f5f5f7] p-1"
            role="listbox"
            aria-label="Today's slots"
          >
            {slots.map((slot) => {
              const selected = activeSlotId === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onSelectSlot(slot.id)}
                  className={cn(
                    "min-w-0 flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-center text-[10px] font-semibold leading-tight transition",
                    selected
                      ? "bg-[#ff7e67] text-white shadow-sm"
                      : "bg-transparent text-[#1a2b4a] hover:bg-white/80",
                  )}
                >
                  <span className="line-clamp-2">{slotTabLabel(slot)}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mb-3 shrink-0 text-center text-[10px] text-[#8a8a94]">
            No slots configured for today.
          </p>
        )}

        <ScannerSearchRow
          value={search}
          onChange={setSearch}
          disabled={!activeSlotId}
          className="mb-3"
        />

        <div className="mb-2 shrink-0 rounded-lg bg-[#e8f4ff] px-3 py-2 text-center text-xs font-semibold text-[#3d6a9e]">
          Registered ({loading ? "…" : registrations.length})
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {!activeSlotId ? (
            <p className="py-6 text-center text-xs text-[#8a8a94]">
              {slotsLoading ? "Loading…" : "Select a slot above."}
            </p>
          ) : loading && registrations.length === 0 ? (
            <div className="space-y-2 py-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[48px] animate-pulse rounded-lg bg-[#f5f5f7]" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#8a8a94]">
              {search.trim() ? "No guests match this number." : "No registrations for this slot."}
            </p>
          ) : (
            <div className="overflow-hidden">
              {visible.map((reg) => (
                <RegistrationRow key={reg.id} reg={reg} />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => filtered.length > 0 && setShowAllDialog(true)}
          className="mt-3 shrink-0 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-[#e8f4ff] py-2.5 text-xs font-medium text-[#3d6a9e] transition hover:bg-[#dceeff] disabled:opacity-50"
          disabled={filtered.length === 0}
        >
          View all registered
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </section>

      {showAllDialog && (
        <RegisteredOverlay
          registrations={filtered}
          count={filtered.length}
          onClose={() => setShowAllDialog(false)}
        />
      )}
    </>
  );
}

function RegistrationRow({ reg }: { reg: SlotRegistrationItem }) {
  const name = reg.customerName.trim() || "Guest";
  return (
    <div
      className="flex items-center gap-2 border-b border-[#f0f0f2] py-2 last:border-b-0"
      style={{ minHeight: ROW_HEIGHT_PX }}
    >
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
          pastelInitialsClass(name),
        )}
      >
        {slotInitials(name)}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-xs font-bold text-[#1a2b4a]">{name}</p>
        <p className="truncate text-[11px] text-[#6b7280]">{formatDisplayPhone(reg.mobile)}</p>
      </div>
      <span className="inline-flex shrink-0 rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[10px] font-medium text-[#6b7280]">
        {formatGuestCountLabel(reg.guestCount)}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#c4c4cc]" strokeWidth={2} />
    </div>
  );
}

function RegisteredOverlay({
  registrations,
  count,
  onClose,
}: {
  registrations: SlotRegistrationItem[];
  count: number;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal
      aria-label="All registered guests"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border border-[#ebebef] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#ebebef] px-4 py-3">
          <h3 className="text-sm font-bold text-[#1a2b4a]">Registered ({count})</h3>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-3 py-2">
          {registrations.map((reg) => (
            <RegistrationRow key={reg.id} reg={reg} />
          ))}
        </div>
        <div className="border-t border-[#ebebef] p-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#e8f4ff] py-2.5 text-xs font-medium text-[#3d6a9e] hover:bg-[#dceeff]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
