"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SecretInput } from "@/components/secret-input";
import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminSettingsActionBtn } from "@/components/admin/admin-settings-action-btn";
import { adminGetSettings, adminSaveScannerSettings } from "@/lib/admin.functions";
import { formatActionError } from "@/lib/utils";

export type AdminScannerPanelHandle = {
  save: (options?: { silent?: boolean }) => Promise<{ ok: boolean }>;
};

type AdminScannerPanelProps = {
  /** When true, render form only (no AdminPanel wrapper). */
  embedded?: boolean;
};

export const AdminScannerPanel = forwardRef<AdminScannerPanelHandle, AdminScannerPanelProps>(
  function AdminScannerPanel({ embedded }, ref) {
  const { data, refetch } = useQuery({
    queryKey: ["a-settings"],
    queryFn: () => adminGetSettings(),
  });

  const [scanditKey, setScanditKey] = useState("");
  const [scanditEnabled, setScanditEnabled] = useState(false);
  const [synced, setSynced] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!synced && data?.settings) {
      setScanditKey(data.settings.scandit_api_key ?? "");
      setScanditEnabled(!!data.settings.scandit_enabled);
      setSynced(true);
    }
  }, [data, synced]);

  const save = useCallback(async (options?: { silent?: boolean }): Promise<{ ok: boolean }> => {
    setSaving(true);
    try {
      await adminSaveScannerSettings({
        scandit_api_key: scanditKey.trim() || null,
        scandit_enabled: scanditEnabled,
      });
      await refetch();
      if (!options?.silent) toast.success("Scanner settings saved");
      return { ok: true };
    } catch (e: unknown) {
      toast.error(formatActionError(e));
      return { ok: false };
    } finally {
      setSaving(false);
    }
  }, [scanditKey, scanditEnabled, refetch]);

  useImperativeHandle(ref, () => ({ save }), [save]);

  const keyStored = Boolean(data?.settings?.scandit_api_key?.trim());

  const body = (
      <div className={embedded ? "space-y-5" : "max-w-xl space-y-5"}>
        <div>
          <Label className="mb-1.5 block text-xs uppercase tracking-wider text-[#5a7a80]">
            Scandit API Key
          </Label>
          <SecretInput
            value={scanditKey}
            onChange={setScanditKey}
            placeholder={keyStored ? "•••• stored ••••" : "Paste API key"}
          />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-[#e8e4dc] bg-[#FAF8F4] p-4">
          <div>
            <div className="font-medium text-[#0a4a52]">Enable Scandit scanning</div>
            <div className="text-xs text-[#5a7a80]">
              When off, scanner falls back to browser camera.
            </div>
          </div>
          <Switch checked={scanditEnabled} onCheckedChange={setScanditEnabled} />
        </div>
        <AdminSettingsActionBtn
          label="Save scanner settings"
          loading={saving}
          onClick={() => void save()}
          primary
        />
      </div>
  );

  if (embedded) return body;

  return <AdminPanel title="Scanner">{body}</AdminPanel>;
});
