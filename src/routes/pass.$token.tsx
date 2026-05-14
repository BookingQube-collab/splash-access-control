import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { getPass } from "@/lib/summersplash.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Waves, CheckCircle2, XCircle, LogIn, LogOut } from "lucide-react";

export const Route = createFileRoute("/pass/$token")({
  head: () => ({ meta: [{ title: "Your SummerSplash pass" }] }),
  component: PassPage,
});

function PassPage() {
  const { token } = Route.useParams();
  const fetchPass = useServerFn(getPass);
  const { data, isLoading } = useQuery({
    queryKey: ["pass", token],
    queryFn: () => fetchPass({ data: { token } }),
    refetchInterval: 10000,
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  if (!data) return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="max-w-md text-center">
        <CardContent className="py-10">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <p className="mt-4 font-semibold">Pass not found</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary underline">Go home</Link>
        </CardContent>
      </Card>
    </div>
  );

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    Active: { color: "bg-primary text-primary-foreground", icon: <CheckCircle2 className="h-4 w-4" />, label: "Active" },
    Inside: { color: "bg-success text-success-foreground", icon: <LogIn className="h-4 w-4" />, label: "Checked in" },
    Exited: { color: "bg-muted text-muted-foreground", icon: <LogOut className="h-4 w-4" />, label: "Exited" },
    Expired: { color: "bg-destructive text-destructive-foreground", icon: <XCircle className="h-4 w-4" />, label: "Expired — slot ended" },
  };
  const cfg = statusConfig[data.liveStatus] ?? statusConfig.Active;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent/30 px-4 py-10">
      <div className="mx-auto max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <Waves className="h-6 w-6 text-primary" />
          <span className="font-display text-lg font-bold">SummerSplash</span>
        </Link>
        <Card className="overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-90">{data.event_name}</p>
            <h1 className="mt-1 font-display text-3xl font-bold">{data.customer_name}</h1>
            <p className="mt-1 text-sm opacity-90">{format(new Date(data.event_date), "EEE, MMM d, yyyy")} · {data.slot_name}</p>
          </div>
          <CardContent className="p-6">
            <div className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${cfg.color}`}>
              {cfg.icon}{cfg.label}
            </div>
            <div className="flex justify-center rounded-xl bg-white p-6">
              <QRCodeSVG value={data.qr_token} size={220} level="H" />
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Registration ID</dt>
                <dd className="font-mono text-xs">{data.id.slice(0, 8).toUpperCase()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Guests</dt>
                <dd className="font-semibold">{data.guest_count}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Slot starts</dt>
                <dd>{format(new Date(data.slot_starts_at), "p")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Slot ends</dt>
                <dd>{format(new Date(data.slot_ends_at), "p")}</dd>
              </div>
            </dl>
            <p className="mt-6 text-center text-xs text-muted-foreground">Show this QR at the entry. Status updates live.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
