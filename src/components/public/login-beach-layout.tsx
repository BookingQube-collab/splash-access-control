"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BeachBg } from "@/components/beach-bg";
import { SummerSplashLogo } from "@/components/brand/summer-splash-logo";
import { cn } from "@/lib/utils";

/** Centered logo mark for staff/customer login cards. */
export function LoginWaveMark({ className }: { className?: string }) {
  return (
    <SummerSplashLogo
      size="xl"
      framed
      priority
      className={cn("mx-auto", className)}
    />
  );
}

export function LoginBeachLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "login-page beach-shell-page relative isolate min-h-screen overflow-x-hidden bg-transparent",
        className,
      )}
    >
      <BeachBg variant="aurora" photo />
      <div className="relative z-20 px-4 pt-5 sm:px-6 sm:pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-sm font-semibold text-[#0a4a52] transition hover:text-[#0a4a52]/80"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/80 shadow-[0_4px_16px_rgba(10,74,82,0.12)] backdrop-blur-sm">
            <ArrowLeft className="h-5 w-5 text-[#0a4a52]" strokeWidth={2.25} />
          </span>
          Back to Home
        </Link>
      </div>
      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 pb-10 pt-4">
        {children}
      </div>
    </div>
  );
}
