"use client";

import { useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CustomerPass } from "./types";
import { CARD_PALETTES } from "./types";
import {
  groupPassesByDate,
  sortedDateKeys,
  formatSlotTime,
  dateLabel,
  statusLabel,
  isPastBookingDate,
  isPassActive,
} from "./utils";
import { parseYmd } from "@/lib/utils";

export function CustomerCalendarTab({
  passes,
  onOpenPass,
}: {
  passes: CustomerPass[];
  onOpenPass: (p: CustomerPass) => void;
}) {
  const grouped = groupPassesByDate(passes);
  const dates = sortedDateKeys(grouped);
  const [expanded, setExpanded] = useState<string | null>(dates[0] ?? null);

  if (dates.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-[#102A43]/70">
        <p className="font-display text-lg font-bold text-[#102A43]">No passes yet</p>
        <p className="mt-2 text-sm">Book a slot to see your schedule here.</p>
      </div>
    );
  }

  return (
    <motion.div className="space-y-3 px-4 pb-28 pt-2">
      {dates.map((ymd, dayIdx) => {
        const dayPasses = grouped.get(ymd) ?? [];
        const open = expanded === ymd;
        const pal = CARD_PALETTES[dayIdx % CARD_PALETTES.length];
        const pastDay = isPastBookingDate(ymd);
        return (
          <motion.div
            key={ymd}
            layout
            className={`overflow-hidden rounded-[20px] ${pal.bg} ${pal.text} ${pastDay ? "opacity-55 saturate-50" : ""}`}
          >
            <button
              type="button"
              onClick={() => setExpanded(open ? null : ymd)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div>
                <p className="text-[10px] font-bold uppercase opacity-70">{dateLabel(ymd)}</p>
                <p className="font-display text-xl font-extrabold">
                  {format(parseYmd(ymd), "MMMM d")}
                </p>
                <p className="text-xs opacity-75">
                  {dayPasses.length} pass{dayPasses.length === 1 ? "" : "es"}
                </p>
              </div>
              {open ? (
                <ChevronDown className="h-5 w-5 opacity-60" />
              ) : (
                <ChevronRight className="h-5 w-5 opacity-60" />
              )}
            </button>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-black/10 px-3 pb-3"
                >
                  {dayPasses.map((p) => {
                    const active = isPassActive(p);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onOpenPass(p)}
                        className={`mt-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left backdrop-blur-sm ${
                          active ? "bg-white/40" : "bg-white/25 opacity-80"
                        }`}
                      >
                        <div>
                          <p className="font-display text-base font-extrabold">{p.slot_name}</p>
                          <p className="text-sm opacity-80">
                            {formatSlotTime(p)} · {p.guest_count} guests
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            active ? "bg-white/60" : "bg-red-100/90 text-red-800"
                          }`}
                        >
                          {statusLabel(p)}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
