"use server";

import { z } from "zod";
import { getAuthContext } from "@/lib/server-auth";
import { getSupabaseAdminClientOrNull, supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: Awaited<ReturnType<typeof getAuthContext>>["supabase"], userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

async function adminContext() {
  const ctx = await getAuthContext();
  await assertAdmin(ctx.supabase, ctx.userId);
  return ctx;
}

// ===== Events =====
export async function adminListEvents() {
  const { supabase } = await adminContext();
  const { data } = await supabase.from("events").select("*").order("event_date", { ascending: false });
  return { events: data ?? [] };
}

const eventSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  start_date: z.string(),
  end_date: z.string(),
  is_active: z.boolean(),
});

export async function adminUpsertEvent(input: z.infer<typeof eventSchema>) {
  const data = eventSchema.parse(input);
  const { supabase } = await adminContext();
  const payload = {
    name: data.name,
    event_date: data.start_date,
    start_date: data.start_date,
    end_date: data.end_date,
    is_active: data.is_active,
  };
  if (data.id) {
    await supabase.from("events").update(payload).eq("id", data.id);
  } else {
    await supabase.from("events").insert(payload);
  }
  return { ok: true };
}

export async function adminDeleteEvent(input: { id: string }) {
  const data = z.object({ id: z.string().uuid() }).parse(input);
  const { supabase } = await adminContext();
  await supabase.from("events").delete().eq("id", data.id);
  return { ok: true };
}

// ===== Slots =====
export async function adminListSlots() {
  const { supabase } = await adminContext();
  const { data } = await supabase.from("slots").select("*, events(name, event_date)").order("starts_at", { ascending: false });
  return { slots: data ?? [] };
}

const slotSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  starts_at: z.string(),
  ends_at: z.string(),
  capacity: z.number().int().min(1).max(100000),
});

export async function adminUpsertSlot(input: z.infer<typeof slotSchema>) {
  const data = slotSchema.parse(input);
  const { supabase } = await adminContext();
  if (data.id) {
    await supabase.from("slots").update({
      event_id: data.event_id, name: data.name, starts_at: data.starts_at, ends_at: data.ends_at, capacity: data.capacity,
    }).eq("id", data.id);
  } else {
    await supabase.from("slots").insert({
      event_id: data.event_id, name: data.name, starts_at: data.starts_at, ends_at: data.ends_at, capacity: data.capacity,
    });
  }
  return { ok: true };
}

export async function adminDeleteSlot(input: { id: string }) {
  const data = z.object({ id: z.string().uuid() }).parse(input);
  const { supabase } = await adminContext();
  await supabase.from("slots").delete().eq("id", data.id);
  return { ok: true };
}

const generateSlotsSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.number().int().min(1).max(100000),
  recurrence: z.enum(["once", "daily", "weekly", "monthly"]),
  weekday: z.number().int().min(0).max(6).optional(),
});

export async function adminGenerateSlots(input: z.infer<typeof generateSlotsSchema>) {
  const data = generateSlotsSchema.parse(input);
  const { supabase } = await adminContext();
  const { data: ev } = await supabase.from("events").select("start_date, end_date").eq("id", data.event_id).maybeSingle();
  if (!ev) throw new Error("Event not found");
  const start = new Date(ev.start_date + "T00:00:00");
  const end = new Date(ev.end_date + "T00:00:00");
  const dates: string[] = [];
  const cursor = new Date(start);
  const monthAnchorDay = start.getDate();
  while (cursor <= end) {
    let include = false;
    if (data.recurrence === "once") {
      include = cursor.getTime() === start.getTime();
    } else if (data.recurrence === "daily") {
      include = true;
    } else if (data.recurrence === "weekly") {
      include = data.weekday != null ? cursor.getDay() === data.weekday : cursor.getDay() === start.getDay();
    } else if (data.recurrence === "monthly") {
      include = cursor.getDate() === monthAnchorDay;
    }
    if (include) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
    if (data.recurrence === "once") break;
  }
  const rows = dates.map((d) => ({
    event_id: data.event_id,
    name: data.name,
    starts_at: new Date(`${d}T${data.start_time}:00`).toISOString(),
    ends_at: new Date(`${d}T${data.end_time}:00`).toISOString(),
    capacity: data.capacity,
  }));
  if (rows.length === 0) throw new Error("No matching dates in event range");
  const { error } = await supabase.from("slots").insert(rows);
  if (error) throw new Error(error.message);
  return { ok: true, count: rows.length };
}

// ===== Registrations =====
export async function adminListRegistrations() {
  const { supabase } = await adminContext();
  const { data } = await supabase
    .from("registrations")
    .select("id, customer_name, mobile, email, guest_count, status, created_at, qr_token, slots(name)")
    .order("created_at", { ascending: false })
    .limit(500);
  return { registrations: data ?? [] };
}

// ===== Settings =====
export async function adminGetSettings() {
  const { supabase } = await adminContext();
  const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
  return { settings: data };
}

export async function adminSaveSettings(input: { scandit_api_key?: string | null; scandit_enabled: boolean }) {
  const data = z.object({
    scandit_api_key: z.string().max(5000).optional().nullable(),
    scandit_enabled: z.boolean(),
  }).parse(input);
  const { supabase } = await adminContext();
  await supabase.from("app_settings").update({
    scandit_api_key: data.scandit_api_key ?? null,
    scandit_enabled: data.scandit_enabled,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  return { ok: true };
}

// ===== Users / roles =====
export async function adminListUsers() {
  const { supabase } = await adminContext();
  const admin = getSupabaseAdminClientOrNull();

  type ListedUser = { id: string; email: string; created_at: string };
  let users: ListedUser[] = [];

  if (admin) {
    const { data: authList, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (listError) throw new Error(listError.message);
    users = (authList?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at ?? new Date().toISOString(),
    }));
  }

  // Fallback when service role key is missing: read profiles (admin RLS allows all rows)
  if (users.length === 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, created_at")
      .order("created_at", { ascending: false });
    if (profileError) throw new Error(profileError.message);
    users = (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email ?? "",
      created_at: p.created_at,
    }));
  }

  const { data: rolesData, error: rolesError } = await supabase.from("user_roles").select("user_id, role");
  if (rolesError) throw new Error(rolesError.message);

  const rolesByUser: Record<string, string[]> = {};
  (rolesData ?? []).forEach((r: { user_id: string; role: string }) => {
    rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role];
  });

  return {
    users: users.map((u) => ({
      ...u,
      roles: rolesByUser[u.id] ?? [],
    })),
  };
}

const createUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  role: z.enum(["admin", "dashboard", "pos", "scanner"]),
});

export async function adminCreateUser(input: {
  email: string;
  password: string;
  role: "admin" | "dashboard" | "pos" | "scanner";
}) {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(". "));
  }
  const data = parsed.data;
  const { supabase } = await adminContext();
  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    throw new Error(
      "Cannot create users without SUPABASE_SERVICE_ROLE_KEY. Add the secret key from Supabase → Settings → API to .env, then restart the dev server.",
    );
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });
  if (error || !created.user) throw new Error(error?.message || "Failed to create user");

  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: created.user.id, role: data.role });
  if (roleError) throw new Error(roleError.message);

  return { ok: true, user_id: created.user.id };
}

export async function adminSetRole(input: {
  user_id: string;
  role: "admin" | "dashboard" | "pos" | "scanner";
  enabled: boolean;
}) {
  const data = z.object({
    user_id: z.string().uuid(),
    role: z.enum(["admin", "dashboard", "pos", "scanner"]),
    enabled: z.boolean(),
  }).parse(input);
  await adminContext();
  if (data.enabled) {
    await supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
  } else {
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", data.role);
  }
  return { ok: true };
}

export async function adminDeleteUser(input: { user_id: string }) {
  const data = z.object({ user_id: z.string().uuid() }).parse(input);
  await adminContext();
  await supabaseAdmin.auth.admin.deleteUser(data.user_id);
  return { ok: true };
}

// ===== Reports =====
export async function adminReports() {
  const { supabase } = await adminContext();
  const [regs, scans] = await Promise.all([
    supabase.from("registrations").select("status, guest_count, created_at, slots(name)"),
    supabase.from("scan_events").select("mode, result, scanned_at"),
  ]);
  const totalReg = regs.data?.length ?? 0;
  const totalGuests = (regs.data ?? []).reduce((s: number, r: { guest_count: number }) => s + r.guest_count, 0);
  const byStatus: Record<string, number> = {};
  (regs.data ?? []).forEach((r: { status: string }) => { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1; });
  const totalScans = scans.data?.length ?? 0;
  const validScans = (scans.data ?? []).filter((s: { result: string }) => s.result === "valid").length;
  const invalidScans = totalScans - validScans;
  return { totalReg, totalGuests, byStatus, totalScans, validScans, invalidScans };
}
