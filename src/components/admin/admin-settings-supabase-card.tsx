"use client";

import { forwardRef } from "react";
import { Database } from "lucide-react";
import {
  AdminSupabasePanel,
  type AdminSupabasePanelHandle,
} from "@/components/admin/admin-supabase-panel";
import {
  AdminSettingsBadge,
  AdminSettingsSection,
} from "@/components/admin/admin-settings-section";
import { useSupabaseEnvQuery } from "@/hooks/use-supabase-env-query";

type AdminSettingsSupabaseCardProps = {
  onRestartRequired?: (required: boolean) => void;
};

export const AdminSettingsSupabaseCard = forwardRef<
  AdminSupabasePanelHandle,
  AdminSettingsSupabaseCardProps
>(function AdminSettingsSupabaseCard({ onRestartRequired }, ref) {
  const { data: supabaseEnv } = useSupabaseEnvQuery();

  const connected = Boolean(supabaseEnv?.supabaseUrl?.trim() && supabaseEnv?.publishableKey?.trim());

  return (
    <AdminSettingsSection
      id="settings-supabase"
      icon={Database}
      title="Supabase"
      description="Project URL and API keys written to .env.local for auth, storage, and passkeys."
      badge={
        <AdminSettingsBadge
          variant={connected ? "connected" : "neutral"}
          label={connected ? "Connected" : "Not configured"}
        />
      }
    >
      <AdminSupabasePanel ref={ref} embedded onRestartRequired={onRestartRequired} />
    </AdminSettingsSection>
  );
});
