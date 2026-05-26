"use client";

import { Lock } from "lucide-react";
import { ADMIN_CARD, ADMIN_TEAL } from "@/components/admin/admin-theme";
import { cn } from "@/lib/utils";

export function AdminSettingsFooter({
  saving,
  onSaveAll,
}: {
  saving: boolean;
  onSaveAll: () => void;
}) {
  return (
    <div className={cn(ADMIN_CARD, "flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7")}>
      <div>
        <h3 className="font-display text-lg font-bold text-[#134e4a]">Save all settings</h3>
        <p className="mt-1 max-w-xl text-sm text-[#64748b]">
          Writes Supabase keys to <code className="text-xs">.env.local</code> and scanner options to
          app settings. BookingQube, passkeys, and label printer use their section Save buttons.
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#64748b]">
          <Lock className="h-3.5 w-3.5 text-[#0d9488]" />
          Secrets are encrypted at rest in your environment files.
        </p>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={onSaveAll}
        className="inline-flex shrink-0 items-center justify-center rounded-[16px] px-8 py-3.5 text-base font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
        style={{ background: ADMIN_TEAL }}
      >
        {saving ? "Saving…" : "Save all settings"}
      </button>
    </div>
  );
}
