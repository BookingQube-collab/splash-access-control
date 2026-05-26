function projectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/i);
  return match?.[1] ?? null;
}

function jwtPayload(token: string): { role?: string; ref?: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString()) as {
      role?: string;
      ref?: string;
    };
  } catch {
    return null;
  }
}

export type SupabaseServiceRoleCheckInput = {
  supabaseUrl?: string;
  serviceRoleKey?: string;
};

/** Returns a user-facing message when the service role key does not match the configured project URL. */
export function getSupabaseServiceRoleConfigError(
  input?: SupabaseServiceRoleCheckInput,
): string | null {
  const url =
    input?.supabaseUrl?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ??
    process.env.SUPABASE_URL?.trim();
  const key = input?.serviceRoleKey?.trim() ?? process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key || !url) return null;

  const urlRef = projectRefFromUrl(url);
  if (!urlRef) return null;

  if (key.startsWith("sb_publishable_")) {
    return "SUPABASE_SERVICE_ROLE_KEY is set to the publishable key. Use the secret service_role key from Supabase → Settings → API (same project as your URL).";
  }

  if (key.startsWith("sbp_")) {
    return "SUPABASE_SERVICE_ROLE_KEY looks like a personal access token (sbp_…). Use the project's service_role secret from Supabase → Settings → API.";
  }

  if (key.startsWith("eyJ")) {
    const claims = jwtPayload(key);
    if (claims?.role && claims.role !== "service_role") {
      return `SUPABASE_SERVICE_ROLE_KEY has role "${claims.role}", not service_role. Paste the service_role secret, not the anon/publishable JWT.`;
    }
    if (claims?.ref && claims.ref !== urlRef) {
      return `Service role key is for Supabase project "${claims.ref}" but your URL is project "${urlRef}". Open the ${urlRef} project in the dashboard and copy its service_role key.`;
    }
  }

  return null;
}

export function isSupabaseInvalidKeyError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("invalid") && (m.includes("api key") || m.includes("jwt"));
}
