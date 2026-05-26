"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { SummerSplashLogo } from "@/components/brand/summer-splash-logo";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function ScannerSiteHeader({ className }: { className?: string }) {
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <header
      className={cn(
        "relative z-30 shrink-0 border-b border-white/60 bg-white/88 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <SummerSplashLogo size="sm" priority />
          <div className="min-w-0 border-l border-[#e8e8ed] pl-3 sm:pl-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
              Beach Festival &apos;26
            </p>
            <h1 className="truncate text-base font-bold tracking-tight text-[#1a2b4a] sm:text-lg">
              GATE SCANNER
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push("/login/scanner");
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#d4d4d8] bg-white px-3 py-1.5 text-xs font-medium text-[#1a2b4a] transition hover:border-[#ff7e67]/40 hover:bg-[#fff8f6]"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f5f5f7] text-[#6b7280]">
            <User className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <span className="hidden sm:inline">Sign out</span>
          <LogOut className="h-3.5 w-3.5 text-[#6b7280]" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
