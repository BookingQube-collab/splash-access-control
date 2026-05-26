"use client";

import type { LucideIcon } from "lucide-react";
import { ADMIN_CARD } from "@/components/admin/admin-theme";
import { cn } from "@/lib/utils";

export type AdminSettingsBadgeVariant = "connected" | "enabled" | "not-enabled" | "neutral";

export function AdminSettingsBadge({
  variant,
  label,
}: {
  variant: AdminSettingsBadgeVariant;
  label: string;
}) {
  const styles: Record<AdminSettingsBadgeVariant, string> = {
    connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
    enabled: "border-[#99f6e4] bg-[#ccfbf1] text-[#0f766e]",
    "not-enabled": "border-amber-200 bg-amber-50 text-amber-800",
    neutral: "border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        styles[variant],
      )}
    >
      {label}
    </span>
  );
}

export function AdminSettingsSection({
  id,
  icon: Icon,
  title,
  description,
  badge,
  children,
  className,
}: {
  id?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn(ADMIN_CARD, "p-6 sm:p-7", className)}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f0fdfa] ring-1 ring-[#0d9488]/15">
            <Icon className="h-5 w-5 text-[#0f766e]" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-[#134e4a]">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-[#64748b]">{description}</p>
          </div>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

export const adminSettingsFieldClass =
  "h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white text-sm font-medium text-[#134e4a] shadow-sm outline-none transition placeholder:text-[#94a3b8] hover:border-[#cbd5e1] focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15";

export const adminSettingsLabelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]";
