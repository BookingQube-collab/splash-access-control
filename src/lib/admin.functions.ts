import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

// ===== Events =====
export const adminListEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase.from("events").select("*").order("event_date", { ascending: false });
    return { events: data ?? [] };
  });

export const adminUpsertEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(120),
    start_date: z.string(),
    end_date: z.string(),
    is_active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const payload = {
      name: data.name,
      event_date: data.start_date,
      start_date: data.start_date,
      end_date: data.end_date,
      is_active: data.is_active,
    };
    if (data.id) {
      await context.supabase.from("events").update(payload).eq("id", data.id);
    } else {
      await context.supabase.from("events").insert(payload);
    }
    return { ok: true };
  });

export const adminDeleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await context.supabase.from("events").delete().eq("id", data.id);
    return { ok: true };
  });

// ===== Slots =====
export const adminListSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase.from("slots").select("*, events(name, event_date)").order("starts_at", { ascending: false });
    return { slots: data ?? [] };
  });

export const adminUpsertSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    event_id: z.string().uuid(),
    name: z.string().min(1).max(120),
    starts_at: z.string(),
    ends_at: z.string(),
    capacity: z.number().int().min(1).max(100000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id) {
      await context.supabase.from("slots").update({
        event_id: data.event_id, name: data.name, starts_at: data.starts_at, ends_at: data.ends_at, capacity: data.capacity,
      }).eq("id", data.id);
    } else {
      await context.supabase.from("slots").insert({
        event_id: data.event_id, name: data.name, starts_at: data.starts_at, ends_at: data.ends_at, capacity: data.capacity,
      });
    }
    return { ok: true };
  });

export const adminDeleteSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await context.supabase.from("slots").delete().eq("id", data.id);
    return { ok: true };
  });

// ===== Registrations =====
export const adminListRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("registrations")
      .select("id, customer_name, mobile, email, guest_count, status, created_at, qr_token, slots(name)")
      .order("created_at", { ascending: false })
      .limit(500);
    return { registrations: data ?? [] };
  });

// ===== Settings =====
export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
    return { settings: data };
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    scandit_api_key: z.string().max(500).optional().nullable(),
    scandit_enabled: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await context.supabase.from("app_settings").update({
      scandit_api_key: data.scandit_api_key ?? null,
      scandit_enabled: data.scandit_enabled,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    return { ok: true };
  });

// ===== Users / roles =====
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    // Use admin client to list users (auth schema requires service role)
    const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const users = authList?.users ?? [];
    const { data: rolesData } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const rolesByUser: Record<string, string[]> = {};
    (rolesData ?? []).forEach((r: { user_id: string; role: string }) => {
      rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role];
    });
    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        roles: rolesByUser[u.id] ?? [],
      })),
    };
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    email: z.string().email(),
    password: z.string().min(6).max(72),
    role: z.enum(["admin", "dashboard", "pos", "scanner"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message || "Failed to create user");
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    return { ok: true };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    user_id: z.string().uuid(),
    role: z.enum(["admin", "dashboard", "pos", "scanner"]),
    enabled: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.enabled) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", data.role);
    }
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    return { ok: true };
  });

// ===== Reports =====
export const adminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [regs, scans] = await Promise.all([
      context.supabase.from("registrations").select("status, guest_count, created_at, slots(name)"),
      context.supabase.from("scan_events").select("mode, result, scanned_at"),
    ]);
    const totalReg = regs.data?.length ?? 0;
    const totalGuests = (regs.data ?? []).reduce((s: number, r: any) => s + r.guest_count, 0);
    const byStatus: Record<string, number> = {};
    (regs.data ?? []).forEach((r: any) => { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1; });
    const totalScans = scans.data?.length ?? 0;
    const validScans = (scans.data ?? []).filter((s: any) => s.result === "valid").length;
    const invalidScans = totalScans - validScans;
    return { totalReg, totalGuests, byStatus, totalScans, validScans, invalidScans };
  });
