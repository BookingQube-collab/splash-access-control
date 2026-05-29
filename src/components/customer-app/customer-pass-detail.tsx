"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, X } from "lucide-react";
import type { CustomerPass } from "./types";
import { passUrl } from "@/lib/public-url";
import { isPassActive, passBookingDate, passEnd, passInactiveReason, passStart } from "./utils";
import { parseYmd } from "@/lib/utils";
import { cn } from "@/lib/utils";

function passTypeLabel(pass: CustomerPass): string {
  const raw = pass.slot_name?.trim() || pass.event_name?.trim();
  if (!raw) return "General Guest";
  return raw.replace(/\s+/g, " ");
}

export function CustomerPassDetail({
  pass,
  onAllPasses,
  onClose,
  embedded = false,
}: {
  pass: CustomerPass;
  /** Navigate back to the full guest pass list (/my-passes). */
  onAllPasses: () => void;
  /** Dismiss the pass detail and return to the my-passes list/home. */
  onClose?: () => void;
  /** Render inside bottom sheet (no full-page chrome). */
  embedded?: boolean;
}) {
  const entryQr = passUrl(pass.qr_token);
  const bookingDate = passBookingDate(pass);
  const dateObj = parseYmd(bookingDate);
  const subtitle = `${format(dateObj, "EEE")} · ${format(dateObj, "MMM d, yyyy")} · ${passTypeLabel(pass)}`;

  const guestDisplay = pass.customer_name?.trim() || "Guest";

  const [now, setNow] = useState(() => new Date());
  const active = isPassActive(pass, now);
  const inactiveMessage = passInactiveReason(pass, now) ?? "This pass is no longer valid";
  const statusBadge =
    pass.liveStatus === "Inside" && active
      ? "Checked in"
      : active
        ? "Active"
        : "Expired";
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const liveTime = format(now, "h:mm:ss a");

  const starts = format(passStart(pass), "h:mm a");
  const ends = format(passEnd(pass), "h:mm a");

  return (
    <div
      className={cn(
        "font-[family-name:var(--font-body)]",
        embedded ? "flex max-h-[85vh] flex-col overflow-hidden bg-white" : "relative min-h-screen w-full bg-[#faf8f4]",
      )}
    >
      <header
        className={cn(
          "relative shrink-0 px-5 pb-6 pt-2 text-white sm:px-6",
          embedded ? "rounded-t-[1.25rem] pt-4" : "px-5 pb-10 pt-6",
        )}
        style={{
          background: "linear-gradient(135deg, #00A9BC 0%, #0a8a96 45%, #7dd3d9 100%)",
        }}
      >
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/85">SummerSplash pass</p>
        <h1 className="mt-2 pr-10 font-display text-2xl font-extrabold capitalize leading-tight text-white">{guestDisplay}</h1>
        <p className="mt-2 text-sm font-medium text-white/90">{subtitle}</p>
      </header>

      <div
        className={cn(
          "flex-1 overflow-y-auto bg-white px-4 pb-8 sm:px-5",
          embedded ? "-mt-3 rounded-t-[1.25rem] pt-4 shadow-[0_-8px_32px_rgba(16,42,67,0.12)]" : "-mt-5 min-h-[calc(100vh-9rem)] rounded-t-[1.75rem] pt-0 shadow-[0_-8px_40px_rgba(6,40,50,0.12)]",
        )}
        style={embedded ? undefined : { borderTop: "2px dotted rgb(214 219 226)" }}
      >
        <div className={embedded ? "" : "pt-5"}>
          <div className="flex items-center justify-between gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold ${
                active
                  ? "bg-[#c8ece9] text-[#0a4f58]"
                  : "bg-red-50 text-red-700 ring-1 ring-red-200/80"
              }`}
            >
              {active ? <Check className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden /> : null}
              {statusBadge}
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-[#6b7280]">Live · {liveTime}</span>
          </div>

          <div className="relative mx-auto mt-6 flex max-w-[16.5rem] justify-center rounded-[20px] bg-white p-5 shadow-[0_12px_36px_rgba(15,42,55,0.12)] ring-1 ring-black/[0.04]">
            <div className={cn("transition-opacity", active ? "" : "opacity-30")}>
              <QRCodeSVG value={entryQr} size={220} level="M" />
            </div>
            {!active ? (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-[20px] bg-white/75">
                <span className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-extrabold uppercase tracking-wide text-white">
                  Expired
                </span>
              </div>
            ) : null}
          </div>

          <p
            className={cn(
              "mt-4 text-center text-sm font-semibold",
              active ? "text-[#9ca3af]" : "text-red-600",
            )}
          >
            {active ? "Show this QR at the entry" : inactiveMessage}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <InfoTile label="PASS ID" value={pass.id} mono />
            <InfoTile label="GUESTS" value={String(pass.guest_count)} />
            <InfoTile label="STARTS" value={starts} />
            <InfoTile label="ENDS" value={ends} />
          </div>

          <button
            type="button"
            onClick={onAllPasses}
            className="mt-4 w-full rounded-2xl bg-[#00A9BC] py-3.5 text-center font-display text-[15px] font-extrabold text-white shadow-[0_6px_20px_rgba(0,169,188,0.35)] transition active:scale-[0.99]"
          >
            All passes for this number
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#f0f4f6] px-3 py-3.5 text-[#1f3a45]">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5c6f78]">{label}</p>
      <p
        className={`mt-1.5 break-all text-[13px] font-semibold leading-snug ${mono ? "font-mono text-[11px] sm:text-[12px]" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
