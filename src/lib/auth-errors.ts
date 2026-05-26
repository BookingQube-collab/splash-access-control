/** Shown when the session cookie is missing or invalid (not a network fault). */
export const AUTH_SIGN_IN_AGAIN = "Please sign in again";

/** Shown when Supabase auth could not be reached (timeout, reset, DNS, etc.). */
export const AUTH_SESSION_CHECK_FAILED = "Session check failed";

export function isAuthNetworkError(error: unknown): boolean {
  if (!error) return false;

  const parts: string[] = [];
  const collect = (value: unknown, depth = 0) => {
    if (depth > 4 || value == null) return;
    if (typeof value === "string") {
      parts.push(value);
      return;
    }
    if (value instanceof Error) {
      parts.push(value.name, value.message);
      collect(value.cause, depth + 1);
      return;
    }
    if (typeof value === "object") {
      const rec = value as Record<string, unknown>;
      if (typeof rec.message === "string") parts.push(rec.message);
      if (typeof rec.code === "string") parts.push(rec.code);
      collect(rec.cause, depth + 1);
    }
  };

  collect(error);
  const blob = parts.join(" ").toLowerCase();
  return (
    blob.includes("fetch failed") ||
    blob.includes("econnreset") ||
    blob.includes("econnrefused") ||
    blob.includes("etimedout") ||
    blob.includes("enotfound") ||
    blob.includes("network") ||
    blob.includes("abort") ||
    blob.includes("socket hang up") ||
    blob.includes("failed to fetch")
  );
}

export function isAuthSessionMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const rec = error as { name?: string; message?: string; status?: number };
  const name = rec.name?.toLowerCase() ?? "";
  const msg = rec.message?.toLowerCase() ?? "";
  return (
    name.includes("authsessionmissing") ||
    msg.includes("auth session missing") ||
    msg.includes("invalid jwt") ||
    msg.includes("jwt expired") ||
    rec.status === 401
  );
}
