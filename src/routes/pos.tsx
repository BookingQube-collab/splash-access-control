import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoleGuard } from "@/components/role-guard";
import { getPublicEvent, posRegister, searchByMobile } from "@/lib/summersplash.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search, User, Phone, Mail, ExternalLink, Sparkles,
  QrCode, ArrowRight, CheckCircle2, Edit3, X, History, Zap, ScanLine, Camera,
  Maximize2, Minimize2, Waves, LogOut, ShieldCheck, Timer, BarChart3, Headphones,
  Car, Star, Calendar, Crown, Anchor, Sun,
} from "lucide-react";
import { BeachBg } from "@/components/beach-bg";
import { QrPassModal } from "@/components/qr-pass-modal";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/pos")({
  ssr: false,
  component: () => (<RoleGuard role="pos" loginPath="/login/pos" bare><POS /></RoleGuard>),
});

type Registration = {
  id: string; customer_name: string; mobile: string; email?: string | null; guest_count: number;
  qr_token: string; status: string; created_at: string;
  slots?: { name: string; starts_at: string } | null;
};

function POS() {
  const fetchEvent = useServerFn(getPublicEvent);
  const register = useServerFn(posRegister);
  const search = useServerFn(searchByMobile);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data, refetch } = useQuery({
    queryKey: ["pos-event"], queryFn: () => fetchEvent(),
    refetchInterval: 5000, refetchOnWindowFocus: true,
  });

  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(1);

  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupResults, setLookupResults] = useState<Registration[]>([]);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [lastToken, setLastToken] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMeta, setModalMeta] = useState<{ name?: string; slot?: string; guests?: number }>({});

  // ---- Barcode/QR scanner for mobile lookup ----
  const [scanOpen, setScanOpen] = useState(false);
  const scanRef = useRef<Html5Qrcode | null>(null);
  const stopScanner = async () => {
    if (scanRef.current) {
      try { await scanRef.current.stop(); await scanRef.current.clear(); } catch { /* noop */ }
      scanRef.current = null;
    }
  };
  useEffect(() => {
    if (!scanOpen) { stopScanner(); return; }
    const t = setTimeout(async () => {
      const el = document.getElementById("pos-scan-reader");
      if (!el) return;
      const q = new Html5Qrcode("pos-scan-reader");
      scanRef.current = q;
      try {
        await q.start(
          { facingMode: "environment" }, { fps: 10, qrbox: 240 },
          (decoded) => {
            const cleaned = decoded.replace(/\D/g, "") || decoded.trim();
            setMobile(cleaned);
            setScanOpen(false);
            toast.success(`Scanned ${cleaned}`);
          },
          () => { /* ignore per-frame errors */ },
        );
      } catch (e: any) { toast.error(e?.message ?? "Camera unavailable"); setScanOpen(false); }
    }, 80);
    return () => { clearTimeout(t); stopScanner(); };
  }, [scanOpen]);
  useEffect(() => () => { stopScanner(); }, []);

  // ---- Live mobile lookup (debounced) ----
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = mobile.trim();
    if (q.length < 3) { setLookupResults([]); setLookupOpen(false); return; }
    setLookupBusy(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await search({ data: { mobile: q } });
        setLookupResults((r.results ?? []) as Registration[]);
        setLookupOpen(true);
      } catch { /* ignore */ } finally { setLookupBusy(false); }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [mobile, search]);

  const applyCustomer = (r: Registration) => {
    setName(r.customer_name);
    setMobile(r.mobile);
    if (r.email) setEmail(r.email);
    setGuests(Math.max(1, r.guest_count || 1));
    setLookupOpen(false);
    toast.success(`Loaded ${r.customer_name}`);
  };

  // ---- Fullscreen toggle ----
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (e: any) { toast.error(e?.message ?? "Fullscreen unavailable"); }
  };

  const slot = useMemo(
    () => (data?.slots ?? []).find((s) => s.id === slotId),
    [data?.slots, slotId],
  );
  const blocked = !slot || slot.remaining <= 0 || guests > slot.remaining || !name.trim() || !mobile.trim();
  const blockReason = !slot ? "Pick a slot" :
    slot.remaining <= 0 ? "Slot full" :
    guests > slot.remaining ? "Reduce guests" :
    !name.trim() ? "Enter name" :
    !mobile.trim() ? "Enter mobile" : "";

  const onReview = () => {
    if (blocked) { toast.error(blockReason); return; }
    setConfirmOpen(true);
  };

  const onConfirmSubmit = async () => {
    if (!slot) return;
    setSubmitting(true);
    try {
      const res = await register({ data: {
        slot_id: slot.id, customer_name: name.trim(), mobile: mobile.trim(),
        email: email.trim(), guest_count: guests,
      } });
      setLastToken(res.qr_token);
      setModalMeta({ name: name.trim(), slot: slot.name, guests });
      setConfirmOpen(false);
      setModalOpen(true);
      toast.success("Registered ✓");
      setName(""); setMobile(""); setEmail(""); setGuests(1); setSlotId("");
      refetch();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const meterTone = (pct: number, full: boolean) =>
    full ? "from-coral to-coral" :
    pct >= 80 ? "from-sunset to-coral" :
    pct >= 50 ? "from-aqua to-sunset" :
    "from-aqua to-primary";

  return (
    <div className="relative flex flex-col overflow-hidden">
      <BeachBg variant="ocean" />

      {/* Header (compact, premium) */}
      <header className="relative z-30 shrink-0 border-b border-foreground/5 bg-background/50 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-aqua/30 to-primary/20 text-aqua shadow-glow-aqua ring-1 ring-aqua/30">
                <Waves className="h-4 w-4" />
              </span>
              <span className="font-display text-xl font-extrabold tracking-tight">SummerSplash</span>
            </div>
            <span className="hidden h-9 w-px bg-foreground/10 sm:block" />
            <div className="hidden leading-tight sm:block">
              <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-aqua/80">Counter · POS</p>
              <h1 className="font-display text-lg font-extrabold">Point of Sale</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live
            </span>
            <button
              type="button" onClick={toggleFullscreen}
              title={isFs ? "Exit fullscreen" : "Fullscreen"}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1.5 text-[11px] font-bold text-foreground/80 ring-1 ring-foreground/10 transition hover:bg-aqua/15 hover:text-aqua hover:ring-aqua/30"
            >
              {isFs ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isFs ? "Exit" : "Fullscreen"}</span>
            </button>
            <button
              type="button"
              onClick={async () => { await signOut(); navigate({ to: "/login/pos" }); }}
              title="Sign out"
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1.5 text-[11px] font-bold text-foreground/80 ring-1 ring-foreground/10 transition hover:bg-coral/15 hover:text-coral hover:ring-coral/30"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1400px] px-3 py-3 sm:px-4">
        <div className="grid h-full gap-3 lg:grid-cols-12">
          {/* === LEFT column: slots + customer === */}
          <div className="space-y-3 lg:col-span-7">
            <Section step={1} title="Choose slot" trailing={
              slot && <SlotMeterBadge slot={slot} guests={guests} />
            }>
              {(data?.slots ?? []).length === 0 ? (
                <Empty>No slots configured.</Empty>
              ) : (data?.slots ?? []).every((s) => s.remaining <= 0) ? (
                <FullBanner>All slots are full — registrations are paused.</FullBanner>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(data?.slots ?? []).map((s, idx) => {
                    const full = s.remaining <= 0;
                    const selected = slotId === s.id;
                    const booked = s.capacity - s.remaining;
                    const pct = Math.min(100, Math.round((booked / Math.max(1, s.capacity)) * 100));
                    const palette = SLOT_PALETTE[idx % SLOT_PALETTE.length];
                    const Icon = palette.Icon;
                    return (
                      <motion.button
                        key={s.id} type="button" whileTap={{ scale: 0.97 }}
                        onClick={() => !full && setSlotId(s.id)} disabled={full}
                        className={`relative overflow-hidden rounded-2xl p-4 text-left transition ${
                          selected ? `glass-strong ring-2 ${palette.ring} ${palette.glow}`
                                   : "glass hover:ring-1 hover:ring-foreground/15"
                        } ${full ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        <div className="flex items-start justify-between">
                          <span className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${palette.iconBg}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          {selected && (
                            <span className={`grid h-6 w-6 place-items-center rounded-full ${palette.checkBg} text-primary-foreground`}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="mt-3 font-display text-base font-bold leading-tight">{s.name}</div>
                        <div className="mt-1.5 flex items-baseline gap-1.5">
                          {full ? (
                            <span className="rounded-md bg-coral/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-coral">Full</span>
                          ) : (
                            <>
                              <span className="font-display text-3xl font-extrabold tabular-nums text-foreground">{booked}</span>
                              <span className="text-xs text-muted-foreground">/ {s.capacity}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                          <motion.div
                            initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }}
                            className={`h-full rounded-full bg-gradient-to-r ${palette.bar}`}
                          />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </Section>

            <Section step={2} title="Customer">
              <div className="space-y-2.5">
                <div className="relative">
                  <Field icon={<Phone className="h-4 w-4" />} label="Mobile (auto-search · scan barcode)">
                    <Input
                      inputMode="tel" autoComplete="tel" value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="Type or scan barcode/QR"
                      className="h-11 border-0 bg-foreground/5 pr-24 text-base tracking-wide"
                    />
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                      {lookupBusy ? <Zap className="h-4 w-4 animate-pulse text-aqua" /> :
                        mobile.trim().length >= 3 ? <Search className="h-4 w-4 text-aqua" /> : null}
                      <button
                        type="button" onClick={() => setScanOpen(true)}
                        title="Scan barcode/QR"
                        className="inline-flex items-center gap-1 rounded-lg bg-aqua/15 px-2 py-1.5 text-[11px] font-bold text-aqua ring-1 ring-aqua/30 transition hover:bg-aqua/25"
                      >
                        <ScanLine className="h-3.5 w-3.5" /> Scan
                      </button>
                    </div>
                  </Field>

                  <AnimatePresence>
                    {lookupOpen && lookupResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        className="absolute left-0 right-0 z-20 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-foreground/10 bg-background/95 p-1.5 shadow-2xl backdrop-blur-xl"
                      >
                        <div className="flex items-center justify-between px-3 py-1.5">
                          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-aqua">
                            <History className="h-3 w-3" /> {lookupResults.length} match{lookupResults.length === 1 ? "" : "es"}
                          </span>
                          <button onClick={() => setLookupOpen(false)} className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-foreground/10">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {lookupResults.map((r) => (
                          <button key={r.id} type="button" onClick={() => applyCustomer(r)}
                            className="group flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-foreground/5">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-aqua/15 font-display text-sm font-bold text-aqua">
                              {r.customer_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">{r.customer_name}</div>
                              <div className="truncate text-[11px] text-muted-foreground">
                                {r.mobile} · {r.guest_count}g · {r.slots?.name ?? "—"}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-aqua" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field icon={<User className="h-4 w-4" />} label="Full name">
                    <Input required value={name} onChange={(e) => setName(e.target.value)}
                      className="h-11 border-0 bg-foreground/5 text-base" />
                  </Field>
                  <Field icon={<Mail className="h-4 w-4" />} label="Email (optional)">
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="h-11 border-0 bg-foreground/5 text-sm" />
                  </Field>
                </div>
              </div>
            </Section>
          </div>

          {/* === RIGHT column: guests, capacity, confirm, reprint === */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            <Section step={3} title="Guests">
              <GuestStepper guests={guests} setGuests={setGuests} maxAllowed={slot ? Math.min(20, Math.max(1, slot.remaining)) : 20} />

              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/5 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-aqua/15 text-aqua ring-1 ring-aqua/25">
                  <Calendar className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight">Select the number of guests</div>
                  <div className="text-[11px] text-muted-foreground">
                    Maximum {slot ? Math.min(20, Math.max(1, slot.remaining)) : 20} guests per booking
                  </div>
                </div>
              </div>

              {slot && (() => {
                const usedAfter = (slot.capacity - slot.remaining) + guests;
                const pct = Math.min(100, Math.round((usedAfter / Math.max(1, slot.capacity)) * 100));
                const over = guests > slot.remaining;
                const full = slot.remaining <= 0;
                return (
                  <div className="mt-3 rounded-xl border border-foreground/10 bg-foreground/5 p-3">
                    <div className="mb-1.5 flex items-baseline justify-between text-xs">
                      <span className="font-semibold text-muted-foreground">After this booking</span>
                      <span className={`font-display text-base font-bold tabular-nums ${over || full ? "text-coral" : "text-foreground"}`}>
                        {Math.min(slot.capacity, usedAfter)} / {slot.capacity}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
                      <motion.div
                        initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.35 }}
                        className={`h-full rounded-full bg-gradient-to-r ${meterTone(pct, full || over)}`}
                      />
                    </div>
                    <AnimatePresence>
                      {(full || over) && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="mt-2 flex items-center gap-2 rounded-lg border border-coral/30 bg-coral/10 px-2.5 py-1.5 text-[11px] font-semibold text-coral">
                          <X className="h-3 w-3" />
                          {full ? "Slot is full — pick another." :
                            `Only ${slot.remaining} ${slot.remaining === 1 ? "spot" : "spots"} left.`}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}
            </Section>

            <button
              type="button" onClick={onReview} disabled={blocked}
              className="group relative inline-flex h-16 w-full shrink-0 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#ff7a45] via-[#ff5b6a] to-[#ff4d8a] text-base font-bold text-white shadow-[0_18px_40px_-12px_rgba(255,90,106,0.7)] transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-5 w-5" />
              <span>{blocked ? blockReason : "Review & Confirm"}</span>
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              <span className="absolute inset-0 animate-shimmer opacity-30" />
            </button>

            {lookupResults.length > 0 && (
              <Section icon={<Search className="h-4 w-4" />} title="Reprint a pass">
                <div className="space-y-1.5">
                  {lookupResults.slice(0, 2).map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl glass p-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{r.customer_name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {r.mobile} · {r.slots?.name} · {r.guest_count}g
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button onClick={() => {
                          setLastToken(r.qr_token);
                          setModalMeta({ name: r.customer_name, slot: r.slots?.name, guests: r.guest_count });
                          setModalOpen(true);
                        }} className="inline-flex items-center gap-1 rounded-lg bg-aqua/15 px-2.5 py-1.5 text-[11px] font-semibold text-aqua hover:bg-aqua/25">
                          <QrCode className="h-3.5 w-3.5" /> Reprint
                        </button>
                        <Link to="/pass/$token" params={{ token: r.qr_token }} target="_blank"
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2 py-1.5 text-[11px] font-semibold text-primary">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* === Trust / feature row === */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TrustCard icon={<ShieldCheck className="h-5 w-5" />} tone="aqua"
            title="Secure & Reliable" body="Your data is encrypted and transactions are secure." />
          <TrustCard icon={<Timer className="h-5 w-5" />} tone="primary"
            title="Fast Check-in" body="Quick scanning and auto guest lookup." />
          <TrustCard icon={<BarChart3 className="h-5 w-5" />} tone="success"
            title="Real-time Updates" body="Live capacity and slot availability." />
          <TrustCard icon={<Headphones className="h-5 w-5" />} tone="sunset"
            title="Support" body="Need help? Our support team is here for you." />
        </div>
      </main>

      <footer className="relative z-10 mt-3 border-t border-foreground/5 bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11px] text-muted-foreground">
          <span>© {new Date().getFullYear()} SummerSplash. All rights reserved.</span>
          <span className="tabular-nums">v1.0.0</span>
        </div>
      </footer>

      {/* === Barcode/QR scan modal === */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent hideClose className="max-w-md border-0 bg-transparent p-0 shadow-none">
          <div className="overflow-hidden rounded-3xl glass-strong p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-aqua/15 text-aqua">
                  <Camera className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-aqua">Scan</p>
                  <h3 className="font-display text-base font-extrabold">Mobile barcode / QR</h3>
                </div>
              </div>
              <button onClick={() => setScanOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-foreground/10 hover:bg-foreground/20">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-black/70">
              <div id="pos-scan-reader" className="h-full w-full" />
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Point at a barcode or QR — the mobile field will fill and search runs automatically.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Confirmation modal === */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent hideClose className="max-w-md border-0 bg-transparent p-0 shadow-none">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative overflow-hidden rounded-3xl glass-strong p-6 shadow-soft"
          >
            <button onClick={() => setConfirmOpen(false)}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-foreground/10 text-foreground/70 hover:bg-foreground/20">
              <X className="h-4 w-4" />
            </button>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-aqua">Confirm registration</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">Review details</h2>
            <p className="mt-1 text-xs text-muted-foreground">Double-check before generating the QR pass.</p>

            <div className="mt-5 space-y-2.5">
              <Row label="Customer" value={name} />
              <Row label="Mobile" value={mobile} />
              {email && <Row label="Email" value={email} />}
              <Row label="Slot" value={slot?.name ?? "—"} />
              <Row label="Guests" value={
                <span className="font-display text-xl font-extrabold tabular-nums text-foreground">{guests}</span>
              } />
              {slot && (
                <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Capacity after booking</span>
                    <span className="font-semibold tabular-nums">
                      {Math.min(slot.capacity, (slot.capacity - slot.remaining) + guests)} / {slot.capacity}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-aqua to-primary"
                      style={{ width: `${Math.min(100, Math.round((((slot.capacity - slot.remaining) + guests) / Math.max(1, slot.capacity)) * 100))}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2.5">
              <button type="button" onClick={() => setConfirmOpen(false)}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground/10 text-sm font-semibold hover:bg-foreground/15">
                <Edit3 className="h-4 w-4" /> Edit
              </button>
              <button type="button" onClick={onConfirmSubmit} disabled={submitting}
                className="group relative inline-flex h-12 flex-[2] items-center justify-center gap-2 overflow-hidden rounded-2xl bg-sunset text-sm font-bold text-foreground shadow-glow-sunset disabled:opacity-60">
                <Sparkles className="h-4 w-4" />
                <span>{submitting ? "Generating…" : "Confirm & Generate QR"}</span>
                <span className="absolute inset-0 animate-shimmer opacity-50" />
              </button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <QrPassModal
        open={modalOpen} onOpenChange={setModalOpen} token={lastToken}
        customerName={modalMeta.name} slotName={modalMeta.slot} guests={modalMeta.guests}
      />
    </div>
  );
}

// ---------- Small UI primitives ----------

const SLOT_PALETTE = [
  { Icon: Car,   ring: "ring-aqua",     glow: "shadow-glow-aqua",
    iconBg: "bg-aqua/15 text-aqua ring-aqua/30",
    checkBg: "bg-aqua",     bar: "from-aqua to-primary" },
  { Icon: User,  ring: "ring-primary",  glow: "shadow-[0_0_30px_-6px_rgba(96,165,250,0.6)]",
    iconBg: "bg-primary/15 text-primary ring-primary/30",
    checkBg: "bg-primary",  bar: "from-primary to-aqua" },
  { Icon: Star,  ring: "ring-[#a78bfa]", glow: "shadow-[0_0_30px_-6px_rgba(167,139,250,0.6)]",
    iconBg: "bg-[#a78bfa]/15 text-[#a78bfa] ring-[#a78bfa]/30",
    checkBg: "bg-[#a78bfa]", bar: "from-[#a78bfa] to-[#c084fc]" },
  { Icon: Crown, ring: "ring-sunset",   glow: "shadow-glow-sunset",
    iconBg: "bg-sunset/15 text-sunset ring-sunset/30",
    checkBg: "bg-sunset",   bar: "from-sunset to-coral" },
  { Icon: Anchor,ring: "ring-success",  glow: "shadow-[0_0_30px_-6px_rgba(74,222,128,0.55)]",
    iconBg: "bg-success/15 text-success ring-success/30",
    checkBg: "bg-success",  bar: "from-success to-aqua" },
  { Icon: Sun,   ring: "ring-coral",    glow: "shadow-[0_0_30px_-6px_rgba(255,107,107,0.55)]",
    iconBg: "bg-coral/15 text-coral ring-coral/30",
    checkBg: "bg-coral",    bar: "from-coral to-sunset" },
];

function Section({ icon, step, title, trailing, children }: {
  icon?: React.ReactNode; step?: number; title: string; trailing?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl glass-strong p-4 shadow-soft sm:p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {step !== undefined ? (
            <span className="grid h-7 w-7 place-items-center rounded-full bg-aqua/15 font-display text-xs font-extrabold text-aqua ring-1 ring-aqua/30">
              {step}
            </span>
          ) : (
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-aqua/15 text-aqua">{icon}</div>
          )}
          <h2 className="font-display text-base font-bold">{title}</h2>
        </div>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {icon}{label}
      </Label>
      <div className="relative">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl glass p-4 text-sm text-muted-foreground">{children}</div>;
}

function FullBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-coral/30 bg-coral/10 p-4 text-sm font-semibold text-coral">
      {children}
    </div>
  );
}

function TrustCard({ icon, tone, title, body }: {
  icon: React.ReactNode; tone: "aqua" | "primary" | "success" | "sunset"; title: string; body: string;
}) {
  const toneMap: Record<string, string> = {
    aqua: "bg-aqua/15 text-aqua ring-aqua/25",
    primary: "bg-primary/15 text-primary ring-primary/25",
    success: "bg-success/15 text-success ring-success/25",
    sunset: "bg-sunset/15 text-sunset ring-sunset/25",
  };
  return (
    <div className="flex items-start gap-3 rounded-2xl glass p-4 shadow-soft">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ${toneMap[tone]}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-sm font-extrabold leading-tight">{title}</h3>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-foreground/5 pb-2.5 last:border-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="truncate text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

function SlotMeterBadge({ slot, guests }: { slot: { capacity: number; remaining: number }; guests: number }) {
  const after = Math.min(slot.capacity, (slot.capacity - slot.remaining) + guests);
  return (
    <span className="rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] font-semibold tabular-nums">
      <span className="text-muted-foreground">selected · </span>
      <span className="text-foreground">{after}/{slot.capacity}</span>
    </span>
  );
}

function GuestStepper({ guests, setGuests, maxAllowed }: { guests: number; setGuests: (n: number) => void; maxAllowed: number }) {
  const setG = (n: number) => setGuests(Math.max(1, Math.min(maxAllowed, Math.floor(n) || 1)));
  const presets = [1, 2, 4, 6, 8].filter((n) => n <= maxAllowed);
  return (
    <div>
      <div className="flex items-stretch gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-1.5 shadow-inner">
        <motion.button whileTap={{ scale: 0.92 }} type="button" onClick={() => setG(guests - 1)} disabled={guests <= 1}
          className="grid h-16 w-16 place-items-center rounded-xl bg-foreground/10 text-3xl font-bold transition hover:bg-coral/20 hover:text-coral disabled:cursor-not-allowed disabled:opacity-40 active:bg-coral/30">
          −
        </motion.button>
        <input type="number" inputMode="numeric" min={1} max={maxAllowed} value={guests}
          onChange={(e) => setG(Number(e.target.value))}
          className="h-16 w-full min-w-0 rounded-xl bg-transparent text-center font-display text-4xl font-extrabold tabular-nums tracking-tight outline-none focus:bg-foreground/5" />
        <motion.button whileTap={{ scale: 0.92 }} type="button" onClick={() => setG(guests + 1)} disabled={guests >= maxAllowed}
          className="grid h-16 w-16 place-items-center rounded-xl bg-foreground/10 text-3xl font-bold transition hover:bg-aqua/20 hover:text-aqua disabled:cursor-not-allowed disabled:opacity-40 active:bg-aqua/30">
          +
        </motion.button>
      </div>
      {presets.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {presets.map((n) => (
            <button key={n} type="button" onClick={() => setG(n)}
              className={`grid h-11 w-11 place-items-center rounded-full font-display text-sm font-extrabold tabular-nums ring-1 transition ${
                guests === n
                  ? "bg-aqua text-primary-foreground ring-aqua shadow-glow-aqua"
                  : "bg-foreground/5 text-foreground/70 ring-foreground/10 hover:bg-foreground/10 hover:text-foreground"
              }`}>
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
