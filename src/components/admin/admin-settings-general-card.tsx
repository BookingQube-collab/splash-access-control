"use client";

import { Printer } from "lucide-react";
import { AdminLabelPrinterPanel } from "@/components/admin/admin-label-printer-panel";
import { AdminSettingsSection } from "@/components/admin/admin-settings-section";

/** General tab: label printer and templates (existing panel logic). */
export function AdminSettingsGeneralCard() {
  return (
    <AdminSettingsSection
      id="settings-general"
      icon={Printer}
      title="Label printer"
      description="Zebra entry-pass labels, network or Browser Print, and customizable templates."
    >
      <AdminLabelPrinterPanel embedded />
    </AdminSettingsSection>
  );
}
