import { format, isAfter, isBefore, subDays } from "date-fns";

export type StaffRole = "admin" | "dashboard" | "pos" | "scanner";

export const STAFF_ROLES: StaffRole[] = ["admin", "dashboard", "pos", "scanner"];

export const SYSTEM_ROLE_COUNT = STAFF_ROLES.length;

export type AdminGuestRow = {
  id: string;
  email: string;
  username: string | null;
  created_at: string;
  roles: string[];
};

export type GuestStats = {
  total: number;
  active: number;
  newThisWeek: number;
  roles: number;
  totalGrowthPct: number | null;
  newWeekGrowthPct: number | null;
};

export type GuestFilters = {
  search: string;
  role: string;
  status: string;
  lastActive: string;
};

export const emptyGuestFilters = (): GuestFilters => ({
  search: "",
  role: "",
  status: "",
  lastActive: "",
});

export const GUEST_PAGE_SIZE = 8;

const AVATAR_PALETTES = [
  { bg: "bg-[#ccfbf1]", text: "text-[#0f766e]" },
  { bg: "bg-[#dbeafe]", text: "text-[#2563eb]" },
  { bg: "bg-[#ede9fe]", text: "text-[#7c3aed]" },
  { bg: "bg-[#ffedd5]", text: "text-[#d97706]" },
  { bg: "bg-[#fce7f3]", text: "text-[#db2777]" },
  { bg: "bg-[#dcfce7]", text: "text-[#16a34a]" },
] as const;

export function guestInitials(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  const clean = local.replace(/[^a-zA-Z]/g, "");
  if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
  return (email.slice(0, 2) || "??").toUpperCase();
}

export function guestAvatarPalette(index: number) {
  return AVATAR_PALETTES[index % AVATAR_PALETTES.length]!;
}

export function guestDisplayName(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  }
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function isGuestActive(user: AdminGuestRow): boolean {
  return user.roles.length > 0;
}

export function formatGuestPct(part: number, total: number): string {
  if (total <= 0) return "0";
  return ((part / total) * 100).toFixed(1);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function createdInRange(user: AdminGuestRow, from: Date, to: Date): boolean {
  const d = new Date(user.created_at);
  return !isBefore(d, from) && isBefore(d, to);
}

export function computeGuestStats(users: AdminGuestRow[]): GuestStats {
  const now = new Date();
  const weekAgo = subDays(now, 7);
  const twoWeeksAgo = subDays(now, 14);

  const total = users.length;
  const active = users.filter(isGuestActive).length;
  const newThisWeek = users.filter((u) => isAfter(new Date(u.created_at), weekAgo)).length;

  const totalSevenDaysAgo = users.filter((u) =>
    isBefore(new Date(u.created_at), weekAgo),
  ).length;

  const createdPrev7 = users.filter((u) =>
    createdInRange(u, twoWeeksAgo, weekAgo),
  ).length;

  return {
    total,
    active,
    newThisWeek,
    roles: SYSTEM_ROLE_COUNT,
    totalGrowthPct: pctChange(total, totalSevenDaysAgo),
    newWeekGrowthPct: pctChange(newThisWeek, createdPrev7),
  };
}

export function filterGuestRows(users: AdminGuestRow[], filters: GuestFilters): AdminGuestRow[] {
  const q = filters.search.trim().toLowerCase();
  const now = new Date();

  return users.filter((u) => {
    if (q) {
      const name = guestDisplayName(u.email).toLowerCase();
      const username = u.username?.toLowerCase() ?? "";
      if (
        !u.email.toLowerCase().includes(q) &&
        !name.includes(q) &&
        !username.includes(q)
      ) {
        return false;
      }
    }

    if (filters.role && !u.roles.includes(filters.role)) return false;

    if (filters.status === "active" && !isGuestActive(u)) return false;
    if (filters.status === "inactive" && isGuestActive(u)) return false;

    if (filters.lastActive) {
      const created = new Date(u.created_at);
      if (filters.lastActive === "7d" && !isAfter(created, subDays(now, 7))) return false;
      if (filters.lastActive === "30d" && !isAfter(created, subDays(now, 30))) return false;
      if (filters.lastActive === "90d" && !isAfter(created, subDays(now, 90))) return false;
    }

    return true;
  });
}

/** Last active is approximated from account creation (no sign-in field in list API). */
export function guestLastActiveAt(user: AdminGuestRow): Date {
  return new Date(user.created_at);
}

export function formatGuestDateLines(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: format(d, "MMM d, yyyy"),
    time: format(d, "h:mm a"),
  };
}

export function exportGuestsCsv(users: AdminGuestRow[]): void {
  const header = ["email", "username", "roles", "status", "created_at"];
  const lines = users.map((u) => {
    const status = isGuestActive(u) ? "active" : "inactive";
    const roles = u.roles.join("|");
    const created = u.created_at;
    return [u.email, u.username ?? "", roles, status, created]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `guests-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (current > 3) out.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    out.push(p);
  }
  if (current < total - 2) out.push("…");
  out.push(total);
  return out;
}
