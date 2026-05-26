"use client";

import type { ReactNode } from "react";
import { BeachBg } from "@/components/beach-bg";
import { cn } from "@/lib/utils";

/** Light beach wash for counter POS after login. */
export function PosBeachShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pos-page relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#faf8f4]",
        className,
      )}
    >
      <BeachBg variant="light" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-white/40" aria-hidden />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
