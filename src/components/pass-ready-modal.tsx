"use client";

import { useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Download,
  Shield,
  Star,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PwaInstallDialog } from "@/components/pwa-install-dialog";
import { guestMyPassesPath, guestMyPassesUrl } from "@/lib/public-url";
import { cn } from "@/lib/utils";

export type PassReadyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
  /** Guest mobile from registration — enables session warm-up in my-passes URL. */
  mobile?: string;
  customerName?: string;
  /** Slot / experience label for subtitle, e.g. "Park Guest". */
  slotLabel?: string;
  guestCount?: number;
};

function PalmBeachArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="pass-ready-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.12" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="260" cy="118" rx="90" ry="14" fill="white" opacity="0.18" />
      <path
        d="M48 118 Q52 72 58 48 Q62 78 64 118 Z M58 118 Q64 68 72 38 Q74 82 76 118 Z M70 118 Q78 58 88 28 Q86 78 90 118 Z"
        fill="white"
        opacity="0.22"
      />
      <path
        d="M200 118 Q204 80 210 58 Q214 88 216 118 Z M212 118 Q218 74 226 44 Q228 86 232 118 Z"
        fill="white"
        opacity="0.16"
      />
      <circle cx="72" cy="36" r="18" fill="url(#pass-ready-sky)" opacity="0.5" />
      <path
        d="M0 100 Q80 88 160 96 T320 92 L320 140 L0 140 Z"
        fill="white"
        opacity="0.08"
      />
    </svg>
  );
}

function QrCornerBrackets() {
  const corners: { className: string; color: "teal" | "coral" }[] = [
    {
      className: "top-3 left-3 border-t-[3px] border-l-[3px] rounded-tl-md",
      color: "teal",
    },
    {
      className: "top-3 right-3 border-t-[3px] border-r-[3px] rounded-tr-md",
      color: "coral",
    },
    {
      className: "bottom-3 left-3 border-b-[3px] border-l-[3px] rounded-bl-md",
      color: "coral",
    },
    {
      className: "bottom-3 right-3 border-b-[3px] border-r-[3px] rounded-br-md",
      color: "teal",
    },
  ];
  return (
    <>
      {corners.map(({ className, color }) => (
        <span
          key={className}
          className={cn(
            "pointer-events-none absolute h-9 w-9",
            color === "teal" ? "border-brand-teal" : "border-brand-coral",
            className,
          )}
        />
      ))}
    </>
  );
}

export function PassReadyModal({
  open,
  onOpenChange,
  token,
  mobile,
  customerName,
  slotLabel,
  guestCount,
}: PassReadyModalProps) {
  const [installOpen, setInstallOpen] = useState(false);

  if (!token) return null;

  const myPassesFullUrl = guestMyPassesUrl(token, mobile);
  const myPassesPath = guestMyPassesPath(token, mobile);
  const tokenDisplay = `${token.slice(0, 8).toUpperCase()}…`;

  const openMyPassesAndInstall = () => {
    window.open(myPassesFullUrl, "_blank", "noopener,noreferrer");
    setInstallOpen(true);
  };

  const subtitleParts: string[] = [];
  if (slotLabel?.trim()) subtitleParts.push(slotLabel.trim());
  if (guestCount != null && guestCount > 0) {
    subtitleParts.push(`${guestCount} guest${guestCount === 1 ? "" : "s"}`);
  }
  const subtitle = subtitleParts.join(" • ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        overlayClassName="bg-[#0a4a52]/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out"
        className="w-[calc(100%-2rem)] max-w-[400px] border-0 bg-transparent p-0 shadow-none sm:rounded-[24px]"
      >
        <DialogTitle className="sr-only">
          {customerName ? `${customerName}'s pass is ready` : "Your pass is ready"}
        </DialogTitle>

        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="relative overflow-hidden rounded-[24px] border border-[#e8eef0] bg-white shadow-[0_24px_64px_rgba(10,74,82,0.18)]"
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full text-[#5a7a80] transition hover:bg-[#eef6f7] hover:text-[#0a4a52]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="px-6 pb-5 pt-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f7f8] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-teal">
              <Star className="h-3.5 w-3.5 fill-brand-teal/25 text-brand-teal" aria-hidden />
              PASS READY
            </div>

            {customerName ? (
              <h2 className="mt-4 font-display text-[1.75rem] font-bold leading-tight tracking-tight text-[#0a4a52]">
                {customerName}
              </h2>
            ) : null}

            {subtitle ? (
              <p className="mt-1 text-sm font-medium text-[#5a7a80]">{subtitle}</p>
            ) : null}

            <div className="relative mt-5 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#0a4a52] via-brand-teal to-[#5ed4de] px-4 pb-4 pt-4 shadow-glow-aqua">
              <PalmBeachArt className="opacity-90" />

              <div className="relative mx-auto w-fit">
                <Link
                  href={myPassesPath}
                  target="_blank"
                  className="relative block rounded-[18px] bg-white p-4 shadow-[0_8px_32px_rgba(10,74,82,0.12)] transition hover:brightness-[1.02]"
                >
                  <div className="relative">
                    <QRCodeSVG value={myPassesFullUrl} size={200} level="H" includeMargin={false} />
                    <QrCornerBrackets />
                  </div>
                </Link>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-[#0a4a52]">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-teal" aria-hidden />
              Scan to open your pass
            </div>

            <p className="mt-2 text-center text-xs leading-relaxed text-[#5a7a80]">
              Scan on your phone to open your pass and save to your home screen for quick entry.
            </p>

            <button
              type="button"
              onClick={openMyPassesAndInstall}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-teal via-[#00929c] to-brand-teal-dark px-5 py-3.5 text-sm font-bold text-white shadow-glow-aqua transition hover:brightness-105"
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              Download SummerSplash App
            </button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-[#5a7a80]">
              Get instant QR access, live slot updates, and group pass management in the SummerSplash app.
            </p>
          </div>

          <div className="flex items-center gap-2.5 border-t border-[#e8eef0] bg-[#faf8f4] px-5 py-3.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eef6f7] text-brand-teal">
              <Shield className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#5a7a80]">Token</p>
              <p className="truncate font-mono text-xs font-semibold text-[#0a4a52]">{tokenDisplay}</p>
            </div>
          </div>
        </motion.div>
      </DialogContent>

      <PwaInstallDialog
        open={installOpen}
        onOpenChange={setInstallOpen}
        myPassesHref={myPassesPath}
      />
    </Dialog>
  );
}
