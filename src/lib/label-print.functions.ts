"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAuthContext } from "@/lib/server-auth";
import { buildEntryPassZpl } from "@/lib/zebra/zpl-builder";
import {
  DEFAULT_PRINTER_SETTINGS,
  type LabelPrintTemplate,
  type PrinterSettings,
} from "@/lib/zebra/types";
import { presetDefaultLayout } from "@/lib/zebra/presets";
import type { EntryPassLabelData } from "@/lib/zebra/types";
import { SAMPLE_LABEL_DATA } from "@/lib/zebra/sample-label-data";
import { passUrl } from "@/lib/public-url";
import { formatSlotTimeRange } from "@/lib/slot-time";

function requireAdmin() {
  return getAuthContext().then(async (ctx) => {
    const { data } = await ctx.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", ctx.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw new Error("Forbidden: admin only");
    return ctx;
  });
}

function db() {
  return supabaseAdmin;
}

function parsePrinterSettings(raw: unknown): PrinterSettings {
  const base = { ...DEFAULT_PRINTER_SETTINGS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  return {
    enabled: !!o.enabled,
    connection: o.connection === "network" ? "network" : "browser_print",
    network_host: typeof o.network_host === "string" ? o.network_host : "",
    network_port: typeof o.network_port === "number" ? o.network_port : 9100,
    label_width_in: typeof o.label_width_in === "number" ? o.label_width_in : base.label_width_in,
    label_height_in: typeof o.label_height_in === "number" ? o.label_height_in : base.label_height_in,
    dpi: o.dpi === 300 ? 300 : 203,
  };
}

function rowToTemplate(row: Record<string, unknown>): LabelPrintTemplate {
  return {
    id: String(row.id),
    name: String(row.name),
    preset_key: String(row.preset_key ?? "classic"),
    is_default: !!row.is_default,
    layout_json: (row.layout_json as LabelPrintTemplate["layout_json"]) ?? {},
    zpl_template: row.zpl_template ? String(row.zpl_template) : null,
  };
}

async function loadDefaultTemplate(client: typeof supabaseAdmin): Promise<LabelPrintTemplate | null> {
  const { data: def } = await client
    .from("label_print_templates")
    .select("*")
    .eq("is_default", true)
    .maybeSingle();
  if (def) return rowToTemplate(def as Record<string, unknown>);

  const { data: first } = await client
    .from("label_print_templates")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return first ? rowToTemplate(first as Record<string, unknown>) : null;
}

/** Public + staff: printer config and default template for label printing */
export async function getLabelPrintBundle(): Promise<{
  printer: PrinterSettings;
  template: LabelPrintTemplate | null;
} | null> {
  const client = db();
  const { data: settings } = await client.from("app_settings").select("printer_settings").eq("id", 1).maybeSingle();
  const printer = parsePrinterSettings(settings?.printer_settings);
  if (!printer.enabled) return { printer, template: null };
  const template = await loadDefaultTemplate(client);
  return { printer, template };
}

export async function adminListLabelTemplates() {
  await requireAdmin();
  const client = db();
  const { data } = await client.from("label_print_templates").select("*").order("name");
  return { templates: (data ?? []).map((r) => rowToTemplate(r as Record<string, unknown>)) };
}

export async function adminGetPrinterSettings() {
  await requireAdmin();
  const client = db();
  const { data } = await client.from("app_settings").select("printer_settings").eq("id", 1).maybeSingle();
  return { printer: parsePrinterSettings(data?.printer_settings) };
}

const printerSettingsSchema = z.object({
  enabled: z.boolean(),
  connection: z.enum(["browser_print", "network"]),
  network_host: z.string().max(255),
  network_port: z.number().int().min(1).max(65535),
  label_width_in: z.number().min(1).max(8),
  label_height_in: z.number().min(1).max(12),
  dpi: z.union([z.literal(203), z.literal(300)]),
});

export async function adminSavePrinterSettings(input: z.infer<typeof printerSettingsSchema>) {
  await requireAdmin();
  const data = printerSettingsSchema.parse(input);
  const client = db();
  const { error } = await client
    .from("app_settings")
    .update({ printer_settings: data as never, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  return { ok: true };
}

const templateSaveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  preset_key: z.string().min(1).max(40),
  layout_json: z.record(z.unknown()),
  zpl_template: z.string().max(20000).nullable().optional(),
  is_default: z.boolean().optional(),
});

export async function adminSaveLabelTemplate(input: z.infer<typeof templateSaveSchema>) {
  await requireAdmin();
  const data = templateSaveSchema.parse(input);
  const client = db();

  const payload = {
    name: data.name,
    preset_key: data.preset_key,
    layout_json: data.layout_json as import("@/integrations/supabase/types").Json,
    zpl_template: data.zpl_template ?? null,
    updated_at: new Date().toISOString(),
  };

  let id = data.id;
  if (id) {
    const { error } = await client.from("label_print_templates").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data: row, error } = await client.from("label_print_templates").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    id = row.id;
  }

  if (data.is_default && id) {
    await client.from("label_print_templates").update({ is_default: false }).neq("id", id);
    await client.from("label_print_templates").update({ is_default: true }).eq("id", id);
  }

  return { ok: true, id };
}

export async function adminSetDefaultLabelTemplate(input: { id: string }) {
  await requireAdmin();
  const { id } = z.object({ id: z.string().uuid() }).parse(input);
  const client = db();
  await client.from("label_print_templates").update({ is_default: false }).neq("id", id);
  const { error } = await client.from("label_print_templates").update({ is_default: true }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function adminPreviewLabelZpl(input: {
  preset_key: string;
  layout_json: Record<string, unknown>;
  zpl_template?: string | null;
  printer?: Partial<PrinterSettings>;
}) {
  await requireAdmin();
  const client = db();
  const { data } = await client.from("app_settings").select("printer_settings").eq("id", 1).maybeSingle();
  const printer = { ...parsePrinterSettings(data?.printer_settings), ...(input.printer ?? {}) };
  const template: LabelPrintTemplate = {
    id: "preview",
    name: "Preview",
    preset_key: input.preset_key,
    is_default: false,
    layout_json: { ...presetDefaultLayout(input.preset_key), ...input.layout_json },
    zpl_template: input.zpl_template ?? null,
  };
  const zpl = buildEntryPassZpl(SAMPLE_LABEL_DATA, template, printer);
  return { zpl };
}

export async function adminTestLabelPrint(input?: {
  preset_key?: string;
  layout_json?: Record<string, unknown>;
  zpl_template?: string | null;
}) {
  await requireAdmin();
  const bundle = await getLabelPrintBundle();
  if (!bundle?.printer.enabled) throw new Error("Enable label printing first");
  const template =
    bundle.template ??
    ({
      id: "test",
      name: "Test",
      preset_key: input?.preset_key ?? "classic",
      is_default: true,
      layout_json: input?.layout_json ?? presetDefaultLayout("classic"),
      zpl_template: input?.zpl_template ?? null,
    } as LabelPrintTemplate);

  const zpl = buildEntryPassZpl(SAMPLE_LABEL_DATA, template, bundle.printer);
  if (bundle.printer.connection === "network" && bundle.printer.network_host.trim()) {
    await sendZplToNetworkPrinter({ zpl });
    return { ok: true, zpl, method: "network" as const };
  }
  return { ok: true, zpl, method: "browser_print" as const };
}

export async function sendZplToNetworkPrinter(input: { zpl: string }) {
  const { zpl } = z.object({ zpl: z.string().min(1).max(100_000) }).parse(input);

  try {
    const ctx = await getAuthContext();
    const { data: role } = await ctx.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", ctx.userId)
      .in("role", ["admin", "pos"])
      .limit(1)
      .maybeSingle();
    if (!role) throw new Error("Forbidden");
  } catch {
    throw new Error("Forbidden: staff only");
  }

  const client = db();
  const { data } = await client.from("app_settings").select("printer_settings").eq("id", 1).maybeSingle();
  const printer = parsePrinterSettings(data?.printer_settings);
  const host = printer.network_host.trim();
  if (!host) throw new Error("Network printer host not configured");

  const net = await import("node:net");
  const port = printer.network_port || 9100;

  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.write(zpl, "utf8", () => {
        socket.end();
        resolve();
      });
    });
    socket.setTimeout(8000);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Printer connection timed out"));
    });
    socket.on("error", reject);
  });

  return { ok: true };
}

export async function buildEntryPassZplForToken(input: { qr_token: string }) {
  const { qr_token } = z.object({ qr_token: z.string().uuid() }).parse(input);
  const client = db();
  const { data: reg } = await client
    .from("registrations")
    .select("id, customer_name, mobile, guest_count, qr_token, created_at, slots(name, starts_at, ends_at, events(name))")
    .eq("qr_token", qr_token)
    .maybeSingle();
  if (!reg) throw new Error("Registration not found");

  const bundle = await getLabelPrintBundle();
  if (!bundle?.template) throw new Error("No label template configured");

  const slot = reg.slots as { name: string; starts_at: string; ends_at?: string; events?: { name: string } | null } | null;
  const labelData: EntryPassLabelData = {
    customer_name: reg.customer_name,
    mobile: reg.mobile,
    slot_name: slot?.name ?? "—",
    date: reg.created_at?.slice(0, 10) ?? "",
    time: slot?.starts_at ? formatSlotTimeRange(slot.starts_at, slot.ends_at) : "",
    guests: reg.guest_count,
    booking_ref: reg.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
    qr_token: reg.qr_token,
    event_name: slot?.events?.name ?? "Summer Splash",
    qr_url: passUrl(reg.qr_token),
  };

  const zpl = buildEntryPassZpl(labelData, bundle.template, bundle.printer);
  return { zpl, labelData };
}
