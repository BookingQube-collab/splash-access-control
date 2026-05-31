import "server-only";

import { headers } from "next/headers";

function trimOrigin(url: string): string {
  return url.replace(/\/$/, "");
}

function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimOrigin(trimmed) : trimOrigin(`https://${trimmed}`);
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isLocalOrigin(url: string): boolean {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return isLocalHostname(u.hostname);
  } catch {
    return false;
  }
}

/** Request Host / X-Forwarded-* when the app is accessed on a real domain (not localhost). */
export async function resolveRequestSiteOrigin(): Promise<string | null> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host")?.trim();
    if (!host || isLocalHostname(host.split(":")[0] ?? host)) return null;
    const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return normalizeOrigin(`${proto}://${host}`);
  } catch {
    return null;
  }
}

/** Best origin for outbound email links — env first, then inbound request host. */
export async function resolveEmailSiteOrigin(): Promise<string> {
  const { getEmailSiteOrigin } = await import("@/lib/public-url");
  const envOrigin = getEmailSiteOrigin();
  if (!isLocalOrigin(envOrigin)) return envOrigin;
  const requestOrigin = await resolveRequestSiteOrigin();
  if (requestOrigin && !isLocalOrigin(requestOrigin)) return requestOrigin;
  return envOrigin;
}
