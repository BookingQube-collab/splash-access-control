"use client";

import { forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import {
  AdminScannerPanel,
  type AdminScannerPanelHandle,
} from "@/components/admin/admin-scanner-panel";
import {
  AdminSettingsBadge,
  AdminSettingsSection,
} from "@/components/admin/admin-settings-section";
import { adminGetSettings } from "@/lib/admin.functions";

export const AdminSettingsScannerCard = forwardRef<AdminScannerPanelHandle>(
  function AdminSettingsScannerCard(_props, ref) {
    const { data } = useQuery({
      queryKey: ["a-settings"],
      queryFn: () => adminGetSettings(),
    });

    const enabled = Boolean(data?.settings?.scandit_enabled);

    return (
      <AdminSettingsSection
        id="settings-scanner"
        icon={ScanLine}
        title="Scanner"
        description="Scandit barcode scanning for check-in; falls back to browser camera when disabled."
        badge={
          <AdminSettingsBadge variant={enabled ? "enabled" : "neutral"} label={enabled ? "Enabled" : "Disabled"} />
        }
      >
        <AdminScannerPanel ref={ref} embedded />
      </AdminSettingsSection>
    );
  },
);
