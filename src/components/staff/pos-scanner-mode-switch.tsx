"use client";

import { usePathname, useRouter } from "next/navigation";
import { ScanLine, Store } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { canSwitchPosScanner } from "@/lib/staff-auth";
import { cn } from "@/lib/utils";

type StaffMode = "pos" | "scanner";

const MODES: { id: StaffMode; label: string; shortLabel: string; href: string; icon: typeof Store }[] = [
  { id: "pos", label: "POS", shortLabel: "POS", href: "/pos", icon: Store },
  { id: "scanner", label: "Scanner", shortLabel: "Scan", href: "/scanner", icon: ScanLine },
];

export function PosScannerModeSwitch({
  className,
  compact,
}: {
  className?: string;
  /** Smaller labels for tight mobile headers. */
  compact?: boolean;
}) {
  const { roles, rolesLoaded } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!rolesLoaded || !canSwitchPosScanner(roles)) return null;

  const active: StaffMode = pathname.startsWith("/scanner") ? "scanner" : "pos";

  return (
    <div
      role="group"
      aria-label="Switch between POS and Scanner"
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-white p-0.5 ring-1 ring-[#dce8ea] shadow-[0_2px_8px_-4px_rgba(10,74,82,0.15)]",
        className,
      )}
    >
      {MODES.map(({ id, label, shortLabel, href, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              if (!isActive) router.push(href);
            }}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition sm:px-3",
              isActive
                ? id === "pos"
                  ? "bg-[#00a8b5] text-white shadow-[0_2px_8px_-2px_rgba(0,168,181,0.45)]"
                  : "bg-[#ff7e67] text-white shadow-[0_2px_8px_-2px_rgba(255,126,103,0.45)]"
                : "text-[#0a4a52] hover:bg-[#eefafb]",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
            <span className={compact ? "sm:hidden" : undefined}>{compact ? shortLabel : label}</span>
            {compact ? (
              <span className="hidden sm:inline">{label}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
