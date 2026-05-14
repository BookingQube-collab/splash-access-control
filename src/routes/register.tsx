import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { getPublicEvent, publicRegister } from "@/lib/summersplash.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Waves, ArrowLeft, Users, Mail, Phone, User, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { BeachBg } from "@/components/beach-bg";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register — SummerSplash" },
      { name: "description", content: "Reserve your slot at SummerSplash and get an instant QR pass." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const fetchEvent = useServerFn(getPublicEvent);
  const register = useServerFn(publicRegister);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["public-event"], queryFn: () => fetchEvent() });

  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotId) { toast.error("Pick a slot first"); return; }
    setSubmitting(true);
    try {
      const res = await register({ data: { slot_id: slotId, customer_name: name.trim(), mobile: mobile.trim(), email: email.trim(), guest_count: guests } });
      navigate({ to: "/pass/$token", params: { token: res.qr_token } });
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
      refetch();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <BeachBg variant="ocean" />

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-primary" />
          <span className="font-display text-base font-bold">SummerSplash</span>
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-20">
        {isLoading ? (
          <div className="grid place-items-center py-24">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : !data?.event ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl glass p-10 text-center">
            <p className="text-muted-foreground">No active event right now. Check back soon. 🌊</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* Event hero */}
            <div className="overflow-hidden rounded-3xl glass-strong p-8 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-aqua">
                {format(new Date(data.event.event_date), "EEEE · MMMM d, yyyy")}
              </p>
              <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">
                {data.event.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">Pick a slot, fill in details, get your glowing pass.</p>
            </div>

            {/* Slots */}
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Pick a slot</h2>
                <span className="text-xs text-muted-foreground">{data.slots.length} available</span>
              </div>
              {data.slots.length === 0 ? (
                <div className="rounded-2xl glass p-6 text-sm text-muted-foreground">No slots configured yet.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.slots.map((s, i) => {
                    const full = s.remaining <= 0;
                    const selected = slotId === s.id;
                    const pct = Math.min(100, Math.round(((s.capacity - s.remaining) / Math.max(1, s.capacity)) * 100));
                    return (
                      <motion.button
                        key={s.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={!full ? { y: -3 } : {}}
                        type="button"
                        disabled={full}
                        onClick={() => setSlotId(s.id)}
                        className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all ${
                          selected
                            ? "glass-strong shadow-glow-aqua ring-1 ring-primary"
                            : "glass hover:shadow-glow-aqua"
                        } ${full ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        {selected && (
                          <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <div className="font-display text-lg font-bold">{s.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {format(new Date(s.starts_at), "p")} – {format(new Date(s.ends_at), "p")}
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs">
                            {full ? (
                              <span className="font-bold uppercase tracking-wider text-coral">Sold out</span>
                            ) : (
                              <>
                                <span className="text-muted-foreground">Capacity</span>
                                <span className="font-semibold"><b>{s.remaining}</b> / {s.capacity} left</span>
                              </>
                            )}
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                              className={`h-full rounded-full ${full ? "bg-coral" : "bg-gradient-to-r from-aqua to-primary"}`}
                            />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Form */}
            <AnimatePresence>
              {slotId && (
                <motion.form
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  onSubmit={onSubmit}
                  className="mt-8 overflow-hidden rounded-3xl glass-strong p-7 shadow-soft"
                >
                  <h2 className="font-display text-lg font-semibold">Your details</h2>
                  <div className="mt-5 space-y-4">
                    <Field icon={<User className="h-4 w-4" />} label="Full name">
                      <Input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)}
                        className="border-0 bg-foreground/5 backdrop-blur" placeholder="Maya Rivera" />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field icon={<Phone className="h-4 w-4" />} label="Mobile">
                        <Input required maxLength={20} value={mobile} onChange={(e) => setMobile(e.target.value)}
                          className="border-0 bg-foreground/5 backdrop-blur" placeholder="+1 555 123 4567" />
                      </Field>
                      <Field icon={<Users className="h-4 w-4" />} label="Guests">
                        <Input type="number" min={1} max={20} value={guests} onChange={(e) => setGuests(Number(e.target.value))}
                          className="border-0 bg-foreground/5 backdrop-blur" />
                      </Field>
                    </div>
                    <Field icon={<Mail className="h-4 w-4" />} label="Email (optional)">
                      <Input type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)}
                        className="border-0 bg-foreground/5 backdrop-blur" placeholder="you@summer.com" />
                    </Field>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !slotId}
                    className="mt-6 group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-sunset py-4 font-semibold text-foreground shadow-glow-sunset disabled:opacity-50"
                  >
                    <span className="relative z-10">{submitting ? "Reserving your spot…" : "Get my QR pass"}</span>
                    <ChevronRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    <span className="absolute inset-0 animate-shimmer opacity-60" />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </Label>
      {children}
    </div>
  );
}
