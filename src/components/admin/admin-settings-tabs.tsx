"use client";

import { ADMIN_TEAL } from "@/components/admin/admin-theme";
import { cn } from "@/lib/utils";

export type AdminSettingsTabKey = "integrations" | "supabase" | "passkeys" | "scanner" | "general";

const TABS: { key: AdminSettingsTabKey; label: string }[] = [
  { key: "integrations", label: "Integrations" },
  { key: "supabase", label: "Supabase" },
  { key: "passkeys", label: "Passkeys" },
  { key: "scanner", label: "Scanner" },
  { key: "general", label: "General" },
];

export function AdminSettingsTabs({
  active,
  onChange,
}: {
  active: AdminSettingsTabKey;
  onChange: (tab: AdminSettingsTabKey) => void;
}) {
  return (
    <nav
      className="border-b border-[#e2e8f0]"
      aria-label="Settings sections"
    >
      <div className="-mb-px flex flex-wrap gap-1 sm:gap-6">
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                "relative px-3 pb-3 pt-1 text-sm font-semibold transition sm:px-1",
                isActive ? "text-[#0d9488]" : "text-[#64748b] hover:text-[#134e4a]",
              )}
              style={isActive ? { color: ADMIN_TEAL } : undefined}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
              {isActive && (
                <span
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                  style={{ background: ADMIN_TEAL }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
