function resolvePublicSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

/** Canonical site origin for QR codes and share links. */
export function getSiteOrigin(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || window.location.origin;
  }
  return resolvePublicSiteOrigin();
}

/** Absolute origin for email embeds (QR, logos). Prefer NEXT_PUBLIC_SITE_URL in production. */
export function getEmailSiteOrigin(): string {
  return resolvePublicSiteOrigin();
}

export function passUrl(qrToken: string): string {
  return `${getSiteOrigin()}/pass/${qrToken}`;
}

/** Deep link to guest passes — pass UUID only (phone stays off the URL; session restores after login). */
export function myPassesUrl(passToken: string): string {
  const t = passToken.trim();
  return `${getSiteOrigin()}/my-passes/${encodeURIComponent(t)}`;
}

/** After registration — phone + pass query params for client cache warm-up. */
export function myPassesAfterRegisterPath(mobile: string, passToken: string): string {
  const params = new URLSearchParams();
  params.set("phone", mobile.trim());
  params.set("pass", passToken.trim());
  return `/my-passes?${params.toString()}`;
}

export function myPassesAfterRegisterUrl(mobile: string, passToken: string): string {
  return `${getSiteOrigin()}${myPassesAfterRegisterPath(mobile, passToken)}`;
}

/** Guest deep link for QR / app install — phone query when available after registration. */
export function guestMyPassesPath(passToken: string, mobile?: string): string {
  const t = passToken.trim();
  if (mobile?.trim()) return myPassesAfterRegisterPath(mobile, t);
  return `/my-passes/${encodeURIComponent(t)}`;
}

export function guestMyPassesUrl(passToken: string, mobile?: string): string {
  return `${getSiteOrigin()}${guestMyPassesPath(passToken, mobile)}`;
}
