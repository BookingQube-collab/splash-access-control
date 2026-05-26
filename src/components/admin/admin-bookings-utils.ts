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

/** Client-side status counts from loaded registration rows (same dataset as the table). */
export function computeBookingStats(rows: AdminRegistrationRow[]): BookingStats {
  const stats: BookingStats = {
    total: rows.length,
    active: 0,
    pending: 0,
    checkedIn: 0,
    totalGuestsRegistered: 0,
  };

  for (const row of rows) {
    stats.totalGuestsRegistered += row.guest_count ?? 0;

    if (row.status === "active") {
      stats.pending++;
      stats.active++;
    } else if (row.status === "entered") {
      stats.checkedIn++;
      stats.active++;
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
