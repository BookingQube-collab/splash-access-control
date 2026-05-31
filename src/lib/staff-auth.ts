export type AppRole = "admin" | "dashboard" | "pos" | "scanner";

export const STAFF_ROLES: AppRole[] = ["admin", "dashboard", "pos", "scanner"];

export const ROLE_HOME: Record<AppRole, string> = {
  admin: "/admin",
  dashboard: "/dashboard",
  pos: "/pos",
  scanner: "/scanner",
};

/** Prefer admin → dashboard → pos → scanner when a user has multiple roles. */
export const ROLE_PRIORITY: AppRole[] = ["admin", "dashboard", "pos", "scanner"];

export const UNIFIED_LOGIN_PATH = "/login";

export function userHasStaffAccess(roles: AppRole[]): boolean {
  return STAFF_ROLES.some((r) => roles.includes(r));
}

export function userHasRoleAccess(roles: AppRole[], required: AppRole): boolean {
  return roles.includes(required) || roles.includes("admin");
}

/** POS counter module — POS agents and admins only (not scanner-only accounts). */
export function canAccessPosModule(roles: AppRole[]): boolean {
  return roles.includes("pos") || roles.includes("admin");
}

/** Gate scanner module — dedicated scanner, POS agents, and admins. */
export function canAccessScannerModule(roles: AppRole[]): boolean {
  return roles.includes("scanner") || roles.includes("pos") || roles.includes("admin");
}

/** Toggle between POS and Scanner — POS agents and admins only. */
export function canSwitchPosScanner(roles: AppRole[]): boolean {
  return roles.includes("pos") || roles.includes("admin");
}

export function resolveStaffRedirect(roles: AppRole[]): string | null {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return ROLE_HOME[role];
  }
  return null;
}

const STAFF_USERNAME_RE = /^[a-z0-9_-]{3,32}$/;

export function isEmailLikeStaffIdentifier(value: string): boolean {
  return value.trim().includes("@");
}

/** Lowercase username for storage and lookup. Returns null when invalid. */
export function normalizeStaffUsername(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!STAFF_USERNAME_RE.test(v)) return null;
  return v;
}

export function isValidStaffUsername(value: string): boolean {
  return normalizeStaffUsername(value) !== null;
}
