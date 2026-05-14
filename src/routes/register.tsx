import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { format } from "date-fns";
import { getPublicEvent, publicRegister } from "@/lib/summersplash.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Waves } from "lucide-react";
import { toast } from "sonner";

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
    if (!slotId) { toast.error("Pick a slot"); return; }
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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent/30">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <Waves className="h-6 w-6 text-primary" />
          <span className="font-display text-lg font-bold">SummerSplash</span>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20">
        {isLoading ? (
          <p className="text-center text-muted-foreground">Loading event…</p>
        ) : !data?.event ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No active event right now. Check back soon.</CardContent></Card>
        ) : (
          <>
            <Card className="mb-6 border-primary/30 bg-card/80 backdrop-blur">
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">{format(new Date(data.event.event_date), "EEEE, MMMM d, yyyy")}</p>
                <CardTitle className="font-display text-3xl">{data.event.name}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Pick a slot</CardTitle></CardHeader>
              <CardContent>
                {data.slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No slots configured yet.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.slots.map((s) => {
                      const full = s.remaining <= 0;
                      const selected = slotId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={full}
                          onClick={() => setSlotId(s.id)}
                          className={`rounded-xl border p-4 text-left transition ${selected ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border hover:border-primary/50"} ${full ? "cursor-not-allowed opacity-50" : ""}`}
                        >
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(s.starts_at), "p")} – {format(new Date(s.ends_at), "p")}
                          </div>
                          <div className="mt-2 text-sm">
                            {full ? <span className="text-destructive font-semibold">Sold out</span> : <span><b>{s.remaining}</b> of {s.capacity} left</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <form onSubmit={onSubmit} className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Your details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="mobile">Mobile</Label>
                      <Input id="mobile" required maxLength={20} value={mobile} onChange={(e) => setMobile(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="email">Email (optional)</Label>
                      <Input id="email" type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="guests">Number of guests</Label>
                    <Input id="guests" type="number" min={1} max={20} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={submitting || !slotId}>
                    {submitting ? "Reserving…" : "Get my QR pass"}
                  </Button>
                </CardContent>
              </Card>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
