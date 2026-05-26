"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Car, User, Star, Crown, Anchor, Sun, CheckCircle2, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { PosEmpty, PosFullBanner, SLOT_PALETTE, type SlotRow } from "@/components/pos/pos-shared";
import { formatSlotTimeRange, isSlotPastForDate, slotUnavailableLabel } from "@/lib/slot-time";

const SLOT_ICONS = [Car, User, Star, Crown, Anchor, Sun];

export const PosSlotTypeCards = memo(function PosSlotTypeCards({
  slots,
  slotId,
  bookingDateYmd,
  onSelect,
}: {
  slots: SlotRow[];
  slotId: string;
  bookingDateYmd: string;
  onSelect: (id: string) => void;
}) {
  if (slots.length === 0) return <PosEmpty>No slots configured.</PosEmpty>;
  if (slots.every((s) => s.remaining <= 0)) {
    return <PosFullBanner>All slots are full — registrations are paused.</PosFullBanner>;
  }

  return (
    <motion.div layout className="flex flex-col gap-2.5">
      {slots.map((s, idx) => {
        const full = s.remaining <= 0;
        const past = isSlotPastForDate(s, bookingDateYmd);
        const unavailable = full || past;
        const endedLabel = past ? slotUnavailableLabel(s, bookingDateYmd) : null;
        const selected = slotId === s.id;
        const booked = s.capacity - s.remaining;
        const pct = Math.min(100, Math.round((booked / Math.max(1, s.capacity)) * 100));
        const palette = SLOT_PALETTE[idx % SLOT_PALETTE.length];
        const Icon = SLOT_ICONS[idx % SLOT_ICONS.length];
        return (
          <motion.button
            key={s.id}
            type="button"
            layout
            whileTap={{ scale: 0.99 }}
            onClick={() => !unavailable && onSelect(s.id)}
            disabled={unavailable}
            className={cn(
              "pos-subcard relative flex w-full items-center gap-2.5 p-2.5 text-left transition",
              selected ? "pos-subcard-selected" : "hover:border-[#dce8ea]",
              unavailable && "cursor-not-allowed opacity-50",
            )}
          >
            {selected && (
              <span
                aria-hidden
                className="pointer-events-none absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-[#00a8b5] text-white shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
            )}
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1", palette.iconBg)}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <motion.div layout className="font-display text-sm font-bold leading-tight text-[#0a4a52] sm:text-base">
                {s.name}
              </motion.div>
              <motion.div
                layout
                className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#5a7a80]"
              >
                <Timer className="h-3 w-3 shrink-0" />
                <span className="truncate">{formatSlotTimeRange(s.starts_at, s.ends_at)}</span>
              </motion.div>
              <div className="mt-2 h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-[#e8eef0]">
                <motion.div
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4 }}
                  className={cn("h-full rounded-full bg-gradient-to-r", palette.bar)}
                />
              </div>
            </div>
            <div className={cn("shrink-0 text-right", selected && "pr-8")}>
              {full ? (
                <span className="rounded-md bg-[#ffecec] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#e5484d]">
                  Full
                </span>
              ) : past && endedLabel ? (
                <span className="rounded-md bg-[#f3f4f6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
                  {endedLabel}
                </span>
              ) : (
                <span className="font-display text-lg font-extrabold tabular-nums text-[#0a4a52]">
                  {booked}
                  <span className="text-sm font-semibold text-[#5a7a80]"> / {s.capacity}</span>
                </span>
              )}
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
});
