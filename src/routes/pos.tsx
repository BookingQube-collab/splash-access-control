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
  Search, User, Phone, Mail, Users, Ticket, ExternalLink, Sparkles,
  QrCode, ArrowRight, CheckCircle2, Edit3, X, History, Zap,
} from "lucide-react";
import { BeachBg } from "@/components/beach-bg";
import { QrPassModal } from "@/components/qr-pass-modal";

export const Route = createFileRoute("/pos")({
  component: () => (<RoleGuard role="pos" loginPath="/login/pos"><POS /></RoleGuard>),
});

type Registration = {
  id: string; customer_name: string; mobile: string; guest_count: number;
  qr_token: string; status: string; created_at: string;
  slots?: { name: string; starts_at: string } | null;
};

function POS() {
  const fetchEvent = useServerFn(getPublicEvent);
  const register = useServerFn(posRegister);
  const search = useServerFn(searchByMobile);
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
    setGuests(Math.max(1, r.guest_count || 1));
    setLookupOpen(false);
    toast.success(`Loaded ${r.customer_name}`);
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
    <div className="relative min-h-screen pb-32">
      <BeachBg variant="ocean" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-aqua">Counter</p>
            <h1 className="font-display text-2xl font-extrabold leading-tight">Point of Sale</h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-[11px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl space-y-5 px-5 pt-5">
        {/* === Slot picker — horizontal touch row === */}
        <Section icon={<Ticket className="h-4 w-4" />} title="Choose slot" trailing={
          slot && <SlotMeterBadge slot={slot} guests={guests} />
        }>
          {(data?.slots ?? []).length === 0 ? (
            <Empty>No slots configured.</Empty>
          ) : (data?.slots ?? []).every((s) => s.remaining <= 0) ? (
            <FullBanner>All slots are full — registrations are paused.</FullBanner>
          ) : (
            <div className="-mx-1 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {(data?.slots ?? []).map((s) => {
                const full = s.remaining <= 0;
                const selected = slotId === s.id;
                const pct = Math.min(100, Math.round(((s.capacity - s.remaining) / Math.max(1, s.capacity)) * 100));
                return (
                  <motion.button
                    key={s.id} type="button" whileTap={{ scale: 0.97 }}
                    onClick={() => !full && setSlotId(s.id)} disabled={full}
                    className={`relative overflow-hidden rounded-2xl p-4 text-left transition ${
                      selected ? "glass-strong ring-2 ring-primary shadow-glow-aqua"
                               : "glass hover:ring-1 hover:ring-aqua/40"
                    } ${full ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    {selected && (
                      <span className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div className="font-display text-base font-bold leading-tight">{s.name}</div>
                    <div className="mt-1.5 flex items-baseline gap-1 text-xs">
                      {full ? (
                        <span className="rounded-md bg-coral/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-coral">Sold out</span>
                      ) : (
                        <>
                          <span className="font-display text-xl font-extrabold tabular-nums text-foreground">{s.remaining}</span>
                          <span className="text-muted-foreground">/ {s.capacity} left</span>
                        </>
                      )}
                    </div>
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                      <motion.div
                        initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }}
                        className={`h-full rounded-full bg-gradient-to-r ${meterTone(pct, full)}`}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </Section>

        {/* === Customer (with mobile lookup) === */}
        <Section icon={<User className="h-4 w-4" />} title="Customer">
          <div className="space-y-3">
            <div className="relative">
              <Field icon={<Phone className="h-4 w-4" />} label="Mobile (auto-search existing)">
                <Input
                  inputMode="tel" autoComplete="tel" value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 30077074"
                  className="h-14 border-0 bg-foreground/5 pr-12 text-lg tracking-wide"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {lookupBusy ? <Zap className="h-4 w-4 animate-pulse text-aqua" /> :
                    mobile.trim().length >= 3 ? <Search className="h-4 w-4 text-aqua" /> : null}
                </span>
              </Field>

              <AnimatePresence>
                {lookupOpen && lookupResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="absolute left-0 right-0 z-20 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-foreground/10 bg-background/95 p-1.5 shadow-2xl backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-aqua">
                        <History className="h-3 w-3" /> {lookupResults.length} match{lookupResults.length === 1 ? "" : "es"}
                      </span>
                      <button onClick={() => setLookupOpen(false)} className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-foreground/10">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {lookupResults.map((r) => (
                      <button key={r.id} type="button" onClick={() => applyCustomer(r)}
                        className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-foreground/5">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-aqua/15 font-display text-base font-bold text-aqua">
                          {r.customer_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{r.customer_name}</div>
                          <div className="truncate text-xs text-muted-foreground">
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

            <Field icon={<User className="h-4 w-4" />} label="Full name">
              <Input required value={name} onChange={(e) => setName(e.target.value)}
                className="h-14 border-0 bg-foreground/5 text-lg" />
            </Field>

            <Field icon={<Mail className="h-4 w-4" />} label="Email (optional)">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-14 border-0 bg-foreground/5 text-base" />
            </Field>
          </div>
        </Section>

        {/* === Guests stepper + capacity meter === */}
        <Section icon={<Users className="h-4 w-4" />} title="Guests"
          trailing={slot && <span className="text-[11px] text-muted-foreground">max <b className="text-aqua">{Math.min(20, slot.remaining)}</b></span>}
        >
          <GuestStepper guests={guests} setGuests={setGuests} maxAllowed={slot ? Math.min(20, Math.max(1, slot.remaining)) : 20} />

          {/* Live capacity meter */}
          {slot && (() => {
            const usedAfter = (slot.capacity - slot.remaining) + guests;
            const pct = Math.min(100, Math.round((usedAfter / Math.max(1, slot.capacity)) * 100));
            const over = guests > slot.remaining;
            const full = slot.remaining <= 0;
            return (
              <div className="mt-4 rounded-2xl border border-foreground/10 bg-foreground/5 p-3.5">
                <div className="mb-2 flex items-baseline justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">After this booking</span>
                  <span className={`font-display text-base font-bold tabular-nums ${over || full ? "text-coral" : "text-foreground"}`}>
                    {Math.min(slot.capacity, usedAfter)} / {slot.capacity}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-foreground/10">
                  <motion.div
                    initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.35 }}
                    className={`h-full rounded-full bg-gradient-to-r ${meterTone(pct, full || over)}`}
                  />
                </div>
                <AnimatePresence>
                  {(full || over) && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mt-3 flex items-center gap-2 rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-xs font-semibold text-coral">
                      <X className="h-3.5 w-3.5" />
                      {full ? "This slot is full — pick another slot." :
                        `Only ${slot.remaining} ${slot.remaining === 1 ? "spot" : "spots"} left in this slot.`}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })()}
        </Section>

        {/* === Reprint pass (compact) === */}
        <Section icon={<Search className="h-4 w-4" />} title="Reprint a pass">
          <p className="text-xs text-muted-foreground">
            Type a mobile above to find an existing customer, then reprint or open their pass.
          </p>
          {lookupResults.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {lookupResults.slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl glass p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{r.customer_name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {r.mobile} · {r.slots?.name} · {r.guest_count}g · {r.status}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button onClick={() => {
                      setLastToken(r.qr_token);
                      setModalMeta({ name: r.customer_name, slot: r.slots?.name, guests: r.guest_count });
                      setModalOpen(true);
                    }} className="inline-flex items-center gap-1 rounded-lg bg-aqua/15 px-3 py-2 text-xs font-semibold text-aqua hover:bg-aqua/25">
                      <QrCode className="h-3.5 w-3.5" /> Reprint
                    </button>
                    <Link to="/pass/$token" params={{ token: r.qr_token }} target="_blank"
                      className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-2 text-xs font-semibold text-primary">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </main>

      {/* === Sticky primary action bar === */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="hidden min-w-0 flex-1 sm:block">
            {slot ? (
              <div className="truncate">
                <div className="truncate text-xs text-muted-foreground">{slot.name}</div>
                <div className="truncate font-semibold">{name || "—"} · {guests}g</div>
              </div>
            ) : <span className="text-xs text-muted-foreground">Select a slot to continue</span>}
          </div>
          <button
            type="button" onClick={onReview} disabled={blocked}
            className="group relative inline-flex h-14 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-sunset text-base font-bold text-foreground shadow-glow-sunset transition disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-8"
          >
            <Sparkles className="h-5 w-5" />
            <span>{blocked ? blockReason : "Review & Confirm"}</span>
            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            <span className="absolute inset-0 animate-shimmer opacity-50" />
          </button>
        </div>
      </div>

      {/* === Confirmation modal === */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md border-0 bg-transparent p-0 shadow-none">
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

function Section({ icon, title, trailing, children }: {
  icon: React.ReactNode; title: string; trailing?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl glass-strong p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-aqua/15 text-aqua">{icon}</div>
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
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {presets.map((n) => (
            <button key={n} type="button" onClick={() => setG(n)}
              className={`h-10 min-w-[52px] rounded-xl px-3 text-sm font-bold tabular-nums transition ${
                guests === n ? "bg-aqua text-primary-foreground shadow-glow-aqua" :
                "bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              }`}>
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
