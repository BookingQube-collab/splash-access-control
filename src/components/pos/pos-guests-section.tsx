"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function PosGuestsSection({
  guests,
  setGuests,
  maxAllowed,
}: {
  guests: number;
  setGuests: (n: number) => void;
  maxAllowed: number;
}) {
  const setG = (n: number) => setGuests(Math.max(1, Math.min(maxAllowed, Math.floor(n) || 1)));
  const presets = Array.from({ length: Math.min(8, maxAllowed) }, (_, i) => i + 1);

  return (
    <motion.div className="space-y-3">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 rounded-2xl border border-[#dce8ea] bg-[#f7fafb] px-4 py-2">
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={() => setG(guests - 1)}
          disabled={guests <= 1}
          aria-label="Decrease guests"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#dce8ea] bg-white text-2xl font-bold text-[#0a4a52] shadow-sm transition hover:border-[#ff7e67]/40 hover:text-[#ff7e67] disabled:cursor-not-allowed disabled:opacity-40"
        >
          -
        </motion.button>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={maxAllowed}
          value={guests}
          onChange={(e) => setG(Number(e.target.value))}
          aria-label="Guest count"
          className="h-14 min-w-0 flex-1 bg-transparent text-center font-display text-5xl font-extrabold tabular-nums tracking-tight text-[#0a4a52] outline-none"
        />
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={() => setG(guests + 1)}
          disabled={guests >= maxAllowed}
          aria-label="Increase guests"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#dce8ea] bg-white text-2xl font-bold text-[#0a4a52] shadow-sm transition hover:border-[#00a8b5]/40 hover:text-[#00a8b5] disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </motion.button>
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {presets.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setG(n)}
              className={cn(
                "grid h-9 min-w-[2.25rem] place-items-center rounded-full px-3 font-display text-sm font-extrabold tabular-nums ring-1 transition",
                guests === n
                  ? "bg-[#00a8b5] text-white ring-[#00a8b5] shadow-[0_8px_24px_-8px_rgba(0,168,181,0.5)]"
                  : "bg-white text-[#5a7a80] ring-[#dce8ea] hover:bg-[#eefafb] hover:text-[#00a8b5]",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <motion.div className="flex items-center justify-center gap-2 text-[10px] text-[#5a7a80]">
        <Users className="h-4 w-4 shrink-0 text-[#00a8b5]" />
        <span>Maximum 20 guests per booking.</span>
      </motion.div>
    </motion.div>
  );
}
