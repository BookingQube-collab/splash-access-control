"use client";

import { Calendar, History, ScanLine } from "lucide-react";
import { SCANNER_CORAL, SCANNER_NAVY } from "@/components/scanner/scanner-theme";
import { cn } from "@/lib/utils";

export type ScannerMobileTab = "recent" | "scanner" | "slot";

const TABS: { id: ScannerMobileTab; label: string; icon: typeof History }[] = [
  { id: "recent", label: "Recent scans", icon: History },
  { id: "scanner", label: "Scanner", icon: ScanLine },
  { id: "slot", label: "Current slot", icon: Calendar },
];

export function ScannerBottomNav({
  active,
  onChange,
  className,
}: {
  active: ScannerMobileTab;
  onChange: (tab: ScannerMobileTab) => void;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "pointer-events-auto fixed bottom-0 left-0 right-0 z-40 px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2",
        className,
      )}
      aria-label="Scanner navigation"
    >
      <div className="mx-auto flex max-w-[430px] items-stretch justify-around rounded-[1.35rem] border border-white/70 bg-white/96 px-1 py-1 shadow-[0_8px_32px_rgba(10,37,64,0.14)] backdrop-blur-md">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2"
            >
              <Icon
                className="h-[18px] w-[18px] shrink-0"
                strokeWidth={isActive ? 2.25 : 2}
                style={{ color: isActive ? SCANNER_CORAL : `${SCANNER_NAVY}66` }}
              />
              <span
                className={cn(
                  "max-w-full truncate text-center text-[10px] font-semibold leading-tight",
                  isActive ? "text-[#FF6B4A]" : "text-[#0a2540]/45",
                )}
              >
                {label}
              </span>
              {isActive ? (
                <span
                  className="absolute bottom-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: SCANNER_CORAL }}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
