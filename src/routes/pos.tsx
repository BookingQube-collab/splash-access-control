import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoleGuard } from "@/components/role-guard";
import { getPublicEvent, posRegister, searchByMobile } from "@/lib/summersplash.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, User, Phone, Mail, Users, Plus, Ticket, ExternalLink, Sparkles } from "lucide-react";
import { BeachBg } from "@/components/beach-bg";

export const Route = createFileRoute("/pos")({
  component: () => (<RoleGuard role="pos" loginPath="/login/pos"><POS /></RoleGuard>),
});

function POS() {
  const fetchEvent = useServerFn(getPublicEvent);
  const register = useServerFn(posRegister);
  const search = useServerFn(searchByMobile);
  const { data, refetch } = useQuery({ queryKey: ["pos-event"], queryFn: () => fetchEvent(), refetchInterval: 10000 });

  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState(""); const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState(""); const [guests, setGuests] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [lastToken, setLastToken] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotId) return toast.error("Pick a slot");
    try {
      const res = await register({ data: { slot_id: slotId, customer_name: name.trim(), mobile: mobile.trim(), email: email.trim(), guest_count: guests } });
      toast.success("Registered ✓");
      setLastToken(res.qr_token);
      setName(""); setMobile(""); setEmail(""); setGuests(1);
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const doSearch = async () => {
    if (!searchTerm.trim()) return;
    const r = await search({ data: { mobile: searchTerm.trim() } });
    setResults(r.results);
  };

  return (
    <div className="relative min-h-screen px-6 py-6">
      <BeachBg variant="ocean" />

      <header className="relative z-10 mx-auto mb-6 flex max-w-7xl items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-aqua">Counter</p>
          <h1 className="font-display text-3xl font-extrabold">Point of Sale</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-xs">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Connected
        </span>
      </header>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
        {/* Left: Registration */}
        <div className="rounded-3xl glass-strong p-6 shadow-soft">
          <div className="mb-5 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-aqua/20 text-aqua"><Plus className="h-5 w-5" /></div>
            <h2 className="font-display text-xl font-bold">New Registration</h2>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Choose slot</Label>
              <div className="grid grid-cols-2 gap-2.5">
                {(data?.slots ?? []).map((s) => {
                  const full = s.remaining <= 0;
                  const selected = slotId === s.id;
                  const pct = Math.min(100, Math.round(((s.capacity - s.remaining) / Math.max(1, s.capacity)) * 100));
                  return (
                    <motion.button whileTap={{ scale: 0.98 }} type="button" key={s.id}
                      onClick={() => setSlotId(s.id)} disabled={full}
                      className={`relative overflow-hidden rounded-2xl p-4 text-left transition ${
                        selected ? "glass-strong ring-1 ring-primary shadow-glow-aqua" : "glass hover:shadow-glow-aqua"
                      } ${full ? "cursor-not-allowed opacity-50" : ""}`}>
                      <div className="font-display text-base font-bold">{s.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {full ? <span className="font-bold text-coral">SOLD OUT</span> : <><b className="text-foreground">{s.remaining}</b> / {s.capacity}</>}
                      </div>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                        <div className={`h-full ${full ? "bg-coral" : "bg-gradient-to-r from-aqua to-primary"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4">
              <PField icon={<User className="h-4 w-4" />} label="Name">
                <Input required value={name} onChange={(e) => setName(e.target.value)} className="h-12 border-0 bg-foreground/5 text-base" />
              </PField>
              <div className="grid grid-cols-2 gap-3">
                <PField icon={<Phone className="h-4 w-4" />} label="Mobile">
                  <Input required value={mobile} onChange={(e) => setMobile(e.target.value)} className="h-12 border-0 bg-foreground/5 text-base" />
                </PField>
                <PField icon={<Users className="h-4 w-4" />} label="Guests">
                  <Input type="number" min={1} max={20} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="h-12 border-0 bg-foreground/5 text-base" />
                </PField>
              </div>
              <PField icon={<Mail className="h-4 w-4" />} label="Email (optional)">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 border-0 bg-foreground/5 text-base" />
              </PField>
            </div>

            <button type="submit"
              className="group relative inline-flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-sunset text-base font-semibold text-foreground shadow-glow-sunset">
              <Sparkles className="h-5 w-5" />
              <span>Register & Generate QR</span>
              <span className="absolute inset-0 animate-shimmer opacity-50" />
            </button>
          </form>
        </div>

        {/* Right: Search + last QR */}
        <div className="space-y-6">
          <div className="rounded-3xl glass-strong p-6 shadow-soft">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-sunset/20 text-sunset"><Search className="h-5 w-5" /></div>
              <h2 className="font-display text-xl font-bold">Reprint Pass</h2>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Mobile number" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 border-0 bg-foreground/5 text-base" />
              <button onClick={doSearch}
                className="rounded-xl bg-aqua px-5 text-sm font-semibold text-primary-foreground shadow-glow-aqua">
                Search
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <AnimatePresence>
                {results.map((r) => (
                  <motion.div key={r.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between rounded-xl glass p-3 text-sm">
                    <div>
                      <div className="font-semibold">{r.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{r.mobile} · {r.slots?.name} · {r.guest_count}g · {r.status}</div>
                    </div>
                    <Link to="/pass/$token" params={{ token: r.qr_token }} target="_blank"
                      className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary">
                      Open <ExternalLink className="h-3 w-3" />
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
              {results.length === 0 && <p className="text-sm text-muted-foreground">No results yet.</p>}
            </div>
          </div>

          <AnimatePresence>
            {lastToken && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-3xl glass-strong p-6 shadow-soft">
                <div className="mb-3 flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-aqua" />
                  <h3 className="font-display text-lg font-bold">Last pass ready</h3>
                </div>
                <p className="text-sm text-muted-foreground">Show or print the QR pass for the customer.</p>
                <Link to="/pass/$token" params={{ token: lastToken }} target="_blank"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sunset px-5 py-3 text-sm font-semibold text-foreground shadow-glow-sunset">
                  Open pass <ExternalLink className="h-4 w-4" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </Label>
      {children}
    </div>
  );
}
