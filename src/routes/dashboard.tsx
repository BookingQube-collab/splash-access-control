import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { getDashboardCounts } from "@/lib/summersplash.functions";
import { format } from "date-fns";
import { Activity, Users, LogIn, LogOut, AlertTriangle, Clock, TrendingUp, Ticket } from "lucide-react";
import { BeachBg } from "@/components/beach-bg";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <RoleGuard role="dashboard" loginPath="/login/dashboard">
      <DashboardPage />
    </RoleGuard>
  ),
});

function DashboardPage() {
  const fn = useServerFn(getDashboardCounts);
  const { data } = useQuery({ queryKey: ["dash"], queryFn: () => fn(), refetchInterval: 5000 });

  const slots = data?.slots ?? [];
  const totals = slots.reduce(
    (a, s) => ({
      capacity: a.capacity + s.capacity,
      inside: a.inside + s.entered,
      active: a.active + s.active,
      invalid: a.invalid + s.invalid,
      booked: a.booked + (s.booked ?? 0),
    }),
    { capacity: 0, inside: 0, active: 0, invalid: 0, booked: 0 }
  );

  const chartData = slots.map((s: any) => ({
    name: s.name.length > 14 ? s.name.slice(0, 12) + "…" : s.name,
    Booked: s.booked ?? 0,
    Inside: s.entered,
    Capacity: s.capacity,
  }));

  return (
    <div className="relative min-h-screen px-6 py-8">
      <BeachBg variant="aurora" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-aqua">Operations</p>
            <h1 className="font-display text-3xl font-extrabold md:text-4xl">Live Occupancy</h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-success opacity-70" />
              <span className="relative h-2 w-2 rounded-full bg-success" />
            </span>
            Live · refresh 5s
          </span>
        </header>

        {/* KPI strip */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi icon={<Users className="h-5 w-5" />} label="Total capacity" value={totals.capacity} hue="bg-primary/15 text-primary" />
          <Kpi icon={<Ticket className="h-5 w-5" />} label="Booked" value={totals.booked} hue="bg-sunset/15 text-sunset" />
          <Kpi icon={<LogIn className="h-5 w-5" />} label="Inside now" value={totals.inside} hue="bg-success/15 text-success" pulse />
          <Kpi icon={<Activity className="h-5 w-5" />} label="Active passes" value={totals.active} hue="bg-aqua/15 text-aqua" />
          <Kpi icon={<AlertTriangle className="h-5 w-5" />} label="Invalid scans" value={totals.invalid} hue="bg-destructive/15 text-destructive" />
        </div>

        {/* Bookings chart */}
        {slots.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl glass p-5"
          >
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold">Bookings per slot</h2>
              <span className="text-xs text-muted-foreground">Booked vs Inside vs Capacity</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="currentColor" strokeOpacity={0.5} />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" strokeOpacity={0.5} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card, 0 0% 10%))", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Capacity" fill="hsl(var(--muted-foreground))" fillOpacity={0.25} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Booked" fill="oklch(0.78 0.16 60)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Inside" fill="oklch(0.75 0.18 200)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Slot grid */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {slots.map((s, i) => {
            const occ = Math.min(100, Math.round((s.entered / Math.max(1, s.capacity)) * 100));
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl glass p-5 hover-glow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold">{s.name}</h3>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(s.starts_at), "p")} – {format(new Date(s.ends_at), "p")}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold text-gradient-ocean">
                      <Count value={s.entered} />
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">inside</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Occupancy</span>
                    <span className="font-semibold text-foreground">{occ}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${occ}%` }}
                      transition={{ duration: 0.8 }}
                      className={`h-full rounded-full ${occ > 85 ? "bg-coral" : "bg-gradient-to-r from-aqua to-primary"} shadow-glow-aqua`}
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
                  <Mini label="Active" value={s.active} />
                  <Mini label="Exited" value={s.exited} />
                  <Mini label="Auto-exit" value={s.auto_exited} />
                  <Mini label="Remaining" value={s.remaining} accent />
                  <Mini label="Capacity" value={s.capacity} />
                  <Mini label="Invalid" value={s.invalid} danger />
                </div>
              </motion.div>
            );
          })}
          {slots.length === 0 && (
            <div className="col-span-full rounded-2xl glass p-10 text-center text-muted-foreground">
              No active slots today. 🌊
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, hue, pulse }: { icon: React.ReactNode; label: string; value: number; hue: string; pulse?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl glass p-5">
      <div className="flex items-center justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${hue}`}>{icon}</span>
        {pulse && <TrendingUp className="h-4 w-4 text-success" />}
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight"><Count value={value} /></div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function Mini({ label, value, accent, danger }: { label: string; value: number; accent?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-lg px-2.5 py-2 ${accent ? "bg-primary/10" : danger ? "bg-destructive/10" : "bg-foreground/5"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-base font-bold ${accent ? "text-primary" : danger ? "text-destructive" : ""}`}><Count value={value} /></div>
    </div>
  );
}

function Count({ value }: { value: number }) {
  const [n, setN] = useState(value);
  useEffect(() => {
    const start = n; const diff = value - start; if (diff === 0) return;
    const dur = 500; const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.round(start + diff * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{n}</>;
}
