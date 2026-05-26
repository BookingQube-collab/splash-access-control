"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CustomerPass } from "./types";
import { formatSlotTime, isPassActive, passBookingDate, statusLabel } from "./utils";
import { parseYmd } from "@/lib/utils";
import { cn } from "@/lib/utils";

function sortPasses(passes: CustomerPass[]) {
  return [...passes].sort(
    (a, b) => passBookingDate(b).localeCompare(passBookingDate(a)) || formatSlotTime(a).localeCompare(formatSlotTime(b)),
  );
}

function PassStatusBadge({ pass }: { pass: CustomerPass }) {
  const active = isPassActive(pass);
  const label = statusLabel(pass);
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
        active ? "bg-[#c8ece9] text-[#0a4f58]" : "bg-red-50 text-red-700 ring-1 ring-red-200/80",
      )}
    >
      {active ? label : "Inactive"}
    </span>
  );
}

function PassListRow({
  pass,
  onOpenPass,
  highlight,
}: {
  pass: CustomerPass;
  onOpenPass: (p: CustomerPass) => void;
  highlight?: boolean;
}) {
  const ymd = passBookingDate(pass);
  const active = isPassActive(pass);

  return (
    <button
      type="button"
      onClick={() => onOpenPass(pass)}
      className={cn(
        "flex w-full items-center gap-3 rounded-[20px] bg-white p-4 text-left shadow-[0_10px_30px_rgba(16,42,67,0.08)] ring-1 ring-black/[0.04] transition active:scale-[0.99]",
        active ? "" : "opacity-75",
        highlight && "ring-2 ring-[#00A9BC]/50",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00A9BC]">
          {(pass.slot_name ?? "General guest").toUpperCase()}
        </p>
        <p className="mt-1 font-display text-base font-extrabold text-[#102A43]">{formatSlotTime(pass)}</p>
        <p className="mt-0.5 text-xs text-[#102A43]/60">
          {format(parseYmd(ymd), "EEE · MMM d")} · {pass.guest_count} guest{pass.guest_count === 1 ? "" : "s"}
        </p>
      </div>
      <PassStatusBadge pass={pass} />
      <ChevronRight className="h-5 w-5 shrink-0 text-[#102A43]/30" />
    </button>
  );
}

export function CustomerPassesListTab({
  passes,
  onOpenPass,
}: {
  passes: CustomerPass[];
  onOpenPass: (p: CustomerPass) => void;
}) {
  const sorted = sortPasses(passes);

  if (sorted.length === 0) {
    return (
      <div className="px-4 pb-28 pt-2 text-center">
        <p className="rounded-[20px] bg-white p-8 text-sm text-[#102A43]/70 shadow-[0_10px_30px_rgba(16,42,67,0.08)]">
          No passes yet. Book a slot to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pb-28 pt-2">
      <p className="font-display text-lg font-extrabold text-[#102A43]">All passes</p>
      {sorted.map((p) => (
        <PassListRow key={p.id} pass={p} onOpenPass={onOpenPass} />
      ))}
    </div>
  );
}

/** Compact list for the pass detail dialog ("All passes for this number"). */
export function CustomerAllPassesPanel({
  passes,
  currentQrToken,
  onOpenPass,
  onBack,
}: {
  passes: CustomerPass[];
  currentQrToken?: string;
  onOpenPass: (p: CustomerPass) => void;
  onBack: () => void;
}) {
  const sorted = sortPasses(passes);

  return (
    <div className="flex max-h-[85vh] flex-col overflow-hidden bg-white font-[family-name:var(--font-body)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.06] px-4 py-3.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0f4f6] text-[#102A43] transition active:scale-95"
          aria-label="Back to pass"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-extrabold text-[#102A43]">All passes for this number</p>
          <p className="text-xs text-[#102A43]/55">Active and inactive bookings</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {sorted.length <= 1 ? (
          <div className="rounded-[20px] bg-[#f0f4f6] px-5 py-8 text-center">
            <p className="font-display text-base font-extrabold text-[#102A43]">Only one pass on this number</p>
            <p className="mt-2 text-sm text-[#102A43]/65">
              You don&apos;t have any other registrations linked to this mobile number yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((p) => (
              <PassListRow
                key={p.id}
                pass={p}
                onOpenPass={onOpenPass}
                highlight={p.qr_token === currentQrToken}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
