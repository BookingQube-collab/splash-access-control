import "server-only";

import { after } from "next/server";
import { format, parseISO, isValid } from "date-fns";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildDigitalPassEmailContent,
  formatPassId,
} from "@/lib/email/digital-pass-template";
import {
  buildDigitalPassInlineAssets,
  type MailInlineAttachment,
} from "@/lib/email/digital-pass-inline-assets";
import { getEmailSiteOrigin, myPassesAfterRegisterUrl, passUrl } from "@/lib/public-url";
import { formatSlotTimeRange } from "@/lib/slot-time";

const MAILGUN_LOG = "[mailgun]";
const MAIL_LOG = "[mail]";

/** Default display name for digital-pass From header (SMTP + Mailgun API). */
export const DEFAULT_MAIL_FROM_NAME = "Summer Splash 2026";

const LEGACY_MAIL_FROM_NAMES = new Set(["bookingqube"]);

/** Resolve sender display name from DB/env, replacing legacy "BookingQube" and empty values. */
export function resolveMailFromName(storedName?: string | null): string {
  const raw = (storedName ?? process.env.MAIL_FROM_NAME ?? "").trim();
  if (!raw || LEGACY_MAIL_FROM_NAMES.has(raw.toLowerCase())) {
    return DEFAULT_MAIL_FROM_NAME;
  }
  return raw;
}

export type MailDriver = "api" | "smtp";

export type MailgunConfig = {
  apiKey: string;
  domain: string;
  fromEmail: string;
  enabled: boolean;
  apiBaseUrl: string;
};

export type SmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: "tls" | "ssl" | "none";
  fromEmail: string;
  fromName?: string | null;
};

/** Resolved transport config used by the send path (discriminated by driver). */
export type ResolvedMailConfig =
  | { driver: "api"; from: string; api: MailgunConfig }
  | { driver: "smtp"; from: string; smtp: SmtpConfig };

type AppSettingsMailgunRow = {
  mailgun_api_key?: string | null;
  mailgun_domain?: string | null;
  mailgun_from_email?: string | null;
  mailgun_enabled?: boolean | null;
  mailgun_region?: string | null;
  mail_driver?: string | null;
  mail_host?: string | null;
  mail_port?: number | null;
  mail_username?: string | null;
  mail_password?: string | null;
  mail_encryption?: string | null;
  mail_from_email?: string | null;
  mail_from_name?: string | null;
};

const APP_SETTINGS_MAIL_COLUMNS =
  "mailgun_api_key, mailgun_domain, mailgun_from_email, mailgun_enabled, mailgun_region, " +
  "mail_driver, mail_host, mail_port, mail_username, mail_password, mail_encryption, mail_from_email, mail_from_name";

const MAILGUN_US_BASE_URL = "https://api.mailgun.net";
const MAILGUN_EU_BASE_URL = "https://api.eu.mailgun.net";

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

/** Heuristic: does this string clearly point at Mailgun's EU region? */
function hintsEuRegion(...values: (string | null | undefined)[]): boolean {
  return values.some((v) => /\beu\.mailgun\b|\.eu\.mailgun\./i.test(v ?? ""));
}

/**
 * Resolve the Mailgun API base URL. EU-hosted domains must hit
 * https://api.eu.mailgun.net or Mailgun returns HTTP 401 Forbidden.
 * Precedence: explicit DB region → MAILGUN_API_BASE_URL env → US default.
 * Safety net: if the domain/from clearly look EU but region wasn't set to EU,
 * we still use the EU endpoint (and log it) to avoid the 401 footgun.
 */
function resolveMailgunApiBaseUrl(row: AppSettingsMailgunRow | null): string {
  const region = row?.mailgun_region?.trim().toLowerCase();
  let base: string;
  if (region === "eu") base = MAILGUN_EU_BASE_URL;
  else if (region === "us") base = MAILGUN_US_BASE_URL;
  else {
    const envBase = process.env.MAILGUN_API_BASE_URL?.trim();
    base = envBase ? envBase.replace(/\/$/, "") : MAILGUN_US_BASE_URL;
  }

  if (base !== MAILGUN_EU_BASE_URL && hintsEuRegion(row?.mailgun_domain, row?.mailgun_from_email)) {
    console.warn(
      MAILGUN_LOG,
      `domain/from look EU-hosted but region is "${region ?? "unset"}" — using ${MAILGUN_EU_BASE_URL}. ` +
        "Set Region = EU in Admin → Settings → Email to make this explicit.",
    );
    return MAILGUN_EU_BASE_URL;
  }
  return base;
}

const MAILGUN_SMTP_HOSTS = new Set([
  "smtp.mailgun.org",
  "smtp.eu.mailgun.org",
]);

/** True when the value is a Mailgun SMTP relay hostname (valid for SMTP host, not API domain). */
function isSmtpRelayHostname(value: string): boolean {
  const d = value.trim().toLowerCase();
  return MAILGUN_SMTP_HOSTS.has(d) || d.startsWith("smtp.");
}

/**
 * The "Sending domain" must be the Mailgun *domain* (e.g. mg.example.com or
 * sandboxXXXX.mailgun.org), NOT the SMTP relay hostname. Using the SMTP host
 * (smtp.mailgun.org / smtp.eu.mailgun.org) yields HTTP 401 Forbidden.
 * Only enforced for the HTTP API driver — never for SMTP host fields.
 */
function mailgunApiDomainProblem(domain: string): string | null {
  if (isSmtpRelayHostname(domain)) {
    return `"${domain}" looks like the Mailgun SMTP server hostname, not your sending domain. Use your verified domain (e.g. mg.yourdomain.com) or sandbox domain (sandboxXXXX.mailgun.org) instead, or switch Mail driver to SMTP and put this value in Mail Host.`;
  }
  return null;
}

function smtpConfigComplete(input: {
  host?: string | null;
  username?: string | null;
  password?: string | null;
  fromEmail?: string | null;
}): boolean {
  return Boolean(
    input.host?.trim() &&
      input.username?.trim() &&
      input.password?.trim() &&
      input.fromEmail?.trim(),
  );
}

/**
 * Resolve SMTP settings from mail_* columns, with legacy fallbacks when the
 * SMTP migration is not applied and credentials were stored in mailgun_* fields.
 */
function resolveSmtpSettingsFromRow(row: AppSettingsMailgunRow | null): SmtpConfig | null {
  const legacyDomain = row?.mailgun_domain?.trim() ?? "";
  const legacyHost = isSmtpRelayHostname(legacyDomain) ? legacyDomain : "";

  const host = (row?.mail_host ?? (legacyHost || process.env.MAIL_HOST || "")).trim();
  const username = (
    row?.mail_username ??
    process.env.MAIL_USERNAME ??
    row?.mailgun_from_email ??
    ""
  ).trim();
  const password = (
    row?.mail_password ??
    row?.mailgun_api_key ??
    process.env.MAIL_PASSWORD ??
    ""
  ).trim();
  const portRaw = row?.mail_port ?? Number(process.env.MAIL_PORT) ?? 587;
  const port = Number.isFinite(Number(portRaw)) && Number(portRaw) > 0 ? Number(portRaw) : 587;
  const fromEmail = (
    row?.mail_from_email ??
    process.env.MAIL_FROM_EMAIL ??
    row?.mailgun_from_email ??
    ""
  ).trim();
  const fromName = resolveMailFromName(row?.mail_from_name);
  const encryption = resolveMailEncryption(row);

  if (!smtpConfigComplete({ host, username, password, fromEmail })) return null;
  return { host, port, username, password, encryption, fromEmail, fromName };
}

function isValidApiConfig(row: AppSettingsMailgunRow | null): boolean {
  const domain = resolveMailgunDomain(row);
  const apiKey = resolveMailgunApiKey(row);
  const fromEmail = resolveMailgunFromEmail(row);
  if (!apiKey || !domain || !fromEmail) return false;
  if (mailgunApiDomainProblem(domain)) return false;
  return true;
}

function resolveMailDriver(row: AppSettingsMailgunRow | null): MailDriver {
  const smtpReady = Boolean(resolveSmtpSettingsFromRow(row));
  const fromDb = row?.mail_driver?.trim().toLowerCase();

  if (fromDb === "smtp") return "smtp";
  if (fromDb === "api") {
    // DB default is 'api' — still prefer SMTP when API config is invalid (e.g. smtp host in domain field).
    if (smtpReady && !isValidApiConfig(row)) return "smtp";
    return "api";
  }

  if (smtpReady) return "smtp";

  const fromEnv = process.env.MAIL_DRIVER?.trim().toLowerCase();
  if (fromEnv === "smtp" || fromEnv === "api") return fromEnv;
  return "api";
}

function resolveSupportEmail(): string {
  return process.env.MAILGUN_SUPPORT_EMAIL?.trim() || "info@eeeqa.com";
}

function resolveSupportPhone(): string {
  return process.env.MAILGUN_SUPPORT_PHONE?.trim() || "+974 5113 8418";
}

function resolveVenueName(): string {
  return process.env.EVENT_VENUE_NAME?.trim() || "Beach Festival '26";
}

function resolveSocialLinks(): {
  instagram?: string;
  facebook?: string;
  x?: string;
  youtube?: string;
} {
  return {
    instagram: process.env.EVENT_SOCIAL_INSTAGRAM?.trim(),
    facebook: process.env.EVENT_SOCIAL_FACEBOOK?.trim(),
    x: process.env.EVENT_SOCIAL_X?.trim(),
    youtube: process.env.EVENT_SOCIAL_YOUTUBE?.trim(),
  };
}

function formatEmailSlotLabel(
  slotName: string,
  slotStartsAt?: string | null,
  slotEndsAt?: string | null,
): string {
  if (slotStartsAt && slotEndsAt) {
    return formatSlotTimeRange(slotStartsAt, slotEndsAt).replace(/\b(am|pm)\b/g, (m) =>
      m.toUpperCase(),
    );
  }
  return slotName?.trim() || "Your slot";
}

/** Load the app_settings mail row, tolerating un-applied migrations (region / SMTP). */
async function loadMailSettingsRow(): Promise<AppSettingsMailgunRow | null> {
  let { data, error } = await supabaseAdmin
    .from("app_settings")
    .select(APP_SETTINGS_MAIL_COLUMNS)
    .eq("id", 1)
    .maybeSingle();

  // Back-compat: SMTP (mail_*) migration not applied — retry without those columns.
  if (error && /mail_(driver|host|port|username|password|encryption|from)/.test(error.message ?? "")) {
    ({ data, error } = await supabaseAdmin
      .from("app_settings")
      .select("mailgun_api_key, mailgun_domain, mailgun_from_email, mailgun_enabled, mailgun_region")
      .eq("id", 1)
      .maybeSingle());
  }
  // Back-compat: region migration also not applied.
  if (error && /mailgun_region/.test(error.message ?? "")) {
    ({ data, error } = await supabaseAdmin
      .from("app_settings")
      .select("mailgun_api_key, mailgun_domain, mailgun_from_email, mailgun_enabled")
      .eq("id", 1)
      .maybeSingle());
  }

  if (error) {
    console.error(MAIL_LOG, "failed to load app_settings:", error.message);
  }
  return (data ?? null) as AppSettingsMailgunRow | null;
}

function resolveMailEncryption(row: AppSettingsMailgunRow | null): "tls" | "ssl" | "none" {
  const enc = (row?.mail_encryption ?? process.env.MAIL_ENCRYPTION ?? "")
    .trim()
    .toLowerCase();
  if (enc === "ssl") return "ssl";
  if (enc === "none" || enc === "") return enc === "none" ? "none" : "tls";
  return "tls";
}

function formatFromHeader(name: string | null | undefined, email: string): string {
  if (email.includes("<")) return email;
  const trimmedName = name?.trim();
  return trimmedName ? `${trimmedName} <${email}>` : email;
}

/** Server-only: resolve the API (Mailgun) config from app_settings with env fallbacks. */
export async function getMailgunConfig(): Promise<MailgunConfig | null> {
  const row = await loadMailSettingsRow();
  const apiKey = resolveMailgunApiKey(row);
  const domain = resolveMailgunDomain(row);
  const fromEmail = resolveMailgunFromEmail(row);
  const enabled = resolveMailgunEnabled(row);
  const apiBaseUrl = resolveMailgunApiBaseUrl(row);

  if (!enabled || !apiKey || !domain || !fromEmail) return null;
  return { apiKey, domain, fromEmail, enabled, apiBaseUrl };
}

/**
 * Resolve the active mail transport. `mailgun_enabled` remains the master
 * on/off toggle for both drivers; the driver selects API vs SMTP.
 */
export async function resolveMailConfig(): Promise<ResolvedMailConfig | null> {
  const row = await loadMailSettingsRow();
  const enabled = resolveMailgunEnabled(row);
  if (!enabled) return null;

  const driver = resolveMailDriver(row);
  const smtpSettings = resolveSmtpSettingsFromRow(row);

  if (driver === "smtp") {
    if (!smtpSettings) {
      console.warn(
        MAIL_LOG,
        "SMTP driver selected but incomplete — need Mail Host, Username, Password and Sender Email (Admin → Settings → Email).",
      );
      return null;
    }
    return {
      driver: "smtp",
      from: formatFromHeader(smtpSettings.fromName, smtpSettings.fromEmail),
      smtp: smtpSettings,
    };
  }

  // API driver — if domain looks like an SMTP hostname, try SMTP when credentials exist.
  const apiKey = resolveMailgunApiKey(row);
  const domain = resolveMailgunDomain(row);
  const fromEmail = resolveMailgunFromEmail(row);
  const apiBaseUrl = resolveMailgunApiBaseUrl(row);

  if (domain && mailgunApiDomainProblem(domain) && smtpSettings) {
    console.info(
      MAIL_LOG,
      `mailgun_domain is an SMTP hostname but Mail driver is API — using SMTP transport (host="${smtpSettings.host}"). Set Mail driver = SMTP in Admin → Settings → Email.`,
    );
    return {
      driver: "smtp",
      from: formatFromHeader(smtpSettings.fromName, smtpSettings.fromEmail),
      smtp: smtpSettings,
    };
  }

  if (!apiKey || !domain || !fromEmail) return null;
  const fromName = resolveMailFromName(row?.mail_from_name);
  return {
    driver: "api",
    from: formatFromHeader(fromName, fromEmail),
    api: { apiKey, domain, fromEmail, enabled: true, apiBaseUrl },
  };
}

export function isMailgunConfiguredFromEnv(): boolean {
  return !!(
    process.env.MAILGUN_API_KEY?.trim() &&
    process.env.MAILGUN_DOMAIN?.trim() &&
    process.env.MAILGUN_FROM_EMAIL?.trim()
  );
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

export function passQrImageUrl(qrToken: string): string {
  return `${getEmailSiteOrigin()}/api/pass-qr?token=${encodeURIComponent(qrToken)}`;
}

type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: MailInlineAttachment[];
};
type SendResult = { ok: true; id?: string } | { ok: false; error: string };

/** Send via the Mailgun HTTP API (POST /v3/{domain}/messages). */
async function sendViaApi(config: MailgunConfig, from: string, msg: MailMessage): Promise<SendResult> {
  const domainProblem = mailgunApiDomainProblem(config.domain);
  if (domainProblem) {
    console.error(MAILGUN_LOG, "invalid sending domain:", domainProblem);
    return { ok: false, error: domainProblem };
  }

  // Mailgun requires the From address to be on the verified sending domain.
  const fromAddrDomain = config.fromEmail.match(/@([^>\s]+)/)?.[1]?.toLowerCase();
  if (fromAddrDomain && fromAddrDomain !== config.domain.trim().toLowerCase()) {
    console.warn(
      MAILGUN_LOG,
      `from address domain "${fromAddrDomain}" does not match sending domain "${config.domain}". ` +
        "Mailgun rejects mismatched From domains — use an address like noreply@" + config.domain + ".",
    );
  }

  const body = new FormData();
  body.set("from", from);
  body.set("to", msg.to);
  body.set("subject", msg.subject);
  body.set("text", msg.text);
  body.set("html", msg.html);
  for (const att of msg.attachments ?? []) {
    body.append(
      "inline",
      new Blob([new Uint8Array(att.content)], { type: att.contentType }),
      att.filename,
    );
  }

  const apiBaseUrl = (config.apiBaseUrl || MAILGUN_US_BASE_URL).replace(/\/$/, "");
  const url = `${apiBaseUrl}/v3/${encodeURIComponent(config.domain)}/messages`;
  const auth = Buffer.from(`api:${config.apiKey}`).toString("base64");

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(MAILGUN_LOG, "network error:", message);
    return { ok: false, error: message };
  }

  const raw = await res.text();
  if (!res.ok) {
    console.error(
      MAILGUN_LOG,
      "send failed HTTP",
      res.status,
      `(domain="${config.domain}", from="${from}", base="${apiBaseUrl}")`,
      raw.slice(0, 500),
    );
    if (res.status === 401) {
      console.error(
        MAILGUN_LOG,
        "401 usually means the API key is wrong OR the region is wrong. " +
          "If your Mailgun domain is hosted in the EU, set Region = EU in Admin → Settings → Email " +
          `(currently using ${apiBaseUrl}). Also confirm the domain matches the API key's account.`,
      );
    }
    return { ok: false, error: raw || `Mailgun HTTP ${res.status}` };
  }

  try {
    const parsed = JSON.parse(raw) as { id?: string };
    console.info(MAILGUN_LOG, "message accepted", parsed.id ?? "(no id)");
    return { ok: true, id: parsed.id };
  } catch {
    return { ok: true };
  }
}

/**
 * Send via SMTP using nodemailer. Port 465 (or encryption=ssl) => implicit TLS
 * (secure:true); port 587 with encryption=tls => STARTTLS (secure:false,
 * requireTLS:true); encryption=none => plain.
 */
function smtpTransportOptions(config: SmtpConfig) {
  const secure = config.encryption === "ssl" || config.port === 465;
  const requireTLS = !secure && config.encryption === "tls";
  return {
    host: config.host,
    port: config.port,
    secure,
    requireTLS,
    auth: { user: config.username, pass: config.password },
  };
}

function formatSmtpAuthError(config: SmtpConfig, raw: string): string {
  const pwdLen = config.password.length;
  if (/535|authentication failed|invalid login/i.test(raw)) {
    const hint =
      pwdLen < 32
        ? ` Stored password is only ${pwdLen} characters — Mailgun SMTP passwords are typically 50+. Re-enter the full password from Mailgun → Domain settings → SMTP credentials (not the HTTP API key alone).`
        : " Confirm username and password match Mailgun → Domain → SMTP credentials for this domain.";
    return `SMTP authentication failed (535). Username="${config.username}", password length=${pwdLen}.${hint}`;
  }
  return raw;
}

/** Verify SMTP login without sending mail (nodemailer transporter.verify). */
export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  const config = await resolveMailConfig();
  if (!config) return { ok: false, error: "Email is not configured or disabled" };
  if (config.driver !== "smtp") {
    return { ok: false, error: "Mail driver is not SMTP — switch to SMTP in Admin → Settings → Email" };
  }

  const nodemailer = (await import("nodemailer")).default;
  const smtp = config.smtp;
  console.info(MAIL_LOG, "SMTP verify", {
    host: `${smtp.host}:${smtp.port}`,
    user: smtp.username,
    passwordLen: smtp.password.length,
    encryption: smtp.encryption,
  });

  try {
    const transporter = nodemailer.createTransport(smtpTransportOptions(smtp));
    await transporter.verify();
    console.info(MAIL_LOG, "SMTP verify OK", { user: smtp.username, passwordLen: smtp.password.length });
    return { ok: true };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error(MAIL_LOG, "SMTP verify failed", {
      user: smtp.username,
      passwordLen: smtp.password.length,
      error: raw,
    });
    return { ok: false, error: formatSmtpAuthError(smtp, raw) };
  }
}

async function sendViaSmtp(config: SmtpConfig, from: string, msg: MailMessage): Promise<SendResult> {
  const nodemailer = (await import("nodemailer")).default;
  const transportOpts = smtpTransportOptions(config);
  const pwdLen = config.password.length;

  console.info(MAIL_LOG, "SMTP send attempt", {
    host: `${config.host}:${config.port}`,
    user: config.username,
    passwordLen: pwdLen,
    from,
    to: msg.to,
  });

  try {
    const transporter = nodemailer.createTransport(transportOpts);

    const info = await transporter.sendMail({
      from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      attachments: (msg.attachments ?? []).map((att) => ({
        filename: att.filename,
        content: att.content,
        cid: att.cid,
        contentType: att.contentType,
        contentDisposition: "inline" as const,
      })),
    });

    console.info(
      MAIL_LOG,
      "message sent",
      info.messageId ?? "(no id)",
      `(host="${config.host}:${config.port}", secure=${transportOpts.secure}, requireTLS=${transportOpts.requireTLS})`,
    );
    if (Array.isArray(info.rejected) && info.rejected.length > 0) {
      const rejected = info.rejected.join(", ");
      console.error(MAIL_LOG, "recipient(s) rejected:", rejected);
      return { ok: false, error: `Recipient rejected: ${rejected}` };
    }
    return { ok: true, id: info.messageId };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error(MAIL_LOG, "SMTP send failed", {
      host: `${config.host}:${config.port}`,
      user: config.username,
      passwordLen: pwdLen,
      error: raw,
    });
    return { ok: false, error: formatSmtpAuthError(config, raw) };
  }
}

/** Resolve the configured transport (API or SMTP) and send one message. */
export async function sendMailMessage(input: MailMessage): Promise<SendResult> {
  const config = await resolveMailConfig();
  if (!config) {
    return { ok: false, error: "Email is not configured or disabled" };
  }
  console.info(
    MAIL_LOG,
    `sending via ${config.driver.toUpperCase()}`,
    config.driver === "smtp"
      ? `(host="${config.smtp.host}:${config.smtp.port}")`
      : `(domain="${config.api.domain}")`,
  );
  return config.driver === "smtp"
    ? sendViaSmtp(config.smtp, config.from, input)
    : sendViaApi(config.api, config.from, input);
}

/** @deprecated Use sendMailMessage. Kept for back-compat (API transport). */
export async function sendMailgunMessage(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  config?: MailgunConfig | null;
}): Promise<SendResult> {
  if (input.config) {
    const from = formatFromHeader(DEFAULT_MAIL_FROM_NAME, input.config.fromEmail);
    return sendViaApi(input.config, from, input);
  }
  return sendMailMessage(input);
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
  registrationId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const to = input.email.trim();
  if (!to) return { ok: false, error: "No recipient email" };

  const origin = getEmailSiteOrigin();
  const eventName = input.eventName?.trim() || "Park Guest";
  const slotLabel = formatEmailSlotLabel(
    input.slotName,
    input.slotStartsAt,
    input.slotEndsAt,
  );
  const visitDate = formatVisitDate(input.visitDateIso);
  const passLink = passUrl(input.qrToken);
  const myPassesLink = myPassesAfterRegisterUrl(input.mobile, input.qrToken);

  const { attachments, logoUrl, qrImageUrl } = await buildDigitalPassInlineAssets(input.qrToken);

  const { subject, text, html } = buildDigitalPassEmailContent({
    customerName: input.customerName,
    registeredFor: eventName,
    slotLabel,
    visitDate,
    guestCount: input.guestCount,
    venue: resolveVenueName(),
    passId: formatPassId(input.qrToken, eventName),
    passLink,
    myPassesLink,
    qrImageUrl,
    supportEmail: resolveSupportEmail(),
    supportPhone: resolveSupportPhone(),
    logoUrl,
    heroUrl: `${origin}/brand/hero-beach.jpg`,
    visitQatarLogoUrl: process.env.EVENT_EMAIL_VISIT_QATAR_LOGO_URL?.trim(),
    halaSummerLogoUrl: process.env.EVENT_EMAIL_HALA_SUMMER_LOGO_URL?.trim(),
    gateIllustrationUrl: process.env.EVENT_EMAIL_GATE_ILLUSTRATION_URL?.trim(),
    socialLinks: resolveSocialLinks(),
  });

  const result = await sendMailMessage({ to, subject, text, html, attachments });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  console.info(
    MAIL_LOG,
    "digital pass email sent",
    { to, registrationId: input.registrationId ?? "—" },
  );
  return { ok: true };
}

export type PassEmailStatus = "pending" | "sent" | "failed";

/**
 * Persist the per-registration digital-pass email status. Best-effort: if the
 * pass_email_* columns are not migrated yet, we log and continue so sending
 * itself never breaks.
 */
async function recordPassEmailStatus(
  registrationId: string,
  status: PassEmailStatus,
  error?: string | null,
): Promise<void> {
  const patch: Record<string, unknown> = {
    pass_email_status: status,
    pass_email_error: status === "failed" ? (error ?? "Unknown error").slice(0, 1000) : null,
  };
  if (status === "sent") patch.pass_email_sent_at = new Date().toISOString();

  const { error: updateError } = await supabaseAdmin
    .from("registrations")
    .update(patch as never)
    .eq("id", registrationId);

  if (updateError && /pass_email_/.test(updateError.message ?? "")) {
    console.warn(
      MAILGUN_LOG,
      "pass_email_* columns not found — apply migration 20260529130000_registrations_pass_email_status.sql to track email status",
    );
  } else if (updateError) {
    console.error(MAILGUN_LOG, "failed to record email status:", updateError.message);
  }
}

type RunResult = { ok: boolean; skipped?: boolean; error?: string };

async function runDigitalPassEmail(
  registrationId: string,
  options?: { email?: string },
): Promise<RunResult> {
  const config = await resolveMailConfig();
  if (!config) {
    const msg =
      "Email is not configured or disabled — enable it in Admin → Settings → Email (choose SMTP or API driver, fill the fields, toggle on)";
    console.warn(MAIL_LOG, "skipped:", msg);
    return { ok: false, skipped: true, error: msg };
  }

  const { data: reg, error } = await supabaseAdmin
    .from("registrations")
    .select(
      "id, customer_name, mobile, email, guest_count, qr_token, created_at, slots(name, starts_at, ends_at, events(name))",
    )
    .eq("id", registrationId)
    .maybeSingle();

  if (error) {
    console.error(MAILGUN_LOG, "load registration failed:", error.message);
    return { ok: false, error: error.message };
  }
  if (!reg) {
    console.warn(MAILGUN_LOG, "registration not found:", registrationId);
    return { ok: false, error: "Registration not found" };
  }

  const toEmail = (options?.email?.trim() || reg.email?.trim()) ?? "";
  if (!toEmail) {
    console.info(MAILGUN_LOG, "skipped: no email on registration", registrationId);
    return { ok: false, skipped: true, error: "No email address on this registration" };
  }

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
    registrationId: reg.id,
  });

  if (!result.ok) {
    console.error(MAILGUN_LOG, "digital pass email failed:", result.error);
    await recordPassEmailStatus(registrationId, "failed", result.error);
    return { ok: false, error: result.error };
  }

  await recordPassEmailStatus(registrationId, "sent");
  return { ok: true };
}

/** Schedule digital pass email after registration (non-blocking via `after`). */
export function scheduleDigitalPassEmail(
  registrationId: string,
  options?: { email?: string },
): void {
  const run = () =>
    runDigitalPassEmail(registrationId, options).catch((err) => {
      console.error(
        MAILGUN_LOG,
        "unhandled error:",
        err instanceof Error ? err.message : String(err),
      );
    });

  try {
    after(run);
  } catch (err) {
    console.warn(
      MAILGUN_LOG,
      "after() unavailable, running send in background:",
      err instanceof Error ? err.message : String(err),
    );
    void run();
  }
}

/**
 * Re-send the digital pass email for a registration and await the result.
 * Always allowed (even if already sent successfully). Updates email status.
 */
export async function resendDigitalPassEmail(
  registrationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await runDigitalPassEmail(registrationId);
  return { ok: result.ok, error: result.error };
}
