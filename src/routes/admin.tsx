import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoleGuard } from "@/components/role-guard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarDays, Clock4, ListChecks, BarChart3, Users2, Settings, LogOut,
  Activity, Plus, Trash2, ExternalLink, ShieldCheck, Waves, ScanLine,
} from "lucide-react";
import {
  adminListEvents, adminUpsertEvent, adminDeleteEvent,
  adminListSlots, adminUpsertSlot, adminDeleteSlot, adminGenerateSlots,
  adminListRegistrations,
  adminGetSettings, adminSaveSettings,
  adminListUsers, adminCreateUser, adminSetRole, adminDeleteUser,
  adminReports,
} from "@/lib/admin.functions";
import { getDashboardCounts } from "@/lib/summersplash.functions";
import { BeachBg } from "@/components/beach-bg";
import { AnimatedCount } from "@/components/animated-count";
import { SearchableSelect } from "@/components/searchable-select";

export const Route = createFileRoute("/admin")({
  component: () => (<RoleGuard role="admin" loginPath="/login/admin"><Admin /></RoleGuard>),
});

type TabKey = "overview" | "events" | "slots" | "registrations" | "reports" | "users" | "settings";

const NAV: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <Activity className="h-4 w-4" /> },
  { key: "events", label: "Events", icon: <CalendarDays className="h-4 w-4" /> },
  { key: "slots", label: "Slots", icon: <Clock4 className="h-4 w-4" /> },
  { key: "registrations", label: "Registrations", icon: <ListChecks className="h-4 w-4" /> },
  { key: "reports", label: "Reports", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "users", label: "Users & Roles", icon: <Users2 className="h-4 w-4" /> },
  { key: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

function Admin() {
  const [tab, setTab] = useState<TabKey>("overview");
  const signOut = async () => { await supabase.auth.signOut(); window.location.href = "/"; };

  return (
    <div className="relative min-h-screen">
      <BeachBg variant="ocean" />

      <div className="relative z-10 mx-auto flex max-w-[1400px] gap-6 px-4 py-6 lg:px-6">
        {/* Sidebar */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col rounded-3xl glass-strong p-4 lg:flex">
          <div className="mb-6 flex items-center gap-2 px-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-ocean shadow-glow-aqua">
              <Waves className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display text-base font-bold leading-tight">SummerSplash</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Admin</div>
            </div>
          </div>
          <nav className="flex-1 space-y-1">
            {NAV.map((n) => {
              const active = tab === n.key;
              return (
                <button key={n.key} onClick={() => setTab(n.key)}
                  className={`relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                    active ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  }`}>
                  {active && (
                    <motion.span layoutId="navdot" className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-aqua shadow-glow-aqua" />
                  )}
                  {n.icon}{n.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-foreground/10 pt-3">
            <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-foreground/5 hover:text-foreground">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          {/* Topbar */}
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl glass-strong px-5 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-aqua" />
              <span className="text-sm font-semibold">{NAV.find(n => n.key === tab)?.label}</span>
            </div>
            {/* Mobile tabs */}
            <div className="flex w-full gap-1 overflow-x-auto scrollbar-none lg:hidden">
              {NAV.map(n => (
                <button key={n.key} onClick={() => setTab(n.key)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs ${tab === n.key ? "bg-foreground/10" : "text-muted-foreground"}`}>
                  {n.label}
                </button>
              ))}
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <Link to="/dashboard" className="rounded-lg glass px-3 py-1.5 text-xs font-semibold hover-glow">Live dashboard</Link>
              <Link to="/scanner" className="inline-flex items-center gap-1.5 rounded-lg glass px-3 py-1.5 text-xs font-semibold hover-glow">
                <ScanLine className="h-3 w-3" /> Scanner
              </Link>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div key={tab}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {tab === "overview" && <DashTab />}
              {tab === "events" && <EventsTab />}
              {tab === "slots" && <SlotsTab />}
              {tab === "registrations" && <RegistrationsTab />}
              {tab === "reports" && <ReportsTab />}
              {tab === "users" && <UsersTab />}
              {tab === "settings" && <SettingsTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl glass-strong p-6 shadow-soft">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EventsTab() {
  const list = useServerFn(adminListEvents); const upsert = useServerFn(adminUpsertEvent); const del = useServerFn(adminDeleteEvent);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["a-events"], queryFn: () => list() });
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("SummerSplash");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const m = useMutation({
    mutationFn: () => upsert({ data: { name, start_date: start, end_date: end, is_active: true } }),
    onSuccess: () => { toast.success("Event saved"); qc.invalidateQueries({ queryKey: ["a-events"] }); }
  });
  return (
    <Panel title="Events">
      <div className="mb-5 grid gap-2 md:grid-cols-[1fr_160px_160px_auto]">
        <Input placeholder="Event name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 border-0 bg-foreground/5" />
        <div>
          <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Start</Label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-11 border-0 bg-foreground/5" />
        </div>
        <div>
          <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">End</Label>
          <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="h-11 border-0 bg-foreground/5" />
        </div>
        <button onClick={() => m.mutate()} className="inline-flex items-center justify-center gap-1.5 self-end rounded-xl bg-aqua px-5 h-11 text-sm font-semibold text-primary-foreground shadow-glow-aqua">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <div className="space-y-2">
        {(data?.events ?? []).map((e: any) => (
          <div key={e.id} className="flex items-center justify-between rounded-2xl glass p-4">
            <div>
              <div className="font-semibold">{e.name}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(e.start_date ?? e.event_date), "PP")} → {format(new Date(e.end_date ?? e.event_date), "PP")} ·
                <span className={`ml-1 inline-flex items-center gap-1 ${e.is_active ? "text-success" : "text-muted-foreground"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${e.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                  {e.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={async () => { await upsert({ data: { id: e.id, name: e.name, start_date: e.start_date ?? e.event_date, end_date: e.end_date ?? e.event_date, is_active: !e.is_active } }); qc.invalidateQueries({ queryKey: ["a-events"] }); }}
                className="rounded-lg glass px-3 py-1.5 text-xs font-semibold hover-glow">{e.is_active ? "Deactivate" : "Activate"}</button>
              <button onClick={async () => { if (confirm("Delete?")) { await del({ data: { id: e.id } }); qc.invalidateQueries({ queryKey: ["a-events"] }); } }}
                className="rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/25">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {(data?.events ?? []).length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
      </div>
    </Panel>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function SlotsTab() {
  const listE = useServerFn(adminListEvents); const list = useServerFn(adminListSlots);
  const upsert = useServerFn(adminUpsertSlot); const del = useServerFn(adminDeleteSlot);
  const generate = useServerFn(adminGenerateSlots);
  const qc = useQueryClient();
  const { data: events } = useQuery({ queryKey: ["a-events"], queryFn: () => listE() });
  const { data } = useQuery({ queryKey: ["a-slots"], queryFn: () => list() });

  const [eventId, setEventId] = useState("");
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("13:00");
  const [cap, setCap] = useState(50);
  const [recurrence, setRecurrence] = useState<"once" | "daily" | "weekly" | "monthly">("once");
  const [weekday, setWeekday] = useState(new Date().getDay());

  const selectedEvent = (events?.events ?? []).find((e: any) => e.id === eventId);

  const handleGenerate = async () => {
    if (!eventId || !name) return toast.error("Pick an event and slot name");
    if (endTime <= startTime) return toast.error("End time must be after start");
    try {
      const res = await generate({ data: {
        event_id: eventId, name, start_time: startTime, end_time: endTime, capacity: cap,
        recurrence, ...(recurrence === "weekly" ? { weekday } : {}),
      } });
      qc.invalidateQueries({ queryKey: ["a-slots"] });
      toast.success(`Generated ${res.count} slot${res.count > 1 ? "s" : ""}`);
      setName("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Panel title="Slots & Capacity">
      <div className="mb-6 rounded-2xl glass p-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Event</Label>
            <SearchableSelect
              value={eventId}
              onChange={setEventId}
              placeholder="Select an event…"
              searchPlaceholder="Search events…"
              options={(events?.events ?? []).map((e: any) => {
                const label = `${e.name} · ${format(new Date(e.start_date ?? e.event_date), "MMM d")} → ${format(new Date(e.end_date ?? e.event_date), "MMM d")}`;
                return { value: e.id, label, search: label };
              })}
            />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Slot name</Label>
            <Input placeholder="e.g. Morning Splash" value={name} onChange={(e) => setName(e.target.value)} className="h-11 border-0 bg-foreground/5" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Start time</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11 border-0 bg-foreground/5" />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">End time</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-11 border-0 bg-foreground/5" />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Capacity</Label>
            <Input type="number" min={1} value={cap} onChange={(e) => setCap(Number(e.target.value))} className="h-11 border-0 bg-foreground/5" />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Recurrence</Label>
            <SearchableSelect
              value={recurrence}
              onChange={(v) => setRecurrence(v as any)}
              searchable={false}
              options={[
                { value: "once", label: "Once (start date only)" },
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
              ]}
            />
          </div>
        </div>

        {recurrence === "weekly" && (
          <div>
            <Label className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">On weekday</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d, i) => (
                <button key={d} type="button" onClick={() => setWeekday(i)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${weekday === i ? "bg-aqua text-primary-foreground shadow-glow-aqua" : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/5 pt-4">
          <p className="text-xs text-muted-foreground">
            {selectedEvent ? (
              <>Will generate within <b className="text-foreground">{format(new Date(selectedEvent.start_date ?? selectedEvent.event_date), "MMM d")}</b> – <b className="text-foreground">{format(new Date(selectedEvent.end_date ?? selectedEvent.event_date), "MMM d")}</b></>
            ) : "Select an event to preview the date range."}
          </p>
          <button onClick={handleGenerate} className="inline-flex items-center gap-1.5 rounded-xl bg-sunset px-5 h-11 text-sm font-semibold text-foreground shadow-glow-sunset">
            <Plus className="h-4 w-4" /> Generate slots
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {(data?.slots ?? []).map((s: any) => (
          <div key={s.id} className="flex items-center justify-between rounded-2xl glass p-4">
            <div>
              <div className="font-semibold">{s.name} <span className="text-muted-foreground font-normal">— {s.events?.name}</span></div>
              <div className="text-xs text-muted-foreground">{format(new Date(s.starts_at), "PPp")} → {format(new Date(s.ends_at), "p")} · cap {s.capacity}</div>
            </div>
            <button onClick={async () => { if (confirm("Delete?")) { await del({ data: { id: s.id } }); qc.invalidateQueries({ queryKey: ["a-slots"] }); } }}
              className="rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/25">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {(data?.slots ?? []).length === 0 && <p className="text-sm text-muted-foreground">No slots yet.</p>}
      </div>
      {/* Suppress unused warning */}
      <span className="hidden">{typeof upsert}</span>
    </Panel>
  );
}

function RegistrationsTab() {
  const list = useServerFn(adminListRegistrations);
  const { data } = useQuery({ queryKey: ["a-regs"], queryFn: () => list() });
  return (
    <Panel title="Registrations">
      <div className="overflow-x-auto rounded-2xl glass">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              {["Name", "Mobile", "Slot", "Guests", "Status", "When", ""].map(h => (
                <th key={h} className="p-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.registrations ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-foreground/5">
                <td className="p-3 font-medium">{r.customer_name}</td>
                <td className="p-3">{r.mobile}</td>
                <td className="p-3">{r.slots?.name}</td>
                <td className="p-3">{r.guest_count}</td>
                <td className="p-3"><StatusPill status={r.status} /></td>
                <td className="p-3 text-xs text-muted-foreground">{format(new Date(r.created_at), "PPp")}</td>
                <td className="p-3">
                  <a href={`/pass/${r.qr_token}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    Pass <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
            {(data?.registrations ?? []).length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No registrations yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: "bg-aqua/15 text-aqua",
    Inside: "bg-success/15 text-success",
    Exited: "bg-foreground/10 text-muted-foreground",
    Expired: "bg-destructive/15 text-destructive",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[status] ?? "bg-foreground/10"}`}>{status}</span>;
}

function DashTab() {
  const fn = useServerFn(getDashboardCounts);
  const { data } = useQuery({ queryKey: ["a-dash"], queryFn: () => fn(), refetchInterval: 5000 });
  const slots = data?.slots ?? [];
  const totals = slots.reduce(
    (a, s) => ({
      cap: a.cap + s.capacity, inside: a.inside + s.entered, active: a.active + s.active, invalid: a.invalid + s.invalid,
    }), { cap: 0, inside: 0, active: 0, invalid: 0 });
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Capacity" value={totals.cap} hue="bg-primary/15 text-primary" />
        <Stat label="Inside now" value={totals.inside} hue="bg-success/15 text-success" pulse />
        <Stat label="Active passes" value={totals.active} hue="bg-aqua/15 text-aqua" />
        <Stat label="Invalid scans" value={totals.invalid} hue="bg-destructive/15 text-destructive" />
      </div>
      <Panel title="Live slot occupancy">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {slots.map((s: any) => {
            const occ = Math.min(100, Math.round((s.entered / Math.max(1, s.capacity)) * 100));
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-4 hover-glow">
                <div className="flex items-baseline justify-between">
                  <div className="font-display font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.remaining}/{s.capacity}</div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/10">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${occ}%` }} transition={{ duration: 0.6 }}
                    className={`h-full rounded-full ${occ > 85 ? "bg-coral" : "bg-gradient-to-r from-aqua to-primary"}`} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <span>Inside <b className="text-foreground"><AnimatedCount value={s.entered} /></b></span>
                  <span>Active <b className="text-foreground"><AnimatedCount value={s.active} /></b></span>
                  <span>Exited <b className="text-foreground"><AnimatedCount value={s.exited} /></b></span>
                </div>
              </motion.div>
            );
          })}
          {slots.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No active slots.</p>}
        </div>
      </Panel>
    </div>
  );
}

function Stat({ label, value, hue, pulse }: { label: string; value: number; hue: string; pulse?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-5 hover-glow">
      <div className="flex items-center justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${hue}`}><Activity className="h-4 w-4" /></span>
        {pulse && <span className="h-2 w-2 animate-pulse rounded-full bg-success" />}
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight"><AnimatedCount value={value} /></div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function ReportsTab() {
  const fn = useServerFn(adminReports);
  const { data } = useQuery({ queryKey: ["a-reports"], queryFn: () => fn() });
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <BigStat label="Total registrations" value={data.totalReg} />
        <BigStat label="Total guests" value={data.totalGuests} />
        <BigStat label="Scans (valid / invalid)" value={`${data.validScans} / ${data.invalidScans}`} danger={data.invalidScans > 0} />
      </div>
      <Panel title="By status">
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.byStatus).map(([k, v]) => (
            <span key={k} className="rounded-full glass px-4 py-1.5 text-sm">
              <span className="text-muted-foreground">{k}:</span> <b className="ml-1">{v as number}</b>
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function BigStat({ label, value, danger }: { label: string; value: number | string; danger?: boolean }) {
  return (
    <div className="rounded-2xl glass-strong p-6">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-4xl font-extrabold ${danger ? "text-destructive" : "text-gradient-ocean"}`}>{value}</div>
    </div>
  );
}

function UsersTab() {
  const list = useServerFn(adminListUsers); const create = useServerFn(adminCreateUser);
  const setRole = useServerFn(adminSetRole); const delU = useServerFn(adminDeleteUser);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["a-users"], queryFn: () => list() });
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [role, setRoleV] = useState<"admin" | "dashboard" | "pos" | "scanner">("scanner");
  const allRoles: ("admin" | "dashboard" | "pos" | "scanner")[] = ["admin", "dashboard", "pos", "scanner"];
  return (
    <Panel title="Users & Roles">
      <div className="mb-5 grid gap-2 md:grid-cols-4">
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 border-0 bg-foreground/5" />
        <Input placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="h-11 border-0 bg-foreground/5" />
        <SearchableSelect
          value={role}
          onChange={(v) => setRoleV(v as any)}
          searchable={false}
          options={allRoles.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
        />
        <button onClick={async () => { try { await create({ data: { email, password: pw, role } }); toast.success("Created"); setEmail(""); setPw(""); qc.invalidateQueries({ queryKey: ["a-users"] }); } catch (e: any) { toast.error(e.message); } }}
          className="rounded-xl bg-aqua text-sm font-semibold text-primary-foreground shadow-glow-aqua">Create user</button>
      </div>
      <div className="space-y-2">
        {(data?.users ?? []).map((u: any) => (
          <div key={u.id} className="rounded-2xl glass p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{u.email}</div>
              <button onClick={async () => { if (confirm("Delete user?")) { await delU({ data: { user_id: u.id } }); qc.invalidateQueries({ queryKey: ["a-users"] }); } }}
                className="rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/25">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {allRoles.map((r) => {
                const has = u.roles.includes(r);
                return (
                  <button key={r}
                    onClick={async () => { await setRole({ data: { user_id: u.id, role: r, enabled: !has } }); qc.invalidateQueries({ queryKey: ["a-users"] }); }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      has ? "bg-aqua/20 text-aqua ring-1 ring-aqua/40" : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
                    }`}>
                    {has && "✓ "}{r}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SettingsTab() {
  const get = useServerFn(adminGetSettings); const save = useServerFn(adminSaveSettings);
  const { data, refetch } = useQuery({ queryKey: ["a-settings"], queryFn: () => get() });
  const [key, setKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (data?.settings && !synced) {
      setKey(data.settings.scandit_api_key ?? "");
      setEnabled(!!data.settings.scandit_enabled);
      setSynced(true);
    }
  }, [data, synced]);
  return (
    <Panel title="Scanner Settings">
      <div className="max-w-xl space-y-5">
        <div>
          <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Scandit API Key</Label>
          <Input type="password" value={key} onChange={(e) => setKey(e.target.value)}
            placeholder={data?.settings?.scandit_api_key ? "•••• stored ••••" : "Paste API key"}
            className="h-11 border-0 bg-foreground/5" />
        </div>
        <div className="flex items-center justify-between rounded-2xl glass p-4">
          <div>
            <div className="font-medium">Enable Scandit scanning</div>
            <div className="text-xs text-muted-foreground">When off, scanner falls back to browser camera.</div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <button onClick={async () => { await save({ data: { scandit_api_key: key || null, scandit_enabled: enabled } }); toast.success("Saved"); refetch(); }}
          className="inline-flex items-center gap-2 rounded-xl bg-sunset px-5 py-2.5 text-sm font-semibold text-foreground shadow-glow-sunset">
          Save settings
        </button>
      </div>
    </Panel>
  );
}
