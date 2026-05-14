import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  adminListEvents, adminUpsertEvent, adminDeleteEvent,
  adminListSlots, adminUpsertSlot, adminDeleteSlot,
  adminListRegistrations,
  adminGetSettings, adminSaveSettings,
  adminListUsers, adminCreateUser, adminSetRole, adminDeleteUser,
  adminReports,
} from "@/lib/admin.functions";
import { getDashboardCounts } from "@/lib/summersplash.functions";

export const Route = createFileRoute("/admin")({
  component: () => (<RoleGuard role="admin" loginPath="/login/admin"><Admin /></RoleGuard>),
});

function Admin() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <h1 className="mb-4 font-display text-3xl font-bold">Admin Panel</h1>
      <Tabs defaultValue="events">
        <TabsList className="flex-wrap">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="slots">Slots</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
          <TabsTrigger value="dashboard">Live Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="events"><EventsTab /></TabsContent>
        <TabsContent value="slots"><SlotsTab /></TabsContent>
        <TabsContent value="registrations"><RegistrationsTab /></TabsContent>
        <TabsContent value="dashboard"><DashTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function EventsTab() {
  const list = useServerFn(adminListEvents); const upsert = useServerFn(adminUpsertEvent); const del = useServerFn(adminDeleteEvent);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["a-events"], queryFn: () => list() });
  const [name, setName] = useState("SummerSplash"); const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const m = useMutation({ mutationFn: () => upsert({ data: { name, event_date: date, is_active: true } }), onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["a-events"] }); } });
  return (
    <Card><CardHeader><CardTitle>Events</CardTitle></CardHeader><CardContent>
      <div className="mb-4 flex gap-2">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button onClick={() => m.mutate()}>Add</Button>
      </div>
      <div className="space-y-2">
        {(data?.events ?? []).map((e: any) => (
          <div key={e.id} className="flex items-center justify-between rounded border p-3">
            <div><div className="font-semibold">{e.name}</div><div className="text-xs text-muted-foreground">{format(new Date(e.event_date), "PP")} · {e.is_active ? "Active" : "Inactive"}</div></div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={async () => { await upsert({ data: { id: e.id, name: e.name, event_date: e.event_date, is_active: !e.is_active } }); qc.invalidateQueries({ queryKey: ["a-events"] }); }}>{e.is_active ? "Deactivate" : "Activate"}</Button>
              <Button size="sm" variant="destructive" onClick={async () => { if (confirm("Delete?")) { await del({ data: { id: e.id } }); qc.invalidateQueries({ queryKey: ["a-events"] }); } }}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}

function SlotsTab() {
  const listE = useServerFn(adminListEvents); const list = useServerFn(adminListSlots);
  const upsert = useServerFn(adminUpsertSlot); const del = useServerFn(adminDeleteSlot);
  const qc = useQueryClient();
  const { data: events } = useQuery({ queryKey: ["a-events"], queryFn: () => listE() });
  const { data } = useQuery({ queryKey: ["a-slots"], queryFn: () => list() });
  const [eventId, setEventId] = useState(""); const [name, setName] = useState("");
  const [starts, setStarts] = useState(""); const [ends, setEnds] = useState(""); const [cap, setCap] = useState(50);
  const add = async () => {
    if (!eventId || !name || !starts || !ends) return toast.error("Fill all fields");
    await upsert({ data: { event_id: eventId, name, starts_at: new Date(starts).toISOString(), ends_at: new Date(ends).toISOString(), capacity: cap } });
    qc.invalidateQueries({ queryKey: ["a-slots"] }); toast.success("Saved");
  };
  return (
    <Card><CardHeader><CardTitle>Slots & Capacity</CardTitle></CardHeader><CardContent>
      <div className="mb-4 grid gap-2 md:grid-cols-6">
        <select className="rounded-md border bg-background px-2 py-2 text-sm" value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">Event…</option>
          {(events?.events ?? []).map((e: any) => <option key={e.id} value={e.id}>{e.name} · {e.event_date}</option>)}
        </select>
        <Input placeholder="Slot name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} />
        <Input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
        <Input type="number" min={1} value={cap} onChange={(e) => setCap(Number(e.target.value))} />
        <Button onClick={add}>Add slot</Button>
      </div>
      <div className="space-y-2">
        {(data?.slots ?? []).map((s: any) => (
          <div key={s.id} className="flex items-center justify-between rounded border p-3 text-sm">
            <div>
              <div className="font-semibold">{s.name} <span className="text-muted-foreground">— {s.events?.name}</span></div>
              <div className="text-xs text-muted-foreground">{format(new Date(s.starts_at), "PPp")} → {format(new Date(s.ends_at), "p")} · cap {s.capacity}</div>
            </div>
            <Button size="sm" variant="destructive" onClick={async () => { if (confirm("Delete?")) { await del({ data: { id: s.id } }); qc.invalidateQueries({ queryKey: ["a-slots"] }); } }}>Delete</Button>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}

function RegistrationsTab() {
  const list = useServerFn(adminListRegistrations);
  const { data } = useQuery({ queryKey: ["a-regs"], queryFn: () => list() });
  return (
    <Card><CardHeader><CardTitle>Registrations</CardTitle></CardHeader><CardContent>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="text-left text-muted-foreground"><th className="p-2">Name</th><th>Mobile</th><th>Slot</th><th>Guests</th><th>Status</th><th>When</th><th></th></tr></thead>
        <tbody>{(data?.registrations ?? []).map((r: any) => (
          <tr key={r.id} className="border-t"><td className="p-2 font-medium">{r.customer_name}</td><td>{r.mobile}</td><td>{r.slots?.name}</td><td>{r.guest_count}</td><td>{r.status}</td><td>{format(new Date(r.created_at), "PPp")}</td>
            <td><a href={`/pass/${r.qr_token}`} target="_blank" rel="noreferrer" className="text-primary underline">Pass</a></td></tr>
        ))}</tbody>
      </table></div>
    </CardContent></Card>
  );
}

function DashTab() {
  const fn = useServerFn(getDashboardCounts);
  const { data } = useQuery({ queryKey: ["a-dash"], queryFn: () => fn(), refetchInterval: 5000 });
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {(data?.slots ?? []).map((s) => (
        <Card key={s.id}><CardContent className="p-4">
          <div className="font-semibold">{s.name}</div>
          <div className="text-xs text-muted-foreground">{s.remaining}/{s.capacity} left</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>Inside: <b>{s.entered}</b></div><div>Active: <b>{s.active}</b></div>
            <div>Exited: <b>{s.exited}</b></div><div>Auto-exit: <b>{s.auto_exited}</b></div>
            <div className="col-span-2">Invalid scans: <b className="text-destructive">{s.invalid}</b></div>
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}

function ReportsTab() {
  const fn = useServerFn(adminReports);
  const { data } = useQuery({ queryKey: ["a-reports"], queryFn: () => fn() });
  if (!data) return null;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Total registrations</div><div className="text-3xl font-bold">{data.totalReg}</div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Total guests</div><div className="text-3xl font-bold">{data.totalGuests}</div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Scans (valid / invalid)</div><div className="text-3xl font-bold">{data.validScans} <span className="text-base text-destructive">/ {data.invalidScans}</span></div></CardContent></Card>
      <Card className="md:col-span-3"><CardContent className="p-5"><div className="text-sm font-semibold">By status</div>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">{Object.entries(data.byStatus).map(([k, v]) => <span key={k} className="rounded-full bg-muted px-3 py-1">{k}: <b>{v as number}</b></span>)}</div>
      </CardContent></Card>
    </div>
  );
}

function UsersTab() {
  const list = useServerFn(adminListUsers); const create = useServerFn(adminCreateUser);
  const setRole = useServerFn(adminSetRole); const delU = useServerFn(adminDeleteUser);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["a-users"], queryFn: () => list() });
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [role, setRoleV] = useState<"admin" | "dashboard" | "pos" | "scanner">("scanner");
  const allRoles: ("admin" | "dashboard" | "pos" | "scanner")[] = ["admin", "dashboard", "pos", "scanner"];
  return (
    <Card><CardHeader><CardTitle>Users & Roles</CardTitle></CardHeader><CardContent>
      <div className="mb-4 grid gap-2 md:grid-cols-4">
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <select className="rounded-md border bg-background px-2 py-2 text-sm" value={role} onChange={(e) => setRoleV(e.target.value as any)}>
          {allRoles.map((r) => <option key={r}>{r}</option>)}
        </select>
        <Button onClick={async () => { try { await create({ data: { email, password: pw, role } }); toast.success("Created"); setEmail(""); setPw(""); qc.invalidateQueries({ queryKey: ["a-users"] }); } catch (e: any) { toast.error(e.message); } }}>Create user</Button>
      </div>
      <div className="space-y-2">
        {(data?.users ?? []).map((u: any) => (
          <div key={u.id} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{u.email}</div>
              <Button size="sm" variant="destructive" onClick={async () => { if (confirm("Delete user?")) { await delU({ data: { user_id: u.id } }); qc.invalidateQueries({ queryKey: ["a-users"] }); } }}>Delete</Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {allRoles.map((r) => (
                <label key={r} className="flex items-center gap-1">
                  <input type="checkbox" checked={u.roles.includes(r)} onChange={async (e) => { await setRole({ data: { user_id: u.id, role: r, enabled: e.target.checked } }); qc.invalidateQueries({ queryKey: ["a-users"] }); }} />
                  {r}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </CardContent></Card>
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
    <Card><CardHeader><CardTitle>Scanner Settings</CardTitle></CardHeader><CardContent className="space-y-4 max-w-xl">
      <div>
        <Label>Scandit API Key</Label>
        <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={data?.settings?.scandit_api_key ? "•••• stored ••••" : "Paste API key"} />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div><div className="font-medium">Enable Scandit scanning</div><div className="text-xs text-muted-foreground">When off, scanner falls back to browser camera.</div></div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <Button onClick={async () => { await save({ data: { scandit_api_key: key || null, scandit_enabled: enabled } }); toast.success("Saved"); refetch(); }}>Save settings</Button>
    </CardContent></Card>
  );
}
