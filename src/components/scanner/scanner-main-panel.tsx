"use client";

import { ArrowRight, Camera, Keyboard, LogIn, LogOut, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

function scannerSubtitle(
  scanditEnabled: boolean,
  cameraEngine: "scandit" | "html5" | null,
  cameraNotice: string | null,
): string {
  if (cameraEngine === "scandit") return "Scandit • High-speed scan";
  if (cameraEngine === "html5" && cameraNotice) return cameraNotice;
  if (cameraEngine === "html5") {
    return scanditEnabled
      ? "Browser camera fallback"
      : "Browser camera mode";
  }
  if (scanditEnabled) return "Scandit ready — tap Start camera";
  return "Browser camera — enable Scandit in Admin";
}

export function ScannerMainPanel({
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
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#ebebef] bg-white p-4 shadow-[0_2px_12px_rgba(15,39,74,0.06)]">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff4f0] text-[#ff7e67] ring-1 ring-[#ff7e67]/15">
            <ScanLine className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1a2b4a]">Scanner</h2>
            <p className="text-[11px] text-[#6b7280]">{subtitle}</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#b8e6cc] bg-[#edf9f1] px-2.5 py-1 text-[11px] font-medium text-[#1a7a4c]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2db87a]" aria-hidden />
          Ready
        </span>
      </div>

      <div className="mb-3 grid shrink-0 grid-cols-2 gap-2">
        <ModeToggle
          active={mode === "entry"}
          onClick={() => onModeChange("entry")}
          icon={<LogIn className="h-3.5 w-3.5" />}
          label="Entry"
          subtext="Scan guest passes to enter"
        />
        <ModeToggle
          active={mode === "exit"}
          onClick={() => onModeChange("exit")}
          icon={<LogOut className="h-3.5 w-3.5" />}
          label="Exit"
          subtext="Scan to mark exit"
        />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-[#f0f0f2] bg-white">
        <div className="relative h-full min-h-[180px] overflow-hidden rounded-xl">
          {!cameraOn && (
            <>
              <div
                className="scanner-frame-texture absolute inset-0"
                aria-hidden
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 60% at 50% 42%, rgba(255,126,103,0.18) 0%, rgba(255,244,240,0.5) 45%, #ffffff 100%)",
                }}
                aria-hidden
              />
            </>
          )}
          <div className="relative h-full min-h-0">
          {cameraOn ? (
            <>
              <div
                id="qr-reader-desktop"
                className="scanner-qr-reader absolute inset-0 min-h-0"
              />
              <ScannerCoralFrame />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-5 text-center">
              <div className="relative grid place-items-center">
                <span className="absolute h-20 w-20 rounded-full border border-[#ff7e67]/12" />
                <span className="absolute h-14 w-14 rounded-full border border-[#ff7e67]/18" />
                <span className="relative grid h-11 w-11 place-items-center rounded-full bg-white shadow-[0_2px_12px_rgba(255,126,103,0.15)] ring-1 ring-[#ff7e67]/20">
                  <ScanLine className="h-6 w-6 text-[#ff7e67]" strokeWidth={1.75} />
                </span>
              </div>
              <p className="text-sm font-bold text-[#1a2b4a]">Ready to scan</p>
              <p className="max-w-[240px] text-[11px] text-[#6b7280]">
                {scanditEnabled
                  ? "Start camera for Scandit scanning, or use manual entry below"
                  : "Position the QR code within the frame, or use manual entry"}
              </p>
              <OrDivider className="my-1 max-w-[200px]" />
              <button
                type="button"
                onClick={onStartCamera}
                className="inline-flex items-center gap-2 rounded-full bg-coral-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(255,126,103,0.32)] transition hover:brightness-[1.03]"
              >
                <Camera className="h-4 w-4" />
                Start camera
              </button>
            </div>
          )}
          {!cameraOn && <ScannerCoralFrame />}
          </div>
        </div>
      </div>

      {cameraOn && (
        <button
          type="button"
          onClick={onStopCamera}
          className="mt-2 shrink-0 w-full rounded-xl border border-[#e5e5ea] bg-[#fafafa] py-1.5 text-xs font-medium text-[#4b5563] transition hover:bg-[#f5f5f7]"
        >
          Stop camera
        </button>
      )}

      <div className="mt-3 shrink-0">
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#6b7280]">
          <Keyboard className="h-3.5 w-3.5 text-[#9ca3af]" />
          Manual entry
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onHwSubmit();
          }}
          className="mt-1.5"
        >
          <div className="relative">
            <input
              autoFocus
              value={hwInput}
              onChange={(e) => onHwInputChange(e.target.value)}
              placeholder="Scan or paste QR token, then press Enter"
              className="w-full rounded-full border border-[#e5e5ea] bg-[#fafafa] py-2.5 pl-4 pr-12 text-sm text-[#1a2b4a] outline-none transition placeholder:text-[#a3a3a8] focus:border-[#ff7e67]/45 focus:ring-2 focus:ring-[#ff7e67]/12"
            />
            <button
              type="submit"
              aria-label="Submit token"
              className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-coral-gradient text-white shadow-[0_2px_8px_rgba(255,126,103,0.28)] transition hover:brightness-[1.03]"
            >
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function ModeToggle({
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
        "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition",
        active
          ? "border-[#ff7e67] bg-[#fff4f0] shadow-[0_1px_3px_rgba(255,126,103,0.12)]"
          : "border-[#e5e5ea] bg-white hover:border-[#d4d4d8]",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-bold",
          active ? "text-[#ff7e67]" : "text-[#6b7280]",
        )}
      >
        {icon}
        {label}
      </span>
      <span className={cn("text-[10px] leading-tight", active ? "text-[#6b7280]" : "text-[#9ca3af]")}>
        {subtext}
      </span>
    </button>
  );
}

function OrDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full items-center gap-3", className)}>
      <span className="h-px flex-1 bg-[#e5e5ea]" />
      <span className="text-[11px] text-[#9ca3af]">or</span>
      <span className="h-px flex-1 bg-[#e5e5ea]" />
    </div>
  );
}

function ScannerCoralFrame() {
  const corners = [
    "top-3 left-3 border-t-[3px] border-l-[3px] rounded-tl-md",
    "top-3 right-3 border-t-[3px] border-r-[3px] rounded-tr-md",
    "bottom-3 left-3 border-b-[3px] border-l-[3px] rounded-bl-md",
    "bottom-3 right-3 border-b-[3px] border-r-[3px] rounded-br-md",
  ];
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {corners.map((c) => (
        <span key={c} className={`absolute h-10 w-10 border-[#ff7e67] ${c}`} />
      ))}
    </div>
  );
}
