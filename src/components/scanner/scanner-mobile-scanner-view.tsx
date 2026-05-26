"use client";

import {
  ArrowRight,
  Camera,
  Keyboard,
  LogIn,
  LogOut,
  ScanLine,
} from "lucide-react";
import { ScannerMobileCurrentSlotCard } from "@/components/scanner/scanner-mobile-current-slot-card";
import { SCANNER_CORAL, SCANNER_NAVY, SCANNER_PEACH } from "@/components/scanner/scanner-theme";
import { cn } from "@/lib/utils";

function scannerSubtitle(
  scanditEnabled: boolean,
  cameraEngine: "scandit" | "html5" | null,
  cameraNotice: string | null,
): string {
  if (cameraEngine === "scandit") return "Scandit • High-speed scan";
  if (cameraEngine === "html5" && cameraNotice) return cameraNotice;
  if (cameraEngine === "html5") {
    return scanditEnabled ? "Browser camera fallback" : "Browser camera mode";
  }
  if (scanditEnabled) return "Scandit ready — tap Start camera";
  return "Browser camera — enable Scandit in Admin";
}

export function ScannerMobileScannerView({
  slotName,
  registeredCount,
  slotRegsLoading,
  scanditEnabled,
  cameraEngine,
  cameraNotice,
  mode,
  onModeChange,
  cameraOn,
  onStartCamera,
  onStopCamera,
  hwInput,
  onHwInputChange,
  onHwSubmit,
}: {
  slotName?: string | null;
  registeredCount: number;
  slotRegsLoading?: boolean;
  scanditEnabled: boolean;
  cameraEngine: "scandit" | "html5" | null;
  cameraNotice: string | null;
  mode: "entry" | "exit";
  onModeChange: (mode: "entry" | "exit") => void;
  cameraOn: boolean;
  onStartCamera: () => void;
  onStopCamera: () => void;
  hwInput: string;
  onHwInputChange: (value: string) => void;
  onHwSubmit: () => void;
}) {
  const subtitle = scannerSubtitle(scanditEnabled, cameraEngine, cameraNotice);

  return (
    <div className="flex flex-col gap-3 pb-2">
      <ScannerMobileCurrentSlotCard
        slotName={slotName}
        registeredCount={registeredCount}
        loading={slotRegsLoading}
      />

      <div className="grid grid-cols-2 gap-2.5">
        <ModeCard
          active={mode === "entry"}
          onClick={() => onModeChange("entry")}
          icon={<LogIn className="h-4 w-4" />}
          label="Entry"
          subtext="Scan guest passes to enter"
        />
        <ModeCard
          active={mode === "exit"}
          onClick={() => onModeChange("exit")}
          icon={<LogOut className="h-4 w-4" />}
          label="Exit"
          subtext="Scan to mark exit"
        />
      </div>

      <section
        className="overflow-hidden rounded-[1.25rem] border border-white bg-white shadow-[0_8px_36px_rgba(255,107,74,0.18),0_2px_12px_rgba(10,37,64,0.06)]"
      >
        <div className="relative min-h-[300px] overflow-hidden">
          {!cameraOn && (
            <>
              <div className="scanner-frame-texture absolute inset-0" aria-hidden />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 60% at 50% 42%, rgba(255,107,74,0.16) 0%, rgba(255,245,240,0.55) 45%, #ffffff 100%)",
                }}
                aria-hidden
              />
            </>
          )}

          <div className="relative h-full min-h-[300px]">
            {cameraOn ? (
              <>
                <div id="qr-reader-mobile" className="scanner-qr-reader absolute inset-0 min-h-0" />
                <ScannerCoralFrame />
              </>
            ) : (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 px-6 py-6 text-center">
                <div className="relative grid place-items-center">
                  <span
                    className="absolute h-[88px] w-[88px] rounded-full border"
                    style={{ borderColor: `${SCANNER_CORAL}22` }}
                  />
                  <span
                    className="absolute h-[62px] w-[62px] rounded-full border"
                    style={{ borderColor: `${SCANNER_CORAL}33` }}
                  />
                  <span className="relative grid h-12 w-12 place-items-center rounded-full bg-white shadow-[0_4px_20px_rgba(255,107,74,0.2)] ring-1 ring-[#FF6B4A]/25">
                    <ScanLine className="h-6 w-6" strokeWidth={1.75} style={{ color: SCANNER_CORAL }} />
                  </span>
                </div>
                <p className="text-[15px] font-bold" style={{ color: SCANNER_NAVY }}>
                  Ready to scan
                </p>
                <p className="max-w-[260px] text-[12px] leading-snug" style={{ color: `${SCANNER_NAVY}88` }}>
                  {scanditEnabled
                    ? "Start camera for Scandit scanning, or use manual entry below"
                    : "Position the QR code within the frame, or use manual entry"}
                </p>
                <OrDivider className="my-1.5 max-w-[200px]" />
                <button
                  type="button"
                  onClick={onStartCamera}
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(255,107,74,0.38)]"
                  style={{
                    background: "linear-gradient(90deg, #FF6B4A 0%, #ff8f6a 100%)",
                  }}
                >
                  <Camera className="h-4 w-4" />
                  Start camera
                </button>
              </div>
            )}
            {!cameraOn && <ScannerCoralFrame />}
          </div>
        </div>

        {cameraOn && (
          <div className="border-t border-[#f0f0f2] px-4 py-2">
            <button
              type="button"
              onClick={onStopCamera}
              className="w-full rounded-xl border border-[#e5e5ea] bg-[#fafafa] py-2 text-xs font-medium text-[#4b5563]"
            >
              Stop camera
            </button>
            {subtitle ? (
              <p className="mt-1.5 text-center text-[10px]" style={{ color: `${SCANNER_NAVY}88` }}>
                {subtitle}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-[1.25rem] border border-white/80 bg-white px-4 py-3.5 shadow-[0_6px_24px_rgba(10,37,64,0.08)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onHwSubmit();
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
              style={{ backgroundColor: SCANNER_PEACH }}
            >
              <Keyboard className="h-5 w-5" strokeWidth={2} style={{ color: SCANNER_CORAL }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold" style={{ color: SCANNER_NAVY }}>
                Manual entry
              </p>
              <p className="text-[11px] leading-snug" style={{ color: `${SCANNER_NAVY}88` }}>
                Scan or paste QR token
              </p>
            </div>
            <button
              type="submit"
              aria-label="Submit token"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-[0_4px_14px_rgba(255,107,74,0.35)]"
              style={{ background: "linear-gradient(135deg, #FF6B4A, #ff8f6a)" }}
            >
              <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </div>
          <input
            value={hwInput}
            onChange={(e) => onHwInputChange(e.target.value)}
            placeholder="Paste QR token"
            className="mt-2.5 w-full rounded-xl border border-[#e8edf2] bg-[#fafbfc] px-3 py-2 text-sm outline-none focus:border-[#FF6B4A]/50 focus:ring-2 focus:ring-[#FF6B4A]/15"
            style={{ color: SCANNER_NAVY }}
          />
        </form>
      </section>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  label,
  subtext,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  subtext: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-2xl border px-3.5 py-3 text-left transition",
        active ? "border-[#FF6B4A] shadow-[0_2px_10px_rgba(255,107,74,0.12)]" : "border-[#e5e8ec] bg-white",
      )}
      style={active ? { backgroundColor: SCANNER_PEACH } : undefined}
    >
      <span
        className="inline-flex items-center gap-1.5 text-sm font-bold"
        style={{ color: active ? SCANNER_CORAL : SCANNER_NAVY }}
      >
        {icon}
        {label}
      </span>
      <span className="text-[10px] leading-tight" style={{ color: `${SCANNER_NAVY}88` }}>
        {subtext}
      </span>
    </button>
  );
}

function OrDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full items-center gap-3", className)}>
      <span className="h-px flex-1 bg-[#e5e5ea]" />
      <span className="text-[11px]" style={{ color: `${SCANNER_NAVY}66` }}>
        or
      </span>
      <span className="h-px flex-1 bg-[#e5e5ea]" />
    </div>
  );
}

function ScannerCoralFrame() {
  const corners = [
    "top-4 left-4 border-t-[3px] border-l-[3px] rounded-tl-md",
    "top-4 right-4 border-t-[3px] border-r-[3px] rounded-tr-md",
    "bottom-4 left-4 border-b-[3px] border-l-[3px] rounded-bl-md",
    "bottom-4 right-4 border-b-[3px] border-r-[3px] rounded-br-md",
  ];
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {corners.map((c) => (
        <span key={c} className={`absolute h-10 w-10 border-[#FF6B4A] ${c}`} />
      ))}
    </div>
  );
}
