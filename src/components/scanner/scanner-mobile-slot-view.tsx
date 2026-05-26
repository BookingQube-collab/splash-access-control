"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { ScannerSearchRow } from "@/components/scanner/scanner-search-row";
import { ScannerMobileCurrentSlotCard } from "@/components/scanner/scanner-mobile-current-slot-card";
import { SCANNER_CORAL, SCANNER_NAVY, SCANNER_PEACH } from "@/components/scanner/scanner-theme";
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

function phoneMatches(reg: SlotRegistrationItem, query: string): boolean {
  const q = query.replace(/\D/g, "");
  if (!q) return true;
  return reg.mobile.replace(/\D/g, "").includes(q);
}

function slotTabLabel(slot: ScannerTodaySlot): string {
  const range = formatSlotTimeRange(slot.startsAt, slot.endsAt);
  return range ? `${slot.name} ${range}` : slot.name;
}

export function ScannerMobileSlotView({
  slots,
  slotsLoading,
  activeSlotId,
  onSelectSlot,
  slotName,
  registrations,
  loading,
}: {
  slots: ScannerTodaySlot[];
  slotsLoading?: boolean;
  activeSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  slotName?: string | null;
  registrations: SlotRegistrationItem[];
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => registrations.filter((r) => phoneMatches(r, search.trim())),
    [registrations, search],
  );

  return (
    <div className="flex flex-col gap-3 pb-2">
      <ScannerMobileCurrentSlotCard
        slotName={slotName}
        registeredCount={registrations.length}
        loading={loading}
      />

      {slotsLoading && slots.length === 0 ? (
        <div className="h-10 animate-pulse rounded-xl bg-white/70" />
      ) : slots.length > 0 ? (
        <div
          className="flex shrink-0 gap-1 overflow-x-auto rounded-2xl bg-white/90 p-1 shadow-[0_4px_16px_rgba(10,37,64,0.06)]"
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
                  "min-w-[88px] flex-1 whitespace-nowrap rounded-xl px-2 py-2 text-center text-[10px] font-semibold leading-tight transition",
                  selected ? "text-white shadow-sm" : "text-[#0a2540] hover:bg-[#FFF5F0]",
                )}
                style={selected ? { backgroundColor: SCANNER_CORAL } : undefined}
              >
                <span className="line-clamp-2">{slotTabLabel(slot)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-xs" style={{ color: `${SCANNER_NAVY}88` }}>
          No slots configured for today.
        </p>
      )}

      <section className="rounded-[1.25rem] border border-white/80 bg-white p-4 shadow-[0_6px_24px_rgba(10,37,64,0.08)]">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl"
            style={{ backgroundColor: SCANNER_PEACH }}
          >
            <Calendar className="h-4 w-4" strokeWidth={2} style={{ color: SCANNER_CORAL }} />
          </span>
          <h2 className="text-base font-bold" style={{ color: SCANNER_NAVY }}>
            Registered guests
          </h2>
        </div>

        <ScannerSearchRow
          value={search}
          onChange={setSearch}
          disabled={!activeSlotId}
          className="mb-3"
        />

        <div
          className="mb-3 rounded-xl px-3 py-2 text-center text-xs font-semibold"
          style={{ backgroundColor: "#e8f4ff", color: "#3d6a9e" }}
        >
          Registered ({loading ? "…" : registrations.length})
        </div>

        {!activeSlotId ? (
          <p className="py-8 text-center text-sm" style={{ color: `${SCANNER_NAVY}88` }}>
            {slotsLoading ? "Loading…" : "Select a slot above."}
          </p>
        ) : loading && registrations.length === 0 ? (
          <div className="space-y-2 py-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-[#f5f5f7]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: `${SCANNER_NAVY}88` }}>
            {search.trim() ? "No guests match this number." : "No registrations for this slot."}
          </p>
        ) : (
          <ul className="divide-y divide-[#f0f2f5]">
            {filtered.map((reg) => (
              <RegistrationRow key={reg.id} reg={reg} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RegistrationRow({ reg }: { reg: SlotRegistrationItem }) {
  const name = reg.customerName.trim() || "Guest";
  return (
    <li className="flex items-center gap-2.5 py-3 first:pt-0">
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
          pastelInitialsClass(name),
        )}
      >
        {slotInitials(name)}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-bold" style={{ color: SCANNER_NAVY }}>
          {name}
        </p>
        <p className="truncate text-xs" style={{ color: `${SCANNER_NAVY}88` }}>
          {formatDisplayPhone(reg.mobile)}
        </p>
      </div>
      <span className="inline-flex shrink-0 rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[10px] font-medium text-[#6b7280]">
        {formatGuestCountLabel(reg.guestCount)}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#c4c4cc]" strokeWidth={2} />
    </li>
  );
}
