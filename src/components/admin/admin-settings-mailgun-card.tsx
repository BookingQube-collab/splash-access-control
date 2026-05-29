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
import {
  adminGetMailgunSettings,
  adminSaveMailgunSettings,
  adminTestSmtpConnection,
} from "@/lib/admin.functions";
import { formatActionError } from "@/lib/utils";

type Driver = "api" | "smtp";
type Encryption = "tls" | "ssl" | "none";

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="mt-1 flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
            value === opt.value
              ? "border-[#0a4a52] bg-[#0a4a52] text-white"
              : "border-[#e8e4dc] bg-white text-[#0a4a52] hover:border-[#0a4a52]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function AdminSettingsMailgunCard() {
  const { data, refetch } = useQuery({
    queryKey: ["mailgun-settings"],
    queryFn: () => adminGetMailgunSettings(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const [driver, setDriver] = useState<Driver>("api");
  const [enabled, setEnabled] = useState(false);

  // API (Mailgun HTTP) fields
  const [apiKey, setApiKey] = useState("");
  const [domain, setDomain] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [region, setRegion] = useState<"us" | "eu">("us");

  // SMTP fields
  const [mailHost, setMailHost] = useState("");
  const [mailPort, setMailPort] = useState("587");
  const [mailUsername, setMailUsername] = useState("");
  const [mailPassword, setMailPassword] = useState("");
  const [mailEncryption, setMailEncryption] = useState<Encryption>("tls");
  const [mailFromEmail, setMailFromEmail] = useState("");
  const [mailFromName, setMailFromName] = useState("");

  const [synced, setSynced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

  useEffect(() => {
    if (synced || !data?.settings) return;
    const s = data.settings;
    setDriver(s.mail_driver === "smtp" ? "smtp" : "api");
    setEnabled(!!s.mailgun_enabled);
    setDomain(s.mailgun_domain ?? "");
    setFromEmail(s.mailgun_from_email ?? "");
    setRegion(s.mailgun_region === "eu" ? "eu" : "us");
    setMailHost(s.mail_host ?? "");
    setMailPort(s.mail_port != null ? String(s.mail_port) : "587");
    setMailUsername(s.mail_username ?? "");
    setMailEncryption((s.mail_encryption as Encryption) ?? "tls");
    setMailFromEmail(s.mail_from_email ?? "");
    setMailFromName(s.mail_from_name ?? "");
    setSynced(true);
  }, [data, synced]);

  const keyStored = Boolean(data?.hasApiKey);
  const keyFromEnv = Boolean(data?.apiKeyFromEnv);
  const passwordStored = Boolean(data?.hasMailPassword);
  const storedPasswordLength = data?.storedPasswordLength ?? 0;
  const passwordLooksTruncated = Boolean(data?.passwordLooksTruncated);
  const configured = Boolean(data?.configured);

  const testSmtp = async () => {
    setTestingSmtp(true);
    try {
      await adminTestSmtpConnection();
      toast.success("SMTP connection verified");
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setTestingSmtp(false);
    }
  };

  const save = async () => {
    if (
      driver === "smtp" &&
      passwordLooksTruncated &&
      !mailPassword.trim()
    ) {
      toast.error(
        `Stored SMTP password is only ${storedPasswordLength} characters (Mailgun passwords are typically 50+). Paste the full password from Mailgun → Domain → SMTP credentials, then save.`,
      );
      return;
    }

    setSaving(true);
    try {
      const portNum = Number(mailPort.trim());
      const payload =
        driver === "smtp"
          ? {
              mail_driver: "smtp" as const,
              mailgun_enabled: enabled,
              mail_host: mailHost.trim() || null,
              mail_port: Number.isFinite(portNum) && portNum > 0 ? portNum : null,
              mail_username: mailUsername.trim() || null,
              mail_password: mailPassword.trim() ? mailPassword.trim() : undefined,
              mail_encryption: mailEncryption,
              mail_from_email: mailFromEmail.trim() || null,
              mail_from_name: mailFromName.trim() || null,
            }
          : {
              mail_driver: "api" as const,
              mailgun_enabled: enabled,
              mailgun_api_key: apiKey.trim() ? apiKey.trim() : undefined,
              mailgun_domain: domain.trim() || null,
              mailgun_from_email: fromEmail.trim() || null,
              mailgun_region: region,
            };

      const result = await adminSaveMailgunSettings(payload);
      setApiKey("");
      setMailPassword("");
      await refetch();
      if (result.warning) {
        toast.warning(result.warning);
      }
      toast.success("Email settings saved");
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
      title="Email (SMTP / Mailgun)"
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
          <Label className={adminSettingsLabelClass}>Mail driver</Label>
          <Segmented<Driver>
            value={driver}
            onChange={setDriver}
            options={[
              { value: "smtp", label: "SMTP" },
              { value: "api", label: "Mailgun API" },
            ]}
          />
          <p className="mt-1.5 text-xs text-[#64748b]">
            Choose <strong>SMTP</strong> for Mailgun SMTP credentials (host{" "}
            <code className="text-[11px]">smtp.eu.mailgun.org</code> goes in Mail Host, not Sending
            domain). Use <strong>Mailgun API</strong> only with an HTTP API key and verified sending
            domain.
          </p>
        </div>

        {driver === "smtp" ? (
          <>
            <div>
              <Label className={adminSettingsLabelClass}>Mail Host</Label>
              <Input
                value={mailHost}
                onChange={(e) => setMailHost(e.target.value)}
                placeholder="smtp.eu.mailgun.org"
                className={adminSettingsFieldClass}
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={adminSettingsLabelClass}>Mail Port</Label>
                <Input
                  value={mailPort}
                  onChange={(e) => setMailPort(e.target.value)}
                  placeholder="587"
                  inputMode="numeric"
                  className={adminSettingsFieldClass}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label className={adminSettingsLabelClass}>Mail Encryption</Label>
                <Segmented<Encryption>
                  value={mailEncryption}
                  onChange={setMailEncryption}
                  options={[
                    { value: "tls", label: "TLS" },
                    { value: "ssl", label: "SSL" },
                    { value: "none", label: "None" },
                  ]}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-[#64748b]">
              Port <code className="text-[11px]">587</code> + TLS = STARTTLS; port{" "}
              <code className="text-[11px]">465</code> + SSL = implicit TLS.
            </p>

            <div>
              <Label className={adminSettingsLabelClass}>Mail Username</Label>
              <Input
                value={mailUsername}
                onChange={(e) => setMailUsername(e.target.value)}
                placeholder="admin@noreply.yourdomain.com"
                className={adminSettingsFieldClass}
                autoComplete="off"
              />
            </div>

            <div>
              <Label className={adminSettingsLabelClass}>Mail Password</Label>
              <SecretInput
                value={mailPassword}
                onChange={setMailPassword}
                placeholder={
                  passwordLooksTruncated
                    ? "Re-enter full Mailgun SMTP password (required)"
                    : passwordStored
                      ? "•••• stored in database ••••"
                      : "SMTP password"
                }
                className={adminSettingsFieldClass}
              />
              {passwordLooksTruncated ? (
                <p className="mt-1.5 text-xs font-medium text-amber-800">
                  Stored password is only {storedPasswordLength} characters — likely truncated or
                  wrong. Paste the full SMTP password from Mailgun (typically 50+ characters) and
                  save. Leaving this blank keeps the broken password and sends will fail with 535.
                </p>
              ) : passwordStored ? (
                <p className="mt-1.5 text-xs text-[#64748b]">
                  Stored ({storedPasswordLength} characters). Leave blank to keep the current
                  password.
                </p>
              ) : null}
            </div>

            <div>
              <Label className={adminSettingsLabelClass}>Mail Sender Email</Label>
              <Input
                type="email"
                value={mailFromEmail}
                onChange={(e) => setMailFromEmail(e.target.value)}
                placeholder="no-reply@yourdomain.com"
                className={adminSettingsFieldClass}
                autoComplete="off"
              />
            </div>

            <div>
              <Label className={adminSettingsLabelClass}>Mail Sender Name</Label>
              <Input
                value={mailFromName}
                onChange={(e) => setMailFromName(e.target.value)}
                placeholder="Summer Splash 2026"
                className={adminSettingsFieldClass}
                autoComplete="off"
              />
            </div>
          </>
        ) : (
          <>
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
                  API key loaded from server environment (
                  <code className="text-[11px]">MAILGUN_API_KEY</code>). Leave blank to keep using
                  env.
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
              <Label className={adminSettingsLabelClass}>Region</Label>
              <Segmented<"us" | "eu">
                value={region}
                onChange={setRegion}
                options={[
                  { value: "us", label: "US (api.mailgun.net)" },
                  { value: "eu", label: "EU (api.eu.mailgun.net)" },
                ]}
              />
              <p className="mt-1.5 text-xs text-[#64748b]">
                Must match your domain&apos;s region in Mailgun. An EU domain sent to the US endpoint
                returns <code className="text-[11px]">HTTP 401 Forbidden</code> (and vice-versa).
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
          </>
        )}

        <div className="flex items-center justify-between rounded-2xl border border-[#e8e4dc] bg-[#FAF8F4] p-4">
          <div>
            <div className="font-medium text-[#0a4a52]">Send digital pass emails</div>
            <div className="text-xs text-[#5a7a80]">
              When on, guests who enter an email at registration receive their pass link automatically.
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="flex flex-wrap gap-3">
          <AdminSettingsActionBtn
            label="Save email settings"
            loading={saving}
            onClick={() => void save()}
            primary
          />
          {driver === "smtp" && (
            <AdminSettingsActionBtn
              label="Test SMTP connection"
              loading={testingSmtp}
              onClick={() => void testSmtp()}
            />
          )}
        </div>
      </div>
    </AdminSettingsSection>
  );
}
