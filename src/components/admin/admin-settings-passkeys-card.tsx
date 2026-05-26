"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Fingerprint } from "lucide-react";
import { PasskeySettingsPanel } from "@/components/passkey-settings-panel";
import {
  AdminSettingsBadge,
  AdminSettingsSection,
} from "@/components/admin/admin-settings-section";
import {
  clearPasskeysAvailabilityCache,
  getPasskeysDashboardUrl,
  getPasskeysStatusSync,
  probePasskeysEnabled,
} from "@/lib/passkey-auth";
import { ADMIN_TEAL } from "@/components/admin/admin-theme";

export function AdminSettingsPasskeysCard() {
  const [projectPasskeysEnabled, setProjectPasskeysEnabled] = useState<boolean>(() =>
    getPasskeysStatusSync(),
  );
  const dashboardUrl = getPasskeysDashboardUrl();

  const refreshStatus = useCallback(async (forceProbe = false) => {
    if (forceProbe) clearPasskeysAvailabilityCache();
    const enabled = forceProbe
      ? await probePasskeysEnabled({ forceProbe: true })
      : getPasskeysStatusSync();
    setProjectPasskeysEnabled(enabled);
  }, []);

  useEffect(() => {
    setProjectPasskeysEnabled(getPasskeysStatusSync());
  }, []);

  return (
    <AdminSettingsSection
      id="settings-passkeys"
      icon={Fingerprint}
      title="Passkeys"
      description="Staff can sign in with device biometrics or security keys when enabled in Supabase."
      badge={
        <AdminSettingsBadge
          variant={projectPasskeysEnabled ? "enabled" : "not-enabled"}
          label={projectPasskeysEnabled ? "Enabled" : "Not enabled"}
        />
      }
    >
      <div className="space-y-5">
        {projectPasskeysEnabled === false && (
          <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            <p className="font-semibold text-amber-900">
              Passkeys are not enabled for this Supabase project
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-amber-900/80">
              <li>Open your project → Authentication → Passkeys (Beta).</li>
              <li>Turn passkeys on.</li>
              <li>
                Set Site URL to this app&apos;s origin (e.g.{" "}
                <code className="rounded bg-amber-100 px-1 text-xs">http://localhost:3000</code> for
                local dev).
              </li>
            </ol>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                style={{ color: ADMIN_TEAL }}
              >
                Open Passkeys in Supabase
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                className="text-sm font-semibold text-[#0f766e] hover:underline"
                onClick={() => void refreshStatus(true)}
              >
                Re-check status
              </button>
            </div>
            <p className="mt-3 text-xs text-amber-900/70">
              Passkeys are off by default in this app. After enabling them in Supabase, set{" "}
              <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_PASSKEYS_ENABLED=true</code>{" "}
              in <code className="rounded bg-amber-100 px-1">.env.local</code> and restart the dev server.
              Use <strong>Re-check status</strong> to probe without changing env.
            </p>
          </div>
        )}

        <PasskeySettingsPanel embeddedInSettings />
      </div>
    </AdminSettingsSection>
  );
}
