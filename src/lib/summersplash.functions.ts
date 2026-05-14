import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ PUBLIC: list current event + slots with remaining capacity ============
export const getPublicEvent = createServerFn({ method: "GET" }).handler(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("is_active", true)
    .eq("event_date", today)
    .maybeSingle();

  if (!event) {
    // fallback: most recent active
    const { data: fallback } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("is_active", true)
      .order("event_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!fallback) return { event: null, slots: [] };
    return loadSlots(fallback);
  }
  return loadSlots(event);
});

async function loadSlots(event: { id: string; name: string; event_date: string }) {
  const { data: slots } = await supabaseAdmin
    .from("slots")
    .select("*")
    .eq("event_id", event.id)
    .order("starts_at", { ascending: true });

  const result = await Promise.all(
    (slots ?? []).map(async (s) => {
      const { data: regs } = await supabaseAdmin
        .from("registrations")
        .select("guest_count")
        .eq("slot_id", s.id)
        .in("status", ["active", "entered"]);
      const used = (regs ?? []).reduce((sum, r: any) => sum + (r.guest_count ?? 1), 0);
      return { ...s, registered: used, remaining: Math.max(0, s.capacity - used) };
    })
  );
  return { event, slots: result };
}

// Sum of guest_count for a slot in active/entered status
async function sumGuests(client: any, slotId: string) {
  const { data } = await client
    .from("registrations")
    .select("guest_count")
    .eq("slot_id", slotId)
    .in("status", ["active", "entered"]);
  return (data ?? []).reduce((sum: number, r: any) => sum + (r.guest_count ?? 1), 0);
}

// ============ PUBLIC: register a customer ============
const registerSchema = z.object({
  slot_id: z.string().uuid(),
  customer_name: z.string().trim().min(1).max(120),
  mobile: z.string().trim().min(7).max(20),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  guest_count: z.number().int().min(1).max(20),
});

export const publicRegister = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => registerSchema.parse(d))
  .handler(async ({ data }) => {
    // capacity check
    const { data: slot } = await supabaseAdmin.from("slots").select("*").eq("id", data.slot_id).maybeSingle();
    if (!slot) throw new Error("Slot not found");

    // dedup: same slot + mobile within last 30s — return the existing one
    const since = new Date(Date.now() - 30_000).toISOString();
    const { data: dupe } = await supabaseAdmin
      .from("registrations")
      .select("id, qr_token")
      .eq("slot_id", data.slot_id)
      .eq("mobile", data.mobile)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (dupe) return { id: dupe.id, qr_token: dupe.qr_token };

    const used = await sumGuests(supabaseAdmin, data.slot_id);
    if (used + data.guest_count > slot.capacity) {
      throw new Error("Slot is full");
    }

    const { data: reg, error } = await supabaseAdmin
      .from("registrations")
      .insert({
        slot_id: data.slot_id,
        customer_name: data.customer_name,
        mobile: data.mobile,
        email: data.email || null,
        guest_count: data.guest_count,
      })
      .select("id, qr_token")
      .single();
    if (error) throw new Error(error.message);
    return { id: reg.id, qr_token: reg.qr_token };
  });

// ============ PUBLIC: get pass by token ============
export const getPass = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("*, slots(*, events(*))")
      .eq("qr_token", data.token)
      .maybeSingle();
    if (!reg) return null;
    const slot = reg.slots as { name: string; starts_at: string; ends_at: string; events: { name: string; event_date: string } };
    const now = new Date();
    const ended = new Date(slot.ends_at) < now;
    const liveStatus =
      reg.status === "exited" || reg.status === "auto_exited"
        ? "Exited"
        : reg.status === "expired" || (ended && reg.status !== "entered")
        ? "Expired"
        : reg.status === "entered"
        ? "Inside"
        : ended
        ? "Expired"
        : "Active";
    return {
      id: reg.id,
      customer_name: reg.customer_name,
      mobile: reg.mobile,
      guest_count: reg.guest_count,
      qr_token: reg.qr_token,
      status: reg.status,
      liveStatus,
      slot_name: slot.name,
      slot_starts_at: slot.starts_at,
      slot_ends_at: slot.ends_at,
      event_name: slot.events.name,
      event_date: slot.events.event_date,
    };
  });

// ============ STAFF: dashboard counts ============
export const getDashboardCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: events } = await supabase.from("events").select("*").eq("is_active", true).eq("event_date", today);
    const evs = events ?? [];
    if (evs.length === 0) return { slots: [] };
    const eventIds = evs.map((e) => e.id);
    const { data: slots } = await supabase.from("slots").select("*").in("event_id", eventIds).order("starts_at");
    const result = await Promise.all(
      (slots ?? []).map(async (s) => {
        const [activeRows, enteredRows, exitedRows, autoExitedRows, invalid] = await Promise.all([
          supabase.from("registrations").select("guest_count").eq("slot_id", s.id).eq("status", "active"),
          supabase.from("registrations").select("guest_count").eq("slot_id", s.id).eq("status", "entered"),
          supabase.from("registrations").select("guest_count").eq("slot_id", s.id).eq("status", "exited"),
          supabase.from("registrations").select("guest_count").eq("slot_id", s.id).eq("status", "auto_exited"),
          supabase.from("scan_events").select("*", { count: "exact", head: true }).eq("slot_id", s.id).eq("result", "invalid"),
        ]);
        const sumG = (rows: any) => (rows.data ?? []).reduce((a: number, r: any) => a + (r.guest_count ?? 1), 0);
        const active = sumG(activeRows);
        const entered = sumG(enteredRows);
        const exited = sumG(exitedRows);
        const auto_exited = sumG(autoExitedRows);
        const used = active + entered;
        const booked = active + entered + exited + auto_exited;
        return {
          id: s.id,
          name: s.name,
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          capacity: s.capacity,
          active,
          entered,
          exited,
          auto_exited,
          booked,
          invalid: invalid.count ?? 0,
          remaining: Math.max(0, s.capacity - used),
        };
      })
    );
    return { slots: result };
  });

// ============ SCANNER ============
const scanSchema = z.object({
  qr_token: z.string().min(1).max(200),
  mode: z.enum(["entry", "exit"]),
});

export const scanQR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scanSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // try to parse as uuid
    const tokenMatch = data.qr_token.match(/[0-9a-fA-F-]{36}/);
    const token = tokenMatch ? tokenMatch[0] : data.qr_token;

    const { data: reg } = await supabase
      .from("registrations")
      .select("*, slots(*)")
      .eq("qr_token", token)
      .maybeSingle();

    if (!reg) {
      await supabase.from("scan_events").insert({ mode: data.mode, result: "invalid", reason: "Token not found", scanner_user_id: userId });
      return { valid: false, reason: "Invalid QR — not found" };
    }
    const slot = reg.slots as { id: string; name: string; starts_at: string; ends_at: string };
    const now = new Date();
    const ended = new Date(slot.ends_at) < now;

    if (data.mode === "entry") {
      if (ended) {
        await supabase.from("scan_events").insert({ registration_id: reg.id, slot_id: slot.id, mode: "entry", result: "invalid", reason: "Slot ended", scanner_user_id: userId });
        return { valid: false, reason: "Slot has ended", customer: reg.customer_name };
      }
      if (reg.status === "entered") {
        await supabase.from("scan_events").insert({ registration_id: reg.id, slot_id: slot.id, mode: "entry", result: "invalid", reason: "Already inside", scanner_user_id: userId });
        return { valid: false, reason: "Already entered", customer: reg.customer_name };
      }
      if (reg.status === "exited" || reg.status === "auto_exited") {
        await supabase.from("scan_events").insert({ registration_id: reg.id, slot_id: slot.id, mode: "entry", result: "invalid", reason: "Already exited", scanner_user_id: userId });
        return { valid: false, reason: "Already exited", customer: reg.customer_name };
      }
      await supabase.from("registrations").update({ status: "entered", entered_at: new Date().toISOString() }).eq("id", reg.id);
      await supabase.from("scan_events").insert({ registration_id: reg.id, slot_id: slot.id, mode: "entry", result: "valid", scanner_user_id: userId });
      return { valid: true, reason: "Welcome!", customer: reg.customer_name, slot: slot.name, guests: reg.guest_count };
    } else {
      if (reg.status !== "entered") {
        await supabase.from("scan_events").insert({ registration_id: reg.id, slot_id: slot.id, mode: "exit", result: "invalid", reason: "Not inside", scanner_user_id: userId });
        return { valid: false, reason: "Guest is not inside", customer: reg.customer_name };
      }
      await supabase.from("registrations").update({ status: "exited", exited_at: new Date().toISOString() }).eq("id", reg.id);
      await supabase.from("scan_events").insert({ registration_id: reg.id, slot_id: slot.id, mode: "exit", result: "valid", scanner_user_id: userId });
      return { valid: true, reason: "Exit recorded", customer: reg.customer_name };
    }
  });

export const getScanditConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("app_settings").select("scandit_enabled, scandit_api_key").eq("id", 1).maybeSingle();
    return { enabled: !!data?.scandit_enabled, key: data?.scandit_api_key ?? "" };
  });

// ============ POS ============
export const posRegister = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => registerSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: slot } = await context.supabase.from("slots").select("*").eq("id", data.slot_id).maybeSingle();
    if (!slot) throw new Error("Slot not found");
    // dedup: same slot + mobile within last 30s — return existing
    const since = new Date(Date.now() - 30_000).toISOString();
    const { data: dupe } = await context.supabase
      .from("registrations")
      .select("id, qr_token")
      .eq("slot_id", data.slot_id)
      .eq("mobile", data.mobile)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (dupe) return { id: dupe.id, qr_token: dupe.qr_token };

    const used = await sumGuests(context.supabase, data.slot_id);
    if (used + data.guest_count > slot.capacity) throw new Error("Slot is full");

    const { data: reg, error } = await context.supabase.from("registrations").insert({
      slot_id: data.slot_id,
      customer_name: data.customer_name,
      mobile: data.mobile,
      email: data.email || null,
      guest_count: data.guest_count,
    }).select("id, qr_token").single();
    if (error) throw new Error(error.message);
    return { id: reg.id, qr_token: reg.qr_token };
  });

export const searchByMobile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mobile: z.string().min(3).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: regs } = await context.supabase
      .from("registrations")
      .select("id, customer_name, mobile, guest_count, qr_token, status, created_at, slots(name, starts_at)")
      .ilike("mobile", `%${data.mobile}%`)
      .order("created_at", { ascending: false })
      .limit(20);
    return { results: regs ?? [] };
  });
