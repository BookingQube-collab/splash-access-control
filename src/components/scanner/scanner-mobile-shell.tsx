"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ScannerMobileShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden font-[family-name:var(--font-body)] text-[#0a2540]",
        className,
      )}
    >
      {children}
    </div>
  );
}
