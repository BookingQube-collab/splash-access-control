"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { SummerSplashLogo } from "@/components/brand/summer-splash-logo";
import { PosScannerModeSwitch } from "@/components/staff/pos-scanner-mode-switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { SCANNER_NAVY } from "@/components/scanner/scanner-theme";
import { cn } from "@/lib/utils";

export function ScannerMobileHeader({ className }: { className?: string }) {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const initials =
    user?.email?.slice(0, 1).toUpperCase() ||
    user?.user_metadata?.full_name?.toString()?.slice(0, 1)?.toUpperCase() ||
    "S";

  return (
    <header className={cn("relative z-30 shrink-0 px-4 pb-2 pt-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <SummerSplashLogo size="xs" priority className="mt-0.5" />
          <div className="min-w-0 pt-0.5">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: SCANNER_NAVY, opacity: 0.55 }}
            >
              Beach Festival &apos;26
            </p>
            <h1
              className="text-[17px] font-bold leading-tight tracking-tight"
              style={{ color: SCANNER_NAVY }}
            >
              GATE SCANNER
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <PosScannerModeSwitch compact />
          <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/80 bg-white/95 shadow-[0_4px_16px_rgba(10,37,64,0.12)]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f3f6f9] text-sm font-semibold text-[#0a2540]">
                {initials === "S" ? <User className="h-4 w-4" strokeWidth={2} /> : initials}
              </span>
              <span
                className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2db87a]"
                aria-hidden
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              className="gap-2 text-[#0a2540]"
              onClick={async () => {
                setOpen(false);
                await signOut();
                router.push("/login/scanner");
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
