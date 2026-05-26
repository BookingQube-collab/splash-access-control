import "server-only";

import { after } from "next/server";
import { format, parseISO, isValid } from "date-fns";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { myPassesAfterRegisterUrl, passUrl } from "@/lib/public-url";
import { formatSlotDisplayLabel } from "@/lib/slot-time";

const MAILGUN_LOG = "[mailgun]";

export type MailgunConfig = {
  apiKey: string;
  domain: string;
  fromEmail: string;
  enabled: boolean;
};

type AppSettingsMailgunRow = {
  mailgun_api_key?: string | null;
  mailgun_domain?: string | null;
  mailgun_from_email?: string | null;
  mailgun_enabled?: boolean | null;
};

function resolveMailgunApiKey(row: AppSettingsMailgunRow | null): string | null {
  const fromDb = row?.mailgun_api_key?.trim();
  if (fromDb) return fromDb;
  const fromEnv = process.env.MAILGUN_API_KEY?.trim();
  return fromEnv || null;
}

function resolveMailgunDomain(row: AppSettingsMailgunRow | null): string | null {
  const fromDb = row?.mailgun_domain?.trim();
  if (fromDb) return fromDb;
  return process.env.MAILGUN_DOMAIN?.trim() || null;
}

function resolveMailgunFromEmail(row: AppSettingsMailgunRow | null): string | null {
  const fromDb = row?.mailgun_from_email?.trim();
  if (fromDb) return fromDb;
  return process.env.MAILGUN_FROM_EMAIL?.trim() || null;
}

function envMailgunEnabled(): boolean {
  const flag = process.env.MAILGUN_ENABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

function resolveMailgunEnabled(row: AppSettingsMailgunRow | null): boolean {
  if (row?.mailgun_enabled === true) return true;
  if (row?.mailgun_enabled === false) return false;
  return envMailgunEnabled();
}

/** Server-only: resolve Mailgun config from app_settings with env fallbacks. */
export async function getMailgunConfig(): Promise<MailgunConfig | null> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("mailgun_api_key, mailgun_domain, mailgun_from_email, mailgun_enabled")
    .eq("id", 1)
    .maybeSingle();

  const row = (data ?? null) as AppSettingsMailgunRow | null;
  const apiKey = resolveMailgunApiKey(row);
  const domain = resolveMailgunDomain(row);
  const fromEmail = resolveMailgunFromEmail(row);
  const enabled = resolveMailgunEnabled(row);

  if (!enabled || !apiKey || !domain || !fromEmail) return null;
  return { apiKey, domain, fromEmail, enabled };
}

export function isMailgunConfiguredFromEnv(): boolean {
  return !!(
    process.env.MAILGUN_API_KEY?.trim() &&
    process.env.MAILGUN_DOMAIN?.trim() &&
    process.env.MAILGUN_FROM_EMAIL?.trim()
  );
}

function mailgunApiBase(): string {
  return (process.env.MAILGUN_API_BASE_URL?.trim() || "https://api.mailgun.net").replace(/\/$/, "");
}

function formatVisitDate(iso: string): string {
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return iso.slice(0, 10);
    return format(d, "EEEE, MMMM d, yyyy");
  } catch {
    return iso.slice(0, 10);
  }
}

export type DigitalPassEmailContent = {
  customerName: string;
  eventName: string;
  slotLabel: string;
  visitDate: string;
  guestCount: number;
  passLink: string;
  myPassesLink: string;
};

export function buildDigitalPassEmailContent(input: DigitalPassEmailContent): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Your E3 Summer Splash digital pass";
  const { customerName, eventName, slotLabel, visitDate, guestCount, passLink, myPassesLink } =
    input;

  const guestsLine =
    guestCount > 1 ? `${guestCount} guests` : guestCount === 1 ? "1 guest" : "";

  const text = [
    `Hi ${customerName},`,
    "",
    "Thanks for registering for E3 Summer Splash. Your digital pass is ready.",
    "",
    eventName ? `Event: ${eventName}` : "",
    slotLabel ? `Time slot: ${slotLabel}` : "",
    visitDate ? `Visit date: ${visitDate}` : "",
    guestsLine ? `Party size: ${guestsLine}` : "",
    "",
    `View your pass: ${passLink}`,
    `Open My Passes (save to your phone): ${myPassesLink}`,
    "",
    "Tip: Open My Passes in your mobile browser and use “Add to Home Screen” to install the guest app for faster check-in.",
    "",
    "See you at the beach!",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0fdfa;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#134e4a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ccfbf1;">
        <tr><td style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:28px 24px;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Your digital pass</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#ccfbf1;">E3 Summer Splash</p>
        </td></tr>
        <tr><td style="padding:28px 24px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Hi <strong>${escapeHtml(customerName)}</strong>,</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Thanks for registering. Show your QR code at entry or open <strong>My Passes</strong> on your phone.</p>
          <table role="presentation" width="100%" style="background:#f8fafc;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:16px 18px;font-size:14px;line-height:1.6;">
              ${eventName ? `<div style="margin-bottom:8px;"><span style="color:#64748b;">Event</span><br><strong>${escapeHtml(eventName)}</strong></div>` : ""}
              ${slotLabel ? `<div style="margin-bottom:8px;"><span style="color:#64748b;">Time slot</span><br><strong>${escapeHtml(slotLabel)}</strong></div>` : ""}
              ${visitDate ? `<div style="margin-bottom:8px;"><span style="color:#64748b;">Visit date</span><br><strong>${escapeHtml(visitDate)}</strong></div>` : ""}
              ${guestsLine ? `<div><span style="color:#64748b;">Party size</span><br><strong>${escapeHtml(guestsLine)}</strong></div>` : ""}
            </td></tr>
          </table>
          <p style="margin:0 0 12px;text-align:center;">
            <a href="${escapeHtml(passLink)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:999px;">View pass &amp; QR code</a>
          </p>
          <p style="margin:0 0 20px;text-align:center;">
            <a href="${escapeHtml(myPassesLink)}" style="color:#0d9488;font-weight:600;font-size:14px;">Open My Passes app</a>
          </p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;text-align:center;">On iPhone or Android: open My Passes in your browser, then use <em>Add to Home Screen</em> to save the guest app for quick access.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">You received this email because you registered with this address.</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendMailgunMessage(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  config?: MailgunConfig | null;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const config = input.config ?? (await getMailgunConfig());
  if (!config) {
    return { ok: false, error: "Mailgun is not configured or disabled" };
  }

  const from = config.fromEmail.includes("<")
    ? config.fromEmail
    : `E3 Summer Splash <${config.fromEmail}>`;

  const body = new URLSearchParams();
  body.set("from", from);
  body.set("to", input.to);
  body.set("subject", input.subject);
  body.set("text", input.text);
  body.set("html", input.html);

  const url = `${mailgunApiBase()}/v3/${encodeURIComponent(config.domain)}/messages`;
  const auth = Buffer.from(`api:${config.apiKey}`).toString("base64");

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }

  const raw = await res.text();
  if (!res.ok) {
    return { ok: false, error: raw || `Mailgun HTTP ${res.status}` };
  }

  try {
    const parsed = JSON.parse(raw) as { id?: string };
    return { ok: true, id: parsed.id };
  } catch {
    return { ok: true };
  }
}

export async function sendDigitalPassEmail(input: {
  email: string;
  customerName: string;
  qrToken: string;
  mobile: string;
  guestCount: number;
  slotName: string;
  slotStartsAt?: string | null;
  slotEndsAt?: string | null;
  eventName?: string | null;
  visitDateIso: string;
}): Promise<{ ok: boolean; error?: string }> {
  const to = input.email.trim();
  if (!to) return { ok: false, error: "No recipient email" };

  const slotLabel = formatSlotDisplayLabel(
    input.slotName,
    input.slotStartsAt,
    input.slotEndsAt,
  );
  const visitDate = formatVisitDate(input.visitDateIso);
  const passLink = passUrl(input.qrToken);
  const myPassesLink = myPassesAfterRegisterUrl(input.mobile, input.qrToken);

  const { subject, text, html } = buildDigitalPassEmailContent({
    customerName: input.customerName,
    eventName: input.eventName?.trim() || "E3 Summer Splash",
    slotLabel,
    visitDate,
    guestCount: input.guestCount,
    passLink,
    myPassesLink,
  });

  const result = await sendMailgunMessage({ to, subject, text, html });
  if (!result.ok) {
    console.error(MAILGUN_LOG, "send failed:", result.error);
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

async function runDigitalPassEmail(
  registrationId: string,
  options?: { email?: string },
): Promise<void> {
  const config = await getMailgunConfig();
  if (!config) return;

  const { data: reg, error } = await supabaseAdmin
    .from("registrations")
    .select(
      "id, customer_name, mobile, email, guest_count, qr_token, created_at, slots(name, starts_at, ends_at, events(name))",
    )
    .eq("id", registrationId)
    .maybeSingle();

  if (error) {
    console.error(MAILGUN_LOG, "load registration failed:", error.message);
    return;
  }
  if (!reg) return;

  const toEmail = (options?.email?.trim() || reg.email?.trim()) ?? "";
  if (!toEmail) return;

  const slot = reg.slots as {
    name: string;
    starts_at: string;
    ends_at: string;
    events: { name: string } | null;
  } | null;

  const result = await sendDigitalPassEmail({
    email: toEmail,
    customerName: reg.customer_name,
    qrToken: reg.qr_token,
    mobile: reg.mobile,
    guestCount: reg.guest_count ?? 1,
    slotName: slot?.name ?? "Your slot",
    slotStartsAt: slot?.starts_at,
    slotEndsAt: slot?.ends_at,
    eventName: slot?.events?.name,
    visitDateIso: reg.created_at,
  });

  if (!result.ok) {
    console.error(MAILGUN_LOG, "digital pass email failed:", result.error);
  }
}

/** Schedule digital pass email after registration (non-blocking via `after`). */
export function scheduleDigitalPassEmail(
  registrationId: string,
  options?: { email?: string },
): void {
  const email = options?.email?.trim();
  if (email === "") return;

  try {
    after(() => runDigitalPassEmail(registrationId, options));
  } catch {
    void runDigitalPassEmail(registrationId, options);
  }
}
