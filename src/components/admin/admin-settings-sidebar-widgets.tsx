"use client";

import {
  Activity,
  BookOpen,
  FileText,
  HelpCircle,
  Link2,
  Shield,
  Webhook,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ADMIN_CARD, ADMIN_TEAL } from "@/components/admin/admin-theme";
import { cn } from "@/lib/utils";
import { adminGetSettingsSidebarStatus } from "@/lib/admin.functions";
import { AUTH_SESSION_CHECK_FAILED } from "@/lib/auth-errors";
import { useSupabaseEnvQuery } from "@/hooks/use-supabase-env-query";
import { getPasskeysDashboardUrl, getPasskeysStatusSync } from "@/lib/passkey-auth";
import { useEffect, useState } from "react";

export type AdminSettingsSidebarActions = {
  onTestAll: () => void;
  onViewSyncLogs: () => void;
  onTestBookingQube?: () => void;
};

function ServiceRow({
  name,
  status,
  ok,
}: {
  name: string;
  status: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className="text-sm font-medium text-[#334155]">{name}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
          ok ? "bg-emerald-50 text-emerald-700" : "bg-[#f1f5f9] text-[#64748b]",
        )}
      >
        {status}
      </span>
    </div>
  );
}

export function AdminSettingsSidebarWidgets({
  actions,
  testingAll,
}: {
  actions: AdminSettingsSidebarActions;
  testingAll?: boolean;
}) {
  const { data: supabaseEnv } = useSupabaseEnvQuery();
  const { data: sidebarStatus } = useQuery({
    queryKey: ["a-settings-sidebar-status"],
    queryFn: () => adminGetSettingsSidebarStatus(),
    staleTime: 30_000,
    retry: (failureCount, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg === AUTH_SESSION_CHECK_FAILED) return failureCount < 1;
      return false;
    },
  });
  const [passkeysOn, setPasskeysOn] = useState<boolean>(() => getPasskeysStatusSync());

  useEffect(() => {
    setPasskeysOn(getPasskeysStatusSync());
  }, []);

  const bqOk = sidebarStatus?.bqOk ?? false;
  const supabaseOk = Boolean(
    supabaseEnv?.supabaseUrl?.trim() && supabaseEnv?.publishableKey?.trim(),
  );
  const scannerOk = sidebarStatus?.scannerOk ?? false;
  const mailgunOk = sidebarStatus?.mailgunOk ?? false;
  const passkeysOk = passkeysOn === true;
  const allOperational = bqOk && supabaseOk && scannerOk;

  const docsUrl = getPasskeysDashboardUrl().replace(/\/auth\/passkeys.*$/, "/docs");

  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <div className={cn(ADMIN_CARD, "p-5")}>
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#0f766e]" />
          <h3 className="font-display text-base font-bold text-[#134e4a]">Integration status</h3>
        </div>
        <div
          className={cn(
            "mb-4 rounded-[14px] px-3 py-2 text-sm font-semibold",
            allOperational
              ? "bg-emerald-50 text-emerald-800"
              : "bg-[#f0fdfa] text-[#0f766e]",
          )}
        >
          {allOperational ? "All systems operational" : "Review configuration below"}
        </div>
        <div className="divide-y divide-[#e2e8f0]">
          <ServiceRow name="BookingQube" status={bqOk ? "Connected" : "Setup"} ok={bqOk} />
          <ServiceRow name="Supabase" status={supabaseOk ? "Connected" : "Setup"} ok={supabaseOk} />
          <ServiceRow
            name="Passkeys"
            status={passkeysOk ? "Enabled" : "Not enabled"}
            ok={passkeysOk}
          />
          <ServiceRow
            name="Scanner"
            status={scannerOk ? "Enabled" : "Disabled"}
            ok={scannerOk}
          />
          <ServiceRow
            name="Mailgun"
            status={
              mailgunOk ? "Enabled" : sidebarStatus?.mailgunEnabled ? "Setup" : "Disabled"
            }
            ok={mailgunOk}
          />
        </div>
      </div>

      <div className={cn(ADMIN_CARD, "p-5")}>
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#0f766e]" />
          <h3 className="font-display text-base font-bold text-[#134e4a]">Quick shortcuts</h3>
        </div>
        <ul className="space-y-1">
          <ShortcutBtn
            icon={Link2}
            label="Test all connections"
            onClick={actions.onTestAll}
            loading={testingAll}
          />
          <ShortcutBtn
            icon={FileText}
            label="View sync logs"
            onClick={actions.onViewSyncLogs}
          />
          <ShortcutBtn
            icon={Webhook}
            label="Webhooks"
            href="#settings-bookingqube"
          />
          <ShortcutBtn
            icon={BookOpen}
            label="API docs"
            href="https://supabase.com/docs"
            external
          />
        </ul>
      </div>

      <div className={cn(ADMIN_CARD, "p-5")}>
        <div className="flex items-start gap-3">
          <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#0f766e]" />
          <div>
            <h3 className="font-display text-base font-bold text-[#134e4a]">Need help?</h3>
            <p className="mt-1 text-sm text-[#64748b]">
              Integration guides, env variables, and troubleshooting for SummerSplash admin.
            </p>
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              style={{ color: ADMIN_TEAL }}
            >
              View documentation
              <Shield className="h-3.5 w-3.5 opacity-60" />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ShortcutBtn({
  icon: Icon,
  label,
  onClick,
  href,
  external,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  loading?: boolean;
}) {
  const className =
    "flex w-full items-center gap-2.5 rounded-[12px] px-2 py-2.5 text-left text-sm font-medium text-[#334155] transition hover:bg-[#f8fafc] disabled:opacity-60";

  if (href) {
    return (
      <li>
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className={className}
        >
          <Icon className="h-4 w-4 text-[#0d9488]" />
          {label}
        </a>
      </li>
    );
  }

  return (
    <li>
      <button type="button" disabled={loading} onClick={onClick} className={className}>
        <Icon className="h-4 w-4 text-[#0d9488]" />
        {loading ? "Testing…" : label}
      </button>
    </li>
  );
}
