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

export function resolveStaffRedirect(roles: AppRole[]): string | null {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return ROLE_HOME[role];
  }
  return null;
}
