import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { getPublicEvent, posRegister, searchByMobile } from "@/lib/summersplash.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotId) return toast.error("Pick a slot");
    try {
      const res = await register({ data: { slot_id: slotId, customer_name: name.trim(), mobile: mobile.trim(), email: email.trim(), guest_count: guests } });
      toast.success("Registered");
      window.open(`/pass/${res.qr_token}`, "_blank");
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
    <div className="mx-auto max-w-6xl grid gap-6 px-6 py-8 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>New Registration</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Slot</Label>
              <div className="grid grid-cols-2 gap-2">
                {(data?.slots ?? []).map((s) => (
                  <button type="button" key={s.id} onClick={() => setSlotId(s.id)} disabled={s.remaining <= 0}
                    className={`rounded-lg border p-2 text-left text-sm ${slotId === s.id ? "border-primary bg-primary/10" : ""} ${s.remaining <= 0 ? "opacity-50" : ""}`}>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.remaining}/{s.capacity} left</div>
                  </button>
                ))}
              </div>
            </div>
            <div><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Mobile</Label><Input required value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
              <div><Label>Guests</Label><Input type="number" min={1} max={20} value={guests} onChange={(e) => setGuests(Number(e.target.value))} /></div>
            </div>
            <div><Label>Email (optional)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <Button type="submit" className="w-full">Register & Generate QR</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Search by Mobile (Reprint)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Mobile number" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Button onClick={doSearch}>Search</Button>
          </div>
          <div className="mt-4 space-y-2">
            {results.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded border p-3 text-sm">
                <div>
                  <div className="font-semibold">{r.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{r.mobile} · {r.slots?.name} · {r.guest_count} guests · {r.status}</div>
                </div>
                <Link to="/pass/$token" params={{ token: r.qr_token }} target="_blank" className="text-primary text-xs underline">Reprint</Link>
              </div>
            ))}
            {results.length === 0 && <p className="text-sm text-muted-foreground">No results yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
