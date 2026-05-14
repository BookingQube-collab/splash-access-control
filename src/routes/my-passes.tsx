import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Phone, ArrowRight, Ticket, Users, Calendar, QrCode, ExternalLink,
  CheckCircle2, LogOut, Clock, AlertTriangle, Search, ShieldCheck,
} from "lucide-react";
import { BeachBg } from "@/components/beach-bg";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyPasses } from "@/lib/summersplash.functions";
import { IntlPhoneInput } from "@/components/phone-input";

export const Route = createFileRoute("/my-passes")({
  head: () => ({
    meta: [
      { title: "My Passes — SummerSplash" },
      { name: "description", content: "Look up your SummerSplash passes with your phone number." },
    ],
  }),
  component: MyPassesPage,
});

type Pass = Awaited<ReturnType<typeof getMyPasses>>["passes"][number];

function MyPassesPage() {
  const fetchPasses = useServerFn(getMyPasses);
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [passes, setPasses] = useState<Pass[]>([]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = mobile.trim();
    if (m.length < 7) { toast.error("Enter a valid mobile number"); return; }
    setLoading(true);
    try {
      const res = await fetchPasses({ data: { mobile: m } });
      setPasses(res.passes);
      setUnlocked(true);
      if (res.passes.length === 0) toast.info("No passes found for this number");
      else toast.success(`Found ${res.passes.length} pass${res.passes.length === 1 ? "" : "es"}`);
    } catch (err: any) { toast.error(err?.message ?? "Lookup failed"); }
    finally { setLoading(false); }
  };

  const reset = () => { setUnlocked(false); setPasses([]); };

  const active = passes.filter((p) => p.isActive);
  const inactive = passes.filter((p) => !p.isActive);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <BeachBg variant="ocean" />

      <header className="relative z-20 border-b border-foreground/5 bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-aqua/30 to-primary/20 text-aqua ring-1 ring-aqua/30">
              <Ticket className="h-4 w-4" />
            </span>
            SummerSplash
          </Link>
          {unlocked && (
            <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1.5 text-xs font-semibold hover:bg-foreground/15">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {!unlocked ? (
            <motion.div
              key="login" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="mx-auto max-w-md"
            >
              <div className="mb-6 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-aqua/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-aqua ring-1 ring-aqua/30">
                  <ShieldCheck className="h-3 w-3" /> Phone access
                </span>
                <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">My passes</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter your mobile number to see every pass you've booked.
                </p>
              </div>

              <form onSubmit={onSubmit} className="rounded-3xl glass-strong p-6 shadow-soft">
                <Label className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> Mobile number
                </Label>
                <IntlPhoneInput
                  value={mobile} onChange={setMobile}
                  placeholder="e.g. 9876543210"
                  className="h-14"
                  autoFocus
                />
                <button
                  type="submit" disabled={loading}
                  className="group mt-4 inline-flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-sunset text-base font-bold text-foreground shadow-glow-sunset transition disabled:opacity-60"
                >
                  <Search className="h-5 w-5" />
                  <span>{loading ? "Looking up…" : "Access my passes"}</span>
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </button>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  We'll show passes booked with this exact number.
                </p>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="list" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-aqua">Signed in · {mobile}</p>
                  <h1 className="mt-1 font-display text-3xl font-extrabold">Your passes</h1>
                </div>
                <div className="flex gap-2 text-xs">
                  <Stat label="Active" value={active.length} tone="bg-success/15 text-success" />
                  <Stat label="Inactive" value={inactive.length} tone="bg-foreground/10 text-muted-foreground" />
                </div>
              </div>

              {passes.length === 0 ? (
                <div className="rounded-2xl glass p-8 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-foreground/10">
                    <Ticket className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="mt-3 font-display text-lg font-bold">No passes yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">We couldn't find any bookings for {mobile}.</p>
                  <Link to="/register" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-aqua/15 px-4 py-2 text-sm font-bold text-aqua ring-1 ring-aqua/30 hover:bg-aqua/25">
                    Book a slot <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <>
                  {active.length > 0 && (
                    <Section title="Active" icon={<CheckCircle2 className="h-4 w-4" />} accent="text-success">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {active.map((p) => <PassCard key={p.id} pass={p} />)}
                      </div>
                    </Section>
                  )}
                  {inactive.length > 0 && (
                    <Section title="Inactive / past" icon={<Clock className="h-4 w-4" />} accent="text-muted-foreground">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {inactive.map((p) => <PassCard key={p.id} pass={p} />)}
                      </div>
                    </Section>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Section({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={`mb-2.5 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider ${accent}`}>
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold ${tone}`}>
      <span className="tabular-nums">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
    </span>
  );
}

function PassCard({ pass }: { pass: Pass }) {
  const tone =
    pass.liveStatus === "Active" ? "bg-aqua/15 text-aqua ring-aqua/30" :
    pass.liveStatus === "Inside" ? "bg-success/15 text-success ring-success/30" :
    pass.liveStatus === "Exited" ? "bg-foreground/10 text-muted-foreground ring-foreground/20" :
    "bg-coral/15 text-coral ring-coral/30";
  const Icon = pass.liveStatus === "Active" ? CheckCircle2 :
    pass.liveStatus === "Inside" ? ShieldCheck :
    pass.liveStatus === "Exited" ? LogOut : AlertTriangle;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl glass-strong p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">{pass.event_name ?? "Event"}</p>
          <h3 className="mt-0.5 truncate font-display text-base font-extrabold">{pass.slot_name ?? "Slot"}</h3>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${tone}`}>
          <Icon className="h-3 w-3" /> {pass.liveStatus}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <Info icon={<Calendar className="h-3 w-3" />} label="Date">
          {pass.event_date ? format(new Date(pass.event_date), "MMM d, yyyy") : "—"}
        </Info>
        <Info icon={<Clock className="h-3 w-3" />} label="Time">
          {pass.slot_starts_at ? format(new Date(pass.slot_starts_at), "p") : "—"}
        </Info>
        <Info icon={<Users className="h-3 w-3" />} label="Guests">
          <span className="font-display text-sm font-extrabold tabular-nums">{pass.guest_count}</span>
        </Info>
        <Info icon={<Ticket className="h-3 w-3" />} label="Booked">
          {format(new Date(pass.created_at), "MMM d")}
        </Info>
      </div>

      <div className="mt-3 flex gap-2">
        <Link to="/pass/$token" params={{ token: pass.qr_token }} target="_blank"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-aqua/15 px-3 py-2 text-xs font-bold text-aqua ring-1 ring-aqua/30 hover:bg-aqua/25">
          <QrCode className="h-3.5 w-3.5" /> View pass
        </Link>
        <Link to="/pass/$token" params={{ token: pass.qr_token }} target="_blank"
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-foreground/10 px-3 py-2 text-xs font-semibold hover:bg-foreground/15">
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}

function Info({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-foreground/5 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-0.5 truncate text-foreground">{children}</div>
    </div>
  );
}
