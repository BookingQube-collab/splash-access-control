import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { getDashboardCounts } from "@/lib/summersplash.functions";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

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
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="font-display text-3xl font-bold">Live Occupancy</h1>
      <p className="text-sm text-muted-foreground">Auto-refreshing every 5s</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(data?.slots ?? []).map((s) => (
          <Card key={s.id}>
            <CardContent className="p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                <span className="text-xs text-muted-foreground">{format(new Date(s.starts_at), "p")}–{format(new Date(s.ends_at), "p")}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Stat label="Capacity" value={s.capacity} />
                <Stat label="Remaining" value={s.remaining} highlight />
                <Stat label="Active (not yet in)" value={s.active} />
                <Stat label="Inside" value={s.entered} />
                <Stat label="Exited" value={s.exited} />
                <Stat label="Auto-exited" value={s.auto_exited} />
                <Stat label="Invalid scans" value={s.invalid} danger />
              </div>
            </CardContent>
          </Card>
        ))}
        {data?.slots.length === 0 && <p className="text-muted-foreground">No active slots today.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight, danger }: { label: string; value: number; highlight?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-primary/10" : danger ? "bg-destructive/10" : "bg-muted"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${highlight ? "text-primary" : danger ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
