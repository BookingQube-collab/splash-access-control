import { format, isValid, parseISO } from "date-fns";
import type { AdminRegistrationRow } from "@/lib/admin-filter-utils";

/** Matches POS/public insert: `new Date(\`${bookingDate}T12:00:00\`)` for per-day capacity. */
export function isCreatedAtCapacityAnchor(iso: string): boolean {
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return false;
    return (
      d.getHours() === 12 &&
      d.getMinutes() === 0 &&
      d.getSeconds() === 0 &&
      d.getMilliseconds() === 0
    );
  } catch {
    return false;
  }
}

const REGISTRATION_WHEN_FORMAT = "MMM d, yyyy, h:mm a";

/**
 * WHEN column: real `created_at` when it carries a clock time; for capacity-anchored
 * noon timestamps, show booking day + slot start time instead of misleading 12:00 PM.
 */
/** Newest registration first (table default). */
export function sortRegistrationsNewestFirst(
  rows: AdminRegistrationRow[],
): AdminRegistrationRow[] {
  return [...rows].sort((a, b) => {
    const tb = Date.parse(b.created_at);
    const ta = Date.parse(a.created_at);
    if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });
}

export function formatRegistrationWhen(
  createdAt: string,
  slotStartsAt?: string | null,
): string {
  const created = parseISO(createdAt);
  if (!isValid(created)) return "—";

  if (!isCreatedAtCapacityAnchor(createdAt) || !slotStartsAt) {
    return format(created, REGISTRATION_WHEN_FORMAT);
  }

  const slotStart = parseISO(slotStartsAt);
  if (!isValid(slotStart)) {
    return format(created, "MMM d, yyyy");
  }

  return `${format(created, "MMM d, yyyy")}, ${format(slotStart, "h:mm a")}`;
}

export type BookingStats = {
  total: number;
  active: number;
  pending: number;
  checkedIn: number;
  totalGuestsRegistered: number;
};

export type BookingDisplayStatus =
  | "Active"
  | "Checked In"
  | "Pending"
  | "Cancelled"
  | "Exited";

export const BOOKING_STATUS_STYLES: Record<BookingDisplayStatus, string> = {
  Active: "bg-[#e6f7f8] text-[#0d9488]",
  "Checked In": "bg-[#ede9fe] text-[#7c3aed]",
  Pending: "bg-[#ffedd5] text-[#d97706]",
  Cancelled: "bg-[#fee2e2] text-[#dc2626]",
  Exited: "bg-[#f1f5f9] text-[#64748b]",
};

type BookingStatsRow = Pick<AdminRegistrationRow, "status" | "guest_count">;

/** Client-side status counts from loaded registration rows (same dataset as the table). */
export function computeBookingStats(rows: BookingStatsRow[]): BookingStats {
  const stats: BookingStats = {
    total: rows.length,
    active: 0,
    pending: 0,
    checkedIn: 0,
    totalGuestsRegistered: 0,
  };

  for (const row of rows) {
    const guests = row.guest_count ?? 1;
    stats.totalGuestsRegistered += guests;

    if (row.status === "active") {
      stats.pending += guests;
      stats.active += guests;
    } else if (row.status === "entered") {
      stats.checkedIn += guests;
      stats.active += guests;
    }
  }

  return stats;
}

export function bookingDisplayStatus(raw: string): BookingDisplayStatus {
  switch (raw) {
    case "active":
      return "Active";
    case "entered":
      return "Checked In";
    case "expired":
    case "invalid":
      return "Cancelled";
    case "exited":
    case "auto_exited":
      return "Exited";
    default:
      return "Pending";
  }
}

export type EmailDisplayStatus = "Sent" | "Failed" | "Pending" | "No email";

export const EMAIL_STATUS_STYLES: Record<EmailDisplayStatus, string> = {
  Sent: "bg-[#dcfce7] text-[#16a34a]",
  Failed: "bg-[#fee2e2] text-[#dc2626]",
  Pending: "bg-[#ffedd5] text-[#d97706]",
  "No email": "bg-[#f1f5f9] text-[#94a3b8]",
};

/** Maps a registration's email + pass_email_status to a display badge label. */
export function emailDisplayStatus(
  passEmailStatus: string | null | undefined,
  email: string | null | undefined,
): EmailDisplayStatus {
  if (!email?.trim()) return "No email";
  switch (passEmailStatus) {
    case "sent":
      return "Sent";
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
}

export function formatBookingPct(count: number, total: number): string {
  if (total <= 0) return "0.0";
  return ((count / total) * 100).toFixed(1);
}

export function formatBookingsUpdatedLabel(updatedAtMs: number | undefined): string {
  if (!updatedAtMs) return "Updated just now";
  const seconds = Math.floor((Date.now() - updatedAtMs) / 1000);
  if (seconds < 10) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours}h ago`;
}
