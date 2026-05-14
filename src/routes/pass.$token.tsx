import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { getPass } from "@/lib/summersplash.functions";
import { supabase } from "@/integrations/supabase/client";
import { Waves, CheckCircle2, XCircle, LogIn, LogOut, Sun, Users, Hash } from "lucide-react";
import { BeachBg } from "@/components/beach-bg";

export const Route = createFileRoute("/pass/$token")({
  head: () => ({ meta: [{ title: "Your SummerSplash pass" }] }),
  component: PassPage,
});

function PassPage() {
  const { token } = Route.useParams();
  const fetchPass = useServerFn(getPass);
  const qc = useQueryClient();
  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["pass", token],
    queryFn: () => fetchPass({ data: { token } }),
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
          <Link to="/" className="mt-4 inline-block text-sm text-primary underline">Go home</Link>
        </div>
      </div>
    );

  const statusConfig: Record<string, { dot: string; text: string; label: string; icon: React.ReactNode }> = {
    Active:  { dot: "bg-aqua",   text: "text-aqua",     label: "Active",      icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    Inside:  { dot: "bg-success", text: "text-success", label: "Checked in",  icon: <LogIn className="h-3.5 w-3.5" /> },
    Exited:  { dot: "bg-muted-foreground", text: "text-muted-foreground", label: "Exited", icon: <LogOut className="h-3.5 w-3.5" /> },
    Expired: { dot: "bg-destructive", text: "text-destructive", label: "Expired", icon: <XCircle className="h-3.5 w-3.5" /> },
  };
  const cfg = statusConfig[data.liveStatus] ?? statusConfig.Active;

  return (
    <div className="relative min-h-screen px-4 py-8">
      <BeachBg variant="sunset" />

      <Link to="/" className="relative z-10 mx-auto mb-6 flex max-w-md items-center justify-center gap-2">
        <Waves className="h-5 w-5 text-primary" />
        <span className="font-display text-base font-bold">SummerSplash</span>
      </Link>

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
                      {format(new Date(data.event_date), "EEE · MMM d, yyyy")} · {data.slot_name}
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
                  <div className="absolute -inset-3 -z-10 rounded-2xl bg-aqua/40 blur-2xl" />
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="rounded-2xl bg-white p-5 shadow-glow-aqua"
                  >
                    <QRCodeSVG value={data.qr_token} size={220} level="H" />
                  </motion.div>
                </div>

                <dl className="mt-7 grid grid-cols-2 gap-4 text-sm">
                  <Detail icon={<Hash className="h-3.5 w-3.5" />} label="Pass ID" value={data.id.slice(0, 8).toUpperCase()} mono />
                  <Detail icon={<Users className="h-3.5 w-3.5" />} label="Guests" value={String(data.guest_count)} />
                  <Detail label="Starts" value={format(new Date(data.slot_starts_at), "p")} />
                  <Detail label="Ends"   value={format(new Date(data.slot_ends_at), "p")} />
                </dl>

                <p className="mt-6 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Show this QR at the entry
                </p>
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
