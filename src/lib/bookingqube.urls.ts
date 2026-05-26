/** Client-safe BookingQube URL helpers (no server imports). */

export function trimBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function normalizeApiVersion(version: string): string {
  return version.replace(/^\/+|\/+$/g, "") || "v1";
}

export function normalizeEndpointPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/** Resolve full URL: base + version segment + path (base may already end with /api). */
export function buildBookingQubeUrl(
  baseUrl: string,
  apiVersion: string,
  path: string,
): string {
  const base = trimBaseUrl(baseUrl);
  const ver = normalizeApiVersion(apiVersion);
  const p = normalizeEndpointPath(path);
  if (/\/api$/i.test(base)) {
    return `${base}/${ver}${p}`;
  }
  return `${base}/api/${ver}${p}`;
}

/** Substitute `{slug}`, `{formId}`, `{eventId}` in a full admin-configured URL. */
export function resolveBookingQubeFullUrl(
  urlTemplate: string,
  vars: Record<string, string | undefined | null>,
): string {
  let out = urlTemplate.trim();
  for (const [key, value] of Object.entries(vars)) {
    if (value == null || !String(value).trim()) continue;
    out = out.replaceAll(`{${key}}`, encodeURIComponent(String(value).trim()));
  }
  return out;
}
