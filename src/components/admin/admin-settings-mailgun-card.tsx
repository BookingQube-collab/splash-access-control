"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SecretInput } from "@/components/secret-input";
import { AdminSettingsActionBtn } from "@/components/admin/admin-settings-action-btn";
import {
  AdminSettingsBadge,
  AdminSettingsSection,
  adminSettingsFieldClass,
  adminSettingsLabelClass,
} from "@/components/admin/admin-settings-section";
import { adminGetMailgunSettings, adminSaveMailgunSettings } from "@/lib/admin.functions";
import { formatActionError } from "@/lib/utils";

export function AdminSettingsMailgunCard() {
  const { data, refetch } = useQuery({
    queryKey: ["mailgun-settings"],
    queryFn: () => adminGetMailgunSettings(),
  });

  const [apiKey, setApiKey] = useState("");
  const [domain, setDomain] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [synced, setSynced] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!synced && data?.settings) {
      setDomain(data.settings.mailgun_domain ?? "");
      setFromEmail(data.settings.mailgun_from_email ?? "");
      setEnabled(!!data.settings.mailgun_enabled);
      setSynced(true);
    }
  }, [data, synced]);

  const keyStored = Boolean(data?.hasApiKey);
  const keyFromEnv = Boolean(data?.apiKeyFromEnv);
  const configured = Boolean(data?.apiKeyConfigured);

  const save = async () => {
    setSaving(true);
    try {
      await adminSaveMailgunSettings({
        mailgun_api_key: apiKey.trim() ? apiKey.trim() : undefined,
        mailgun_domain: domain.trim() || null,
        mailgun_from_email: fromEmail.trim() || null,
        mailgun_enabled: enabled,
      });
      setApiKey("");
      await refetch();
      toast.success("Mailgun settings saved");
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSettingsSection
      id="settings-mailgun"
      icon={Mail}
      title="Email (Mailgun)"
      description="Send guests their digital pass and My Passes link when they register with an email address."
      badge={
        <AdminSettingsBadge
          variant={enabled && configured ? "enabled" : "neutral"}
          label={enabled && configured ? "Enabled" : enabled ? "Incomplete" : "Disabled"}
        />
      }
    >
      <div className="space-y-5">
        <div>
          <Label className={adminSettingsLabelClass}>Mailgun API key</Label>
          <SecretInput
            value={apiKey}
            onChange={setApiKey}
            placeholder={
              keyStored
                ? "•••• stored in database ••••"
                : keyFromEnv
                  ? "Using MAILGUN_API_KEY from env"
                  : "Private API key"
            }
            className={adminSettingsFieldClass}
          />
          {keyFromEnv && (
            <p className="mt-1.5 text-xs text-[#64748b]">
              API key loaded from server environment (<code className="text-[11px]">MAILGUN_API_KEY</code>
              ). Leave blank to keep using env.
            </p>
          )}
        </div>

        <div>
          <Label className={adminSettingsLabelClass}>Sending domain</Label>
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="mg.yourdomain.com"
            className={adminSettingsFieldClass}
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs text-[#64748b]">
            Verified domain in Mailgun (used in{" "}
            <code className="text-[11px]">POST /v3/&#123;domain&#125;/messages</code>).
          </p>
        </div>

        <div>
          <Label className={adminSettingsLabelClass}>From email</Label>
          <Input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="passes@mg.yourdomain.com"
            className={adminSettingsFieldClass}
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs text-[#64748b]">
            Must be authorized for your Mailgun domain (e.g.{" "}
            <code className="text-[11px]">noreply@mg.example.com</code>).
          </p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#e8e4dc] bg-[#FAF8F4] p-4">
          <div>
            <div className="font-medium text-[#0a4a52]">Send digital pass emails</div>
            <div className="text-xs text-[#5a7a80]">
              When on, guests who enter an email at registration receive their pass link automatically.
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <AdminSettingsActionBtn
          label="Save Mailgun settings"
          loading={saving}
          onClick={() => void save()}
          primary
        />
      </div>
    </AdminSettingsSection>
  );
}
