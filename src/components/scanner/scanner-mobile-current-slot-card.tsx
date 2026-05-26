"use client";

import { Calendar, Users } from "lucide-react";
import { SCANNER_CORAL, SCANNER_NAVY, SCANNER_PEACH } from "@/components/scanner/scanner-theme";
import { cn } from "@/lib/utils";

export function ScannerMobileCurrentSlotCard({
  slotName,
  registeredCount,
  loading,
  className,
}: {
  slotName?: string | null;
  registeredCount: number;
  loading?: boolean;
  className?: string;
}) {
  const displayName = slotName?.trim() || "—";
  const countLabel = loading ? "…" : String(registeredCount);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-white/80 bg-white px-3.5 py-3 shadow-[0_8px_28px_rgba(10,37,64,0.1)]",
        className,
      )}
    >
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: SCANNER_PEACH }}
      >
        <Calendar className="h-5 w-5" strokeWidth={2} style={{ color: SCANNER_CORAL }} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium" style={{ color: `${SCANNER_NAVY}99` }}>
          Current slot
        </p>
        <div className="mt-0.5 flex min-w-0 items-center gap-2">
          <p className="truncate text-[15px] font-bold" style={{ color: SCANNER_NAVY }}>
            {displayName}
          </p>
          <span className="inline-flex shrink-0 items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: SCANNER_CORAL }}
              aria-hidden
            />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: SCANNER_CORAL }}>
              Live
            </span>
          </span>
        </div>
      </div>

      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold"
        style={{ backgroundColor: SCANNER_PEACH, color: SCANNER_NAVY }}
      >
        <Users className="h-3.5 w-3.5" style={{ color: SCANNER_CORAL }} strokeWidth={2} />
        {countLabel} Registered
      </span>
    </div>
  );
}
