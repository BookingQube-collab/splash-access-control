"use client";

import type { ReactNode } from "react";
import { BeachBg } from "@/components/beach-bg";
import { RegisterPublicHeader } from "@/components/public/public-header";
import { cn } from "@/lib/utils";

export const REGISTER_CONTENT_CLASS = "mx-auto w-full max-w-[1180px] px-4 sm:px-6";

export const REGISTER_CARD_CLASS =
  "rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]";

export function RegisterBeachLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "register-page beach-shell-page relative isolate min-h-screen overflow-x-hidden bg-transparent",
        className,
      )}
    >
      <BeachBg variant="ocean" photo />
      <RegisterPublicHeader />
      <div className="relative z-10 pb-8">{children}</div>
    </div>
  );
}
