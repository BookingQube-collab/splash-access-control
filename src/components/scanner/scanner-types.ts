import { formatSlotTimeRange } from "@/lib/slot-time";

export type RecentScanItem = {
  id: string;
  slotName: string;
  customerName?: string | null;
  phone?: string | null;
  slotStartsAt?: string | null;
  slotEndsAt?: string | null;
  scannedAt: string;
  guestCount?: number;
  mode: "entry" | "exit";
};

export type SlotRegistrationItem = {
  id: string;
  customerName: string;
  mobile: string;
  guestCount: number;
};

/** Scanner right panel: one bookable slot for the active day. */
export type ScannerTodaySlot = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  /** Guest count from public event payload (active + entered). */
  registered: number;
};

/** Bold line: guest name, or slot when anonymous. */
export function recentScanPrimaryName(scan: RecentScanItem): string {
  const name = scan.customerName?.trim();
  return name || scan.slotName;
}

/** Slot time range for list rows, e.g. `4:00 PM – 6:00 PM`. */
export function recentScanTimeRange(scan: RecentScanItem): string {
  if (!scan.slotStartsAt || !scan.slotEndsAt) return "";
  try {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    return `${fmt(scan.slotStartsAt)} – ${fmt(scan.slotEndsAt)}`;
  } catch {
    return formatSlotTimeRange(scan.slotStartsAt, scan.slotEndsAt);
  }
}

export function formatDisplayPhone(phone: string | null | undefined): string {
  const p = phone?.trim();
  return p || "—";
}

export function slotInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatScanTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export function formatGuestCountLabel(count: number): string {
  return count === 1 ? "1 Guest" : `${count} Guests`;
}

const PASTEL_INITIALS = [
  "bg-[#ffe8e3] text-[#c45a4a]",
  "bg-[#e8f4ff] text-[#4a7ab8]",
  "bg-[#e8f8ef] text-[#3d8f5c]",
  "bg-[#fff4e0] text-[#b8860b]",
  "bg-[#f3e8ff] text-[#7c5cad]",
  "bg-[#ffe8f0] text-[#b84a6e]",
] as const;

export function pastelInitialsClass(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) | 0;
  return PASTEL_INITIALS[Math.abs(h) % PASTEL_INITIALS.length];
}
