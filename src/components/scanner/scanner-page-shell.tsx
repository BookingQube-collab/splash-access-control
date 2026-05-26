"use client";

import type { ReactNode } from "react";
import { BeachBg } from "@/components/beach-bg";
import { ScannerMobileBackground } from "@/components/scanner/scanner-mobile-background";
import { cn } from "@/lib/utils";

/** Scanner layout shell: beach photo + light wash (desktop); blurred hero (mobile). */
export function ScannerPageShell({
  children,
  className,
  layout = "mobile",
}: {
  children: ReactNode;
  className?: string;
  /** Driven by `useScannerIsDesktop()` in the scanner route. */
  layout?: "mobile" | "desktop";
}) {
  return (
    <div
      className={cn(
        "scanner-page relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-transparent font-[family-name:var(--font-body)]",
        className,
      )}
    >
      {layout === "desktop" ? (
        <>
          <BeachBg variant="ocean" photo overlay="light" />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-white/35" aria-hidden />
        </>
      ) : (
        <ScannerMobileBackground />
      )}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
