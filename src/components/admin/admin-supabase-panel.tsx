"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SecretInput } from "@/components/secret-input";
import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminSettingsActionBtn } from "@/components/admin/admin-settings-action-btn";
import { adminSaveSupabaseEnv } from "@/lib/admin.functions";
import { useSupabaseEnvQuery } from "@/hooks/use-supabase-env-query";
import { formatActionError } from "@/lib/utils";

export type AdminSupabasePanelHandle = {
  save: (options?: { silent?: boolean }) => Promise<{ ok: boolean; restartRequired: boolean }>;
};

type AdminSupabasePanelProps = {
  onRestartRequired?: (required: boolean) => void;
  /** When true, render form only (no AdminPanel wrapper). */
  embedded?: boolean;
};

export const AdminSupabasePanel = forwardRef<AdminSupabasePanelHandle, AdminSupabasePanelProps>(
  function AdminSupabasePanel({ onRestartRequired, embedded }, ref) {
    const { data: supabaseEnv, isLoading, isError, error, refetch } = useSupabaseEnvQuery();
    const loadError = isError ? formatActionError(error) : null;

    const [supabaseUrl, setSupabaseUrl] = useState("");
    const [publishableKey, setPublishableKey] = useState("");
    const [serviceRoleKey, setServiceRoleKey] = useState("");
    const [saving, setSaving] = useState(false);
    const [restartHint, setRestartHint] = useState(false);

    useEffect(() => {
      if (!supabaseEnv) return;
      setSupabaseUrl(supabaseEnv.supabaseUrl);
      setPublishableKey(supabaseEnv.publishableKey);
    }, [supabaseEnv]);

    const save = useCallback(async (options?: { silent?: boolean }): Promise<{ ok: boolean; restartRequired: boolean }> => {
      const url = supabaseUrl.trim();
      const pub = publishableKey.trim();
      if (!url) {
        toast.error("Supabase project URL is required");
        return { ok: false, restartRequired: false };
      }
      if (!pub) {
        toast.error("Publishable (anon) key is required");
        return { ok: false, restartRequired: false };
      }
      if (!serviceRoleKey.trim() && !supabaseEnv?.serviceRoleConfigured) {
        toast.error("Service role key is required");
        return { ok: false, restartRequired: false };
      }

      setSaving(true);
      try {
        const envResult = await adminSaveSupabaseEnv({
          supabaseUrl: url,
          publishableKey: pub,
          serviceRoleKey: serviceRoleKey.trim() || undefined,
        });
        setRestartHint(envResult.restartRequired);
        onRestartRequired?.(envResult.restartRequired);
        setServiceRoleKey("");
        await refetch();
        if (!options?.silent) toast.success("Supabase settings saved");
        return { ok: true, restartRequired: envResult.restartRequired };
      } catch (e: unknown) {
        toast.error(formatActionError(e));
        return { ok: false, restartRequired: false };
      } finally {
        setSaving(false);
      }
    }, [
      supabaseUrl,
      publishableKey,
      serviceRoleKey,
      supabaseEnv?.serviceRoleConfigured,
      onRestartRequired,
      refetch,
    ]);

    useImperativeHandle(ref, () => ({ save }), [save]);

    const body = (
        <div className={embedded ? "space-y-5" : "max-w-xl space-y-5"}>
          <p className="text-sm text-[#5a7a80]">
            Project URL and keys from{" "}
            <span className="text-[#0a4a52]">Supabase → Project Settings → API</span>. Values are
            written to <code className="text-xs">.env.local</code> (gitignored).
          </p>
          {isLoading && (
            <p className="text-sm text-[#5a7a80]">Loading Supabase configuration…</p>
          )}
          {loadError && (
            <p className="rounded-xl border border-[#c93a3f]/30 bg-[#fdecec] px-3 py-2 text-sm text-[#c93a3f]">
              {loadError}
              {/unauthorized|forbidden/i.test(loadError) ? (
                <span className="mt-1 block text-xs">
                  Sign in at Admin login with an account that has the admin role.
                </span>
              ) : null}
            </p>
          )}
          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-[#5a7a80]">
              Project URL
            </Label>
            <Input
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="h-11 border-[#e8e4dc] bg-white text-[#0a4a52] placeholder:text-[#5a7a80]"
            />
            <p className="mt-1 text-xs text-[#5a7a80]">
              Sets <code className="text-[10px]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="text-[10px]">SUPABASE_URL</code>.
            </p>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-[#5a7a80]">
              Publishable (anon) key
            </Label>
            <SecretInput
              value={publishableKey}
              onChange={setPublishableKey}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="border-[#e8e4dc] bg-white text-[#0a4a52] placeholder:text-[#5a7a80]"
            />
            <p className="mt-1 text-xs text-[#5a7a80]">
              Sets <code className="text-[10px]">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> and{" "}
              <code className="text-[10px]">SUPABASE_PUBLISHABLE_KEY</code>.
            </p>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-[#5a7a80]">
              Service role key (secret)
            </Label>
            <SecretInput
              value={serviceRoleKey}
              onChange={setServiceRoleKey}
              placeholder={
                supabaseEnv?.serviceRoleConfigured
                  ? `Leave blank to keep ${supabaseEnv.serviceRoleHint ?? "stored key"}`
                  : "Required for creating and editing users"
              }
              className="border-[#e8e4dc] bg-white text-[#0a4a52] placeholder:text-[#5a7a80]"
            />
            {supabaseEnv?.serviceRoleConfigured && supabaseEnv.serviceRoleHint && (
              <p className="mt-1 text-xs text-[#0a7a84]">
                Configured ({supabaseEnv.serviceRoleHint}) — enter a new key only to replace it.
              </p>
            )}
            <p className="mt-1 text-xs text-[#5a7a80]">
              Server-only. Never use a <code className="text-[10px]">NEXT_PUBLIC_</code> prefix.
            </p>
          </div>
          {(supabaseEnv?.hasEnvLocal || supabaseEnv?.hasEnvFile) && (
            <p className="rounded-xl bg-[#FAF8F4] px-3 py-2 text-xs text-[#5a7a80]">
              Loaded from {supabaseEnv.hasEnvLocal ? ".env.local" : ".env"}
              {supabaseEnv.hasEnvLocal && supabaseEnv.hasEnvFile ? " (local overrides .env)" : ""}.
            </p>
          )}
          {restartHint && (
            <p className="rounded-xl border border-[#0a7a84]/30 bg-[#0a7a84]/10 px-3 py-2 text-xs text-[#0a4a52]">
              Restart the dev server (<code className="text-[10px]">npm run dev</code>) so Supabase
              env changes take effect.
            </p>
          )}
          <AdminSettingsActionBtn
            label="Save Supabase settings"
            loading={saving}
            onClick={() => void save()}
            primary
          />
        </div>
    );

    if (embedded) return body;

    return <AdminPanel title="Supabase">{body}</AdminPanel>;
  },
);
