"use client";

import type { ReactNode } from "react";
import { BeachBg } from "@/components/beach-bg";
import { cn } from "@/lib/utils";

/** Animated beach background + decor (login / my-passes). */
export function CustomerBeachShell({
  children,
  className = "",
  login = false,
}: {
  children: ReactNode;
  className?: string;
  login?: boolean;
}) {
  return (
    <div
      className={cn(
        "beach-shell-page relative isolate min-h-screen overflow-x-hidden bg-transparent",
        login && "login-page customer-login-page",
        className,
      )}
    >
      <BeachBg variant="ocean" photo />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
