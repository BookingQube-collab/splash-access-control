"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { formatSlotDisplayLabel, formatSlotTimeRange } from "@/lib/slot-time";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { getPass } from "@/lib/summersplash.functions";
import { passInactiveReason } from "@/lib/pass-active";
import { myPassesUrl, passUrl } from "@/lib/public-url";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, LogIn, LogOut, Sun, Users, Hash } from "lucide-react";
import { SummerSplashLogo } from "@/components/brand/summer-splash-logo";
import { BeachBg } from "@/components/beach-bg";

export default function PassPage() {
  const params = useParams<{ token?: string | string[] }>();
  const raw = params.token;
  const token = typeof raw === "string" ? raw : raw?.[0] ?? "";

  const qc = useQueryClient();
  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["pass", token],
    queryFn: () => getPass({ token }),
    enabled: !!token,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  // Live: subscribe to registration + scan_events for instant status updates.
  useEffect(() => {
    if (!data?.id) return;
    const ch = supabase
      .channel(`pass-${data.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "registrations", filter: `id=eq.${data.id}` },
        () => qc.invalidateQueries({ queryKey: ["pass", token] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scan_events", filter: `registration_id=eq.${data.id}` },
        () => qc.invalidateQueries({ queryKey: ["pass", token] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [data?.id, token, qc]);

  if (!token)
    return (
      <div className="relative grid min-h-screen place-items-center px-4">
        <BeachBg variant="sunset" />
        <div className="rounded-3xl glass-strong p-10 text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <p className="mt-4 font-semibold">Invalid pass link</p>
          <Link href="/" className="mt-4 inline-block text-sm text-primary underline">Go home</Link>
        </div>
      </div>
    );

  if (isLoading)
    return (
      <div className="relative grid min-h-screen place-items-center">
        <BeachBg variant="sunset" />
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  if (!data)
    return (
      <div className="relative grid min-h-screen place-items-center px-4">
        <BeachBg variant="sunset" />
        <div className="rounded-3xl glass-strong p-10 text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <p className="mt-4 font-semibold">Pass not found</p>
          <Link href="/" className="mt-4 inline-block text-sm text-primary underline">Go home</Link>
        </div>
      </div>
    );

  const statusConfig: Record<string, { dot: string; text: string; label: string; icon: React.ReactNode }> = {
    Active:  { dot: "bg-aqua",   text: "text-aqua",     label: "Active",      icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    Inside:  { dot: "bg-success", text: "text-success", label: "Checked in",  icon: <LogIn className="h-3.5 w-3.5" /> },
    Exited:  { dot: "bg-muted-foreground", text: "text-muted-foreground", label: "Exited", icon: <LogOut className="h-3.5 w-3.5" /> },
    Expired: { dot: "bg-destructive", text: "text-destructive", label: "Expired", icon: <XCircle className="h-3.5 w-3.5" /> },
  };
  const active = data.isActive ?? (data.liveStatus === "Active" || data.liveStatus === "Inside");
  const inactiveMessage = (!active ? passInactiveReason(data) : null) ?? "This pass is no longer valid";
  const cfg =
    !active && data.liveStatus !== "Inside"
      ? statusConfig.Expired
      : statusConfig[data.liveStatus] ?? statusConfig.Active;

  return (
    <div className="relative min-h-screen px-4 py-8">
      <BeachBg variant="sunset" />

      <div className="relative z-10 mx-auto mb-6 flex max-w-md justify-center">
        <SummerSplashLogo href="/" size="sm" />
      </div>

      <div className="relative z-10 mx-auto max-w-md">
        <AnimatePresence>
          <motion.div
            key="pass"
            initial={{ opacity: 0, y: 30, rotateX: -10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative"
          >
            {/* Glow halo */}
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-pass opacity-60 blur-3xl" />

            {/* Card */}
            <div className="relative overflow-hidden rounded-[2rem] glass-strong shadow-soft">
              {/* Holographic header strip */}
              <div className="relative h-44 bg-pass">
                <div className="absolute inset-0 holo opacity-30 mix-blend-overlay" />
                <div className="relative flex h-full flex-col justify-between p-6 text-primary-foreground">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.3em] opacity-90">
                      {data.event_name}
                    </div>
                    <Sun className="h-6 w-6 opacity-90" />
                  </div>
                  <div>
                    <div className="text-[11px] opacity-80">Guest</div>
                    <h1 className="font-display text-3xl font-extrabold leading-tight">{data.customer_name}</h1>
                    <div className="mt-1 text-xs opacity-90">
                      {format(new Date(data.event_date), "EEE · MMM d, yyyy")} ·{" "}
                      {formatSlotDisplayLabel(data.slot_name, data.slot_starts_at, data.slot_ends_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Perforation */}
              <div className="relative h-6 bg-card">
                <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
                <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 border-t border-dashed border-foreground/20" />
              </div>

              {/* Body */}
              <div className="bg-card p-6 pt-2">
                <div className="mb-5 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs font-semibold ${cfg.text}`}>
                    <span className="relative flex h-2 w-2">
                      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.dot} opacity-60`} />
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot}`} />
                    </span>
                    {cfg.icon}{cfg.label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${isFetching ? "bg-aqua animate-pulse" : "bg-aqua/60"}`} />
                    Live · {dataUpdatedAt ? format(new Date(dataUpdatedAt), "p") : "syncing"}
                  </span>
                </div>

                {/* QR with glow */}
                <div className="relative mx-auto w-fit">
                  {active ? (
                    <div className="absolute -inset-3 -z-10 rounded-2xl bg-aqua/40 blur-2xl" />
                  ) : null}
                  <motion.div
                    animate={active ? { y: [0, -3, 0] } : undefined}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className={cn(
                      "relative rounded-2xl bg-white p-5",
                      active ? "shadow-glow-aqua" : "opacity-30 shadow-none",
                    )}
                  >
                    <QRCodeSVG value={passUrl(data.qr_token)} size={220} level="H" />
                    {!active ? (
                      <motion.div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
                        <span className="rounded-full bg-destructive px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-destructive-foreground">
                          Expired
                        </span>
                      </motion.div>
                    ) : null}
                  </motion.div>
                </div>

                <dl className="mt-7 grid grid-cols-2 gap-4 text-sm">
                  <Detail icon={<Hash className="h-3.5 w-3.5" />} label="Pass ID" value={data.id.slice(0, 8).toUpperCase()} mono />
                  <Detail icon={<Users className="h-3.5 w-3.5" />} label="Guests" value={String(data.guest_count)} />
                  <Detail
                    label="Slot time"
                    value={formatSlotTimeRange(data.slot_starts_at, data.slot_ends_at)}
                  />
                </dl>

                <p
                  className={cn(
                    "mt-6 text-center text-[11px] uppercase tracking-[0.2em]",
                    active ? "text-muted-foreground" : "font-semibold normal-case text-destructive",
                  )}
                >
                  {active ? "Show this QR at the entry" : inactiveMessage}
                </p>
                <Link
                  href={myPassesUrl(data.qr_token)}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-teal/30 bg-brand-teal/10 py-2.5 text-xs font-bold text-brand-teal hover:bg-brand-teal/15"
                >
                  All my passes
                </Link>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Detail({ icon, label, value, mono }: { icon?: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-foreground/5 p-3">
      <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </dt>
      <dd className={`mt-0.5 font-semibold ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
