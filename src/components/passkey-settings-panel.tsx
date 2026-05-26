"use client";

import { useCallback, useEffect, useState } from "react";

import { ExternalLink, Fingerprint, Plus, Trash2 } from "lucide-react";

import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";

import {
  PASSKEY_SETUP_USER_MESSAGE,
  formatPasskeyError,
  getPasskeysDashboardUrl,
  getPasskeysStatusSync,
  isPasskeySupported,
  registerPasskey,
} from "@/lib/passkey-auth";

import { toast } from "sonner";

type PasskeyRow = {
  id: string;

  friendly_name?: string;

  created_at: string;

  last_used_at?: string;
};

export function PasskeySettingsPanel({
  embeddedInSettings = false,
}: {
  embeddedInSettings?: boolean;
}) {
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [registering, setRegistering] = useState(false);

  const [projectPasskeysEnabled, setProjectPasskeysEnabled] = useState<boolean>(() =>
    getPasskeysStatusSync(),
  );

  const supported = isPasskeySupported();

  const dashboardUrl = getPasskeysDashboardUrl();

  const refresh = useCallback(async () => {
    setLoading(true);

    const enabled = getPasskeysStatusSync();
    setProjectPasskeysEnabled(enabled);

    if (!enabled) {
      setPasskeys([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.passkey.list();

    if (error) toast.error(formatPasskeyError(error));
    else setPasskeys((data ?? []) as PasskeyRow[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onRegister = async () => {
    setRegistering(true);

    const result = await registerPasskey();

    setRegistering(false);

    if (!result.ok) {
      toast.error(result.message, {
        duration: 10_000,

        action: {
          label: "Supabase Passkeys",

          onClick: () => window.open(dashboardUrl, "_blank", "noopener"),
        },
      });

      if (result.message === PASSKEY_SETUP_USER_MESSAGE) {
        setProjectPasskeysEnabled(false);
      }

      return;
    }

    toast.success("Passkey added");

    setProjectPasskeysEnabled(true);

    await refresh();
  };

  const onDelete = async (passkeyId: string) => {
    const { error } = await supabase.auth.passkey.delete({ passkeyId });

    if (error) {
      toast.error(formatPasskeyError(error));

      return;
    }

    toast.success("Passkey removed");

    await refresh();
  };

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        This browser does not support passkeys. Use Chrome, Safari, Edge, or Firefox on a device
        with biometrics or a security key.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {projectPasskeysEnabled === false && !embeddedInSettings && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            Passkeys are not enabled for this Supabase project
          </p>
          <p className="mt-1 text-muted-foreground">
            Staff login will not offer passkey sign-in or enrollment until you enable them in the
            dashboard.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Open your project → Authentication → Passkeys (Beta).</li>
            <li>Turn passkeys on.</li>
            <li>
              Set Site URL to this app&apos;s origin (e.g.{" "}
              <code className="text-xs">http://localhost:3000</code> for local dev).
            </li>
          </ol>
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-aqua hover:underline"
          >
            Open Passkeys in Supabase
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {projectPasskeysEnabled === true && (
        <p className="text-sm text-muted-foreground">
          Passkeys are enabled for this project. Staff can sign in from portal login pages and add
          keys here.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading passkeys…</p>
      ) : passkeys.length === 0 ? (
        <p className="rounded-xl bg-foreground/5 px-3 py-2 text-sm text-muted-foreground">
          {projectPasskeysEnabled === false
            ? "Enable passkeys in Supabase to add keys."
            : "No passkeys on this account yet."}
        </p>
      ) : (
        <ul className="space-y-2">
          {passkeys.map((pk) => (
            <li
              key={pk.id}
              className="flex items-center justify-between gap-3 rounded-2xl glass px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-aqua/15 text-aqua">
                  <Fingerprint className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{pk.friendly_name ?? "Passkey"}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {format(new Date(pk.created_at), "MMM d, yyyy")}
                    {pk.last_used_at
                      ? ` · Last used ${format(new Date(pk.last_used_at), "MMM d, yyyy")}`
                      : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDelete(pk.id)}
                className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove passkey"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={registering || projectPasskeysEnabled === false}
        onClick={onRegister}
        className={
          embeddedInSettings
            ? "inline-flex items-center gap-2 rounded-[14px] border-2 border-[#0d9488] bg-white px-5 py-2.5 text-sm font-semibold text-[#0f766e] transition hover:bg-[#f0fdfa] disabled:opacity-50"
            : "inline-flex items-center gap-2 rounded-xl bg-foreground/10 px-4 py-2.5 text-sm font-semibold hover:bg-foreground/15 disabled:opacity-50"
        }
      >
        <Plus className="h-4 w-4" />
        {registering ? "Waiting for device…" : "Add passkey"}
      </button>
    </div>
  );
}
