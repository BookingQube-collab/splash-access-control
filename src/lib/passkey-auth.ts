import { supabase } from "@/integrations/supabase/client";

import {
  resolveStaffRedirect,
  userHasRoleAccess,
  userHasStaffAccess,
  type AppRole,
} from "@/lib/staff-auth";

/** GoTrue error code when PASSKEY_ENABLED is false in the Supabase project. */
export const PASSKEY_DISABLED_CODE = "passkey_disabled";

const passkeyEnabledCacheKey = "summersplash-passkeys-enabled";
/** Persists "passkeys off / unavailable" so we avoid re-probing (and 404 console noise). */
const passkeyDisabledPersistKey = "summersplash-passkeys-unavailable-at";

const SESSION_CACHE_MS = 5 * 60 * 1000;
const DISABLED_PERSIST_MS = 7 * 24 * 60 * 60 * 1000;

let probeInFlight: Promise<boolean> | null = null;

/**
 * Optional override — defaults to disabled when unset (no automatic API probes).
 * Set `NEXT_PUBLIC_SUPABASE_PASSKEYS_ENABLED=true` when passkeys are on in Supabase.
 */
function readPasskeysEnvOverride(): boolean | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_PASSKEYS_ENABLED?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return null;
}

/** Passkeys treated as off unless env explicitly true. */
function isPasskeysEnvDisabled(): boolean {
  return readPasskeysEnvOverride() !== true;
}

/** Whether this browser can run WebAuthn passkey ceremonies. */
export function isPasskeySupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof PublicKeyCredential !== "undefined" &&
    typeof navigator?.credentials?.get === "function"
  );
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as { status?: number; statusCode?: number };
  if (typeof e.status === "number") return e.status;
  if (typeof e.statusCode === "number") return e.statusCode;
  return undefined;
}

export function isPasskeysDisabledError(error: {
  message?: string;
  code?: string;
}): boolean {
  return (
    error.code === PASSKEY_DISABLED_CODE ||
    /passkeys?\s+are\s+disabled/i.test(error.message ?? "")
  );
}

/** Passkeys off, route missing (404), or GoTrue passkey API not available. */
export function isPasskeysUnavailableError(error: {
  message?: string;
  code?: string;
  status?: number;
}): boolean {
  if (isPasskeysDisabledError(error)) return true;
  const status = error.status ?? getErrorStatus(error);
  if (status === 404 || status === 405 || status === 501) return true;
  const msg = (error.message ?? "").toLowerCase();
  return (
    /\b404\b/.test(msg) ||
    /not\s+found/i.test(msg) ||
    /route\s+not\s+found/i.test(msg) ||
    /passkeys?\s+(api|endpoint|route)/i.test(msg)
  );
}

export const PASSKEY_SETUP_USER_MESSAGE =
  "Passkeys are off in your Supabase project. Open Authentication → Passkeys in the dashboard, " +
  "turn passkeys on, and set Site URL to this app's origin (e.g. http://localhost:3000 for local dev).";

/** Supabase dashboard URL for Auth → Passkeys (project ref from API URL). */
export function getPasskeysDashboardUrl(supabaseUrl?: string): string {
  const url = supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      const ref = new URL(url).hostname.split(".")[0];
      if (ref) {
        return `https://supabase.com/dashboard/project/${ref}/auth/passkeys`;
      }
    } catch {
      /* ignore */
    }
  }
  return "https://supabase.com/dashboard/project/_/auth/passkeys";
}

export function formatPasskeyError(error: { message?: string; code?: string; status?: number }): string {
  if (isPasskeysUnavailableError(error)) {
    return PASSKEY_SETUP_USER_MESSAGE;
  }
  return error.message ?? "Passkey operation failed";
}

function readPersistedUnavailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(passkeyDisabledPersistKey);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at) || Date.now() - at > DISABLED_PERSIST_MS) {
      localStorage.removeItem(passkeyDisabledPersistKey);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function writePersistedUnavailable(): void {
  try {
    localStorage.setItem(passkeyDisabledPersistKey, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function clearPersistedUnavailable(): void {
  try {
    localStorage.removeItem(passkeyDisabledPersistKey);
  } catch {
    /* ignore */
  }
}

function readPasskeyEnabledCache(): boolean | null {
  try {
    const raw = sessionStorage.getItem(passkeyEnabledCacheKey);
    if (!raw) return null;
    const { enabled, at } = JSON.parse(raw) as { enabled: boolean; at: number };
    if (Date.now() - at > SESSION_CACHE_MS) return null;
    return enabled;
  } catch {
    return null;
  }
}

function writePasskeyEnabledCache(enabled: boolean): void {
  try {
    sessionStorage.setItem(
      passkeyEnabledCacheKey,
      JSON.stringify({ enabled, at: Date.now() }),
    );
    if (enabled) clearPersistedUnavailable();
    else writePersistedUnavailable();
  } catch {
    /* ignore */
  }
}

async function probePasskeysEnabledImpl(): Promise<boolean> {
  const { error } = await supabase.auth.passkey.startAuthentication();
  if (!error) {
    writePasskeyEnabledCache(true);
    return true;
  }
  const status = getErrorStatus(error);
  const normalized = {
    message: error.message,
    code: error.code,
    status,
  };
  if (isPasskeysUnavailableError(normalized)) {
    writePasskeyEnabledCache(false);
    return false;
  }
  // Ambiguous failure — treat as unavailable so we do not show passkey UI or spam retries.
  writePasskeyEnabledCache(false);
  return false;
}

/**
 * Passkey availability without network I/O — env override, session cache, or persisted "unavailable".
 * Unknown/unset env defaults to disabled.
 */
export function getPasskeysStatusSync(): boolean {
  if (!isPasskeySupported()) return false;
  const envOverride = readPasskeysEnvOverride();
  if (envOverride === true) return true;
  if (envOverride === false) return false;
  if (readPersistedUnavailable()) return false;
  const cached = readPasskeyEnabledCache();
  if (cached !== null) return cached;
  return false;
}

export type ProbePasskeysOptions = {
  /** When true, hits GoTrue authentication/options (e.g. Admin → Passkeys → Re-check). */
  forceProbe?: boolean;
};

/**
 * Whether the linked Supabase project has passkeys enabled (GoTrue PASSKEY_ENABLED).
 * By default returns sync status only — no network call unless `forceProbe: true`.
 */
export async function probePasskeysEnabled(options?: ProbePasskeysOptions): Promise<boolean> {
  if (!isPasskeySupported()) return false;

  if (!options?.forceProbe) {
    return getPasskeysStatusSync();
  }

  if (!probeInFlight) {
    probeInFlight = probePasskeysEnabledImpl().finally(() => {
      probeInFlight = null;
    });
  }
  return probeInFlight;
}

/** Clears cached availability (e.g. after enabling passkeys in Supabase). */
export function clearPasskeysAvailabilityCache(): void {
  try {
    sessionStorage.removeItem(passkeyEnabledCacheKey);
    clearPersistedUnavailable();
  } catch {
    /* ignore */
  }
  probeInFlight = null;
}

export async function fetchUserRoles(userId: string): Promise<AppRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
}

export function userHasRole(roles: AppRole[], required: AppRole): boolean {
  return userHasRoleAccess(roles, required);
}

export async function assertStaffAccess(
  userId: string,
): Promise<
  { ok: true; roles: AppRole[]; redirectTo: string } | { ok: false; message: string }
> {
  const roles = await fetchUserRoles(userId);
  const redirectTo = resolveStaffRedirect(roles);
  if (!redirectTo || !userHasStaffAccess(roles)) {
    await supabase.auth.signOut();
    return { ok: false, message: "This account doesn't have staff access." };
  }
  return { ok: true, roles, redirectTo };
}

export async function assertRoleForUser(
  userId: string,
  role: AppRole,
): Promise<{ ok: true; roles: AppRole[] } | { ok: false; message: string }> {
  const roles = await fetchUserRoles(userId);
  if (!userHasRole(roles, role)) {
    await supabase.auth.signOut();
    return { ok: false, message: `This account doesn't have ${role} access.` };
  }
  return { ok: true, roles };
}

export async function signInWithPasskeyForRole(
  role: AppRole,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await probePasskeysEnabled())) {
    return { ok: false, message: PASSKEY_SETUP_USER_MESSAGE };
  }
  const { data, error } = await supabase.auth.signInWithPasskey();
  if (error) {
    if (isPasskeysUnavailableError({ ...error, status: getErrorStatus(error) })) {
      writePasskeyEnabledCache(false);
    }
    return { ok: false, message: formatPasskeyError({ ...error, status: getErrorStatus(error) }) };
  }
  if (!data?.user) return { ok: false, message: "Passkey sign-in failed" };
  const check = await assertRoleForUser(data.user.id, role);
  if (!check.ok) return check;
  return { ok: true };
}

export async function signInWithPasskeyForStaff(): Promise<
  { ok: true; redirectTo: string } | { ok: false; message: string }
> {
  if (!(await probePasskeysEnabled())) {
    return { ok: false, message: PASSKEY_SETUP_USER_MESSAGE };
  }
  const { data, error } = await supabase.auth.signInWithPasskey();
  if (error) {
    if (isPasskeysUnavailableError({ ...error, status: getErrorStatus(error) })) {
      writePasskeyEnabledCache(false);
    }
    return { ok: false, message: formatPasskeyError({ ...error, status: getErrorStatus(error) }) };
  }
  if (!data?.user) return { ok: false, message: "Passkey sign-in failed" };
  const check = await assertStaffAccess(data.user.id);
  if (!check.ok) return check;
  return { ok: true, redirectTo: check.redirectTo };
}

export async function registerPasskey(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await probePasskeysEnabled())) {
    return { ok: false, message: PASSKEY_SETUP_USER_MESSAGE };
  }
  const { error } = await supabase.auth.registerPasskey();
  if (error) {
    const normalized = { ...error, status: getErrorStatus(error) };
    if (isPasskeysUnavailableError(normalized)) writePasskeyEnabledCache(false);
    return { ok: false, message: formatPasskeyError(normalized) };
  }
  writePasskeyEnabledCache(true);
  return { ok: true };
}

export async function countMyPasskeys(): Promise<number | null> {
  if (!(await probePasskeysEnabled())) return null;
  const { data, error } = await supabase.auth.passkey.list();
  if (error) {
    const normalized = { ...error, status: getErrorStatus(error) };
    if (isPasskeysUnavailableError(normalized)) {
      writePasskeyEnabledCache(false);
      return null;
    }
    return 0;
  }
  return data?.length ?? 0;
}

const skipKey = (userId: string) => `summersplash-passkey-skip-${userId}`;

export function shouldOfferPasskeyEnrollment(userId: string): boolean {
  if (!isPasskeySupported()) return false;
  if (isPasskeysEnvDisabled()) return false;
  if (readPersistedUnavailable()) return false;
  try {
    return localStorage.getItem(skipKey(userId)) !== "1";
  } catch {
    return true;
  }
}

export function dismissPasskeyEnrollment(userId: string): void {
  try {
    localStorage.setItem(skipKey(userId), "1");
  } catch {
    /* ignore */
  }
}
