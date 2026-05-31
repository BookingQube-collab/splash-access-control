function trimOrigin(url: string): string {
  return url.replace(/\/$/, "");
}

function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimOrigin(trimmed) : trimOrigin(`https://${trimmed}`);
}

function isLocalOrigin(url: string): boolean {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]";
  } catch {
    return false;
  }
}

function resolvePublicSiteOrigin(): string {
  const candidates = [
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const raw of candidates) {
    const origin = raw ? normalizeOrigin(raw) : "";
    if (origin && !isLocalOrigin(origin)) return origin;
  }

  const localFallback = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (localFallback?.trim()) return normalizeOrigin(localFallback);
  if (process.env.VERCEL_URL) return `https://${trimOrigin(process.env.VERCEL_URL)}`;
  return "http://localhost:3000";
}

/** Canonical site origin for QR codes and share links. */
export function getSiteOrigin(): string {
  if (typeof window !== "undefined") {
    const pub = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (pub) return normalizeOrigin(pub);
    return window.location.origin;
  }
  return resolvePublicSiteOrigin();
}

/** Absolute origin for email embeds and pass links. Set SITE_URL or NEXT_PUBLIC_SITE_URL in production. */
export function getEmailSiteOrigin(): string {
  return resolvePublicSiteOrigin();
}

export function passUrl(qrToken: string, origin?: string): string {
  const base = origin?.trim() || getSiteOrigin();
  return `${trimOrigin(base)}/pass/${encodeURIComponent(qrToken.trim())}`;
}

/** Deep link to guest passes — pass UUID only (phone stays off the URL; session restores after login). */
export function myPassesUrl(passToken: string, origin?: string): string {
  const base = origin?.trim() || getSiteOrigin();
  const t = passToken.trim();
  return `${trimOrigin(base)}/my-passes/${encodeURIComponent(t)}`;
}

/** After registration — phone + pass query params for client cache warm-up. */
export function myPassesAfterRegisterPath(mobile: string, passToken: string): string {
  const params = new URLSearchParams();
  params.set("phone", mobile.trim());
  params.set("pass", passToken.trim());
  return `/my-passes?${params.toString()}`;
}

export function myPassesAfterRegisterUrl(mobile: string, passToken: string, origin?: string): string {
  const base = origin?.trim() || getSiteOrigin();
  return `${trimOrigin(base)}${myPassesAfterRegisterPath(mobile, passToken)}`;
}

/** Guest deep link for QR / app install — phone query when available after registration. */
export function guestMyPassesPath(passToken: string, mobile?: string): string {
  const t = passToken.trim();
  if (mobile?.trim()) return myPassesAfterRegisterPath(mobile, t);
  return `/my-passes/${encodeURIComponent(t)}`;
}

export function guestMyPassesUrl(passToken: string, mobile?: string, origin?: string): string {
  const base = origin?.trim() || getSiteOrigin();
  return `${trimOrigin(base)}${guestMyPassesPath(passToken, mobile)}`;
}

/** Email CTA — opens My Passes on the production domain with session warm-up when mobile is known. */
export function emailMyPassesDownloadUrl(
  passToken: string,
  mobile?: string,
  origin?: string,
): string {
  const base = origin?.trim() || getEmailSiteOrigin();
  const t = passToken.trim();
  if (mobile?.trim()) {
    return myPassesAfterRegisterUrl(mobile, t, base);
  }
  return myPassesUrl(t, base);
}
