"use client";

import { useRef, useState } from "react";
import { Settings } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { toast } from "sonner";
import { ADMIN_PAGE_BG } from "@/components/admin/admin-theme";
import type { AdminSupabasePanelHandle } from "@/components/admin/admin-supabase-panel";
import type { AdminScannerPanelHandle } from "@/components/admin/admin-scanner-panel";
import { AdminSettingsTabs, type AdminSettingsTabKey } from "@/components/admin/admin-settings-tabs";
import {
  AdminSettingsBookingQubeCard,
  type AdminSettingsBookingQubeCardHandle,
} from "@/components/admin/admin-settings-bookingqube-card";
import { AdminSettingsMailgunCard } from "@/components/admin/admin-settings-mailgun-card";
import { AdminSettingsSupabaseCard } from "@/components/admin/admin-settings-supabase-card";
import { AdminSettingsPasskeysCard } from "@/components/admin/admin-settings-passkeys-card";
import { AdminSettingsScannerCard } from "@/components/admin/admin-settings-scanner-card";
import { AdminSettingsGeneralCard } from "@/components/admin/admin-settings-general-card";
import { AdminSettingsSidebarWidgets } from "@/components/admin/admin-settings-sidebar-widgets";
import { AdminSettingsFooter } from "@/components/admin/admin-settings-footer";

export function AdminSettingsTab() {
  const [activeTab, setActiveTab] = useState<AdminSettingsTabKey>("integrations");
  const supabaseRef = useRef<AdminSupabasePanelHandle>(null);
  const scannerRef = useRef<AdminScannerPanelHandle>(null);
  const bqRef = useRef<AdminSettingsBookingQubeCardHandle>(null);
  const syncLogRef = useRef<HTMLDivElement>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [testingAll, setTestingAll] = useState(false);
  const [restartHint, setRestartHint] = useState(false);

  const saveAll = async () => {
    setSavingAll(true);
    try {
      const [supabaseResult, scannerResult] = await Promise.all([
        supabaseRef.current?.save({ silent: true }) ?? { ok: false, restartRequired: false },
        scannerRef.current?.save({ silent: true }) ?? { ok: false },
      ]);

      if (supabaseResult.restartRequired) setRestartHint(true);

      if (supabaseResult.ok && scannerResult.ok) {
        toast.success("Supabase and scanner settings saved");
      } else if (supabaseResult.ok) {
        toast.success("Supabase settings saved");
      } else if (scannerResult.ok) {
        toast.success("Scanner settings saved");
      }
    } finally {
      setSavingAll(false);
    }
  };

  const testAll = async () => {
    setTestingAll(true);
    try {
      await bqRef.current?.testConnection();
    } finally {
      setTestingAll(false);
    }
  };

  const leftColumn = (
    <div className="space-y-6">
      {activeTab === "integrations" && (
        <>
          <AdminSettingsMailgunCard />
          <AdminSettingsBookingQubeCard ref={bqRef} syncLogRef={syncLogRef} />
        </>
      )}
      {activeTab === "supabase" && (
        <AdminSettingsSupabaseCard ref={supabaseRef} onRestartRequired={setRestartHint} />
      )}
      {activeTab === "passkeys" && <AdminSettingsPasskeysCard />}
      {activeTab === "scanner" && <AdminSettingsScannerCard ref={scannerRef} />}
      {activeTab === "general" && <AdminSettingsGeneralCard />}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6" style={{ background: ADMIN_PAGE_BG }}>
      <AdminPageHeader
        icon={Settings}
        title="Settings"
        subtitle="Configure integrations, scanners, printers, and platform preferences."
      />

      <AdminSettingsTabs active={activeTab} onChange={setActiveTab} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,32%)]">
        {leftColumn}
        <AdminSettingsSidebarWidgets
          testingAll={testingAll}
          actions={{
            onTestAll: () => void testAll(),
            onViewSyncLogs: () => {
              setActiveTab("integrations");
              requestAnimationFrame(() => bqRef.current?.scrollToSyncLog());
            },
          }}
        />
      </div>

      {restartHint && (
        <div className="rounded-2xl border border-[#0d9488]/30 bg-[#ccfbf1] px-4 py-3 text-sm text-[#134e4a]">
          Restart the dev server (<code className="text-xs">npm run dev</code>) so Supabase env
          changes take effect.
        </div>
      )}

      <AdminSettingsFooter saving={savingAll} onSaveAll={() => void saveAll()} />
    </div>
  );
}
