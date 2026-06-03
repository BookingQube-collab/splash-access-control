import { format, parseISO } from "date-fns";
import type { AdminFilterChip } from "@/hooks/use-admin-table-filters";
import type { AdminTableFilters } from "@/lib/admin-filters.types";
import { registrationStatusLabel } from "@/lib/admin-filters.types";
import { posAgeGroupLabel, posNationalityLabel } from "@/lib/pos-customer-demographics";
import type { PosAgeGroup, PosNationality } from "@/lib/pos-customer-demographics";

export type AdminRegistrationRow = {
  id: string;
  customer_name: string;
  mobile: string;
  email?: string | null;
  guest_count: number;
  nationality?: string | null;
  age_group?: string | null;
  status: string;
  created_at: string;
  qr_token: string;
  slot_id?: string;
  pass_email_status?: string | null;
  pass_email_sent_at?: string | null;
  pass_email_error?: string | null;
  slots?: {
    id?: string;
    name?: string;
    capacity?: number;
    starts_at?: string;
    ends_at?: string;
    event_id?: string;
    events?: { id?: string; name?: string } | null;
  } | null;
};

export type AdminSlotRow = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  event_id: string;
  hidden_from_booking?: boolean;
  events?: { name?: string } | null;
};

function rowYmd(iso: string): string {
  try {
    return format(parseISO(iso), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

function matchesSearch(haystack: string, q: string): boolean {
  if (!q) return true;
  return haystack.toLowerCase().includes(q.toLowerCase());
}

function matchesDateRange(iso: string, from: string, to: string): boolean {
  const ymd = rowYmd(iso);
  if (!ymd) return true;
  if (from && ymd < from) return false;
  if (to && ymd > to) return false;
  return true;
}

export function filterRegistrationRow(
  row: AdminRegistrationRow,
  f: AdminTableFilters,
  search: string,
): boolean {
  const slot = row.slots;
  const eventName = slot?.events?.name ?? "";
  const slotName = slot?.name ?? "";
  const capacity = String(slot?.capacity ?? "");
  const guestCount = String(row.guest_count);

  if (f.eventId && slot?.event_id !== f.eventId && slot?.events?.id !== f.eventId) return false;
  if (f.slotId && row.slot_id !== f.slotId && slot?.id !== f.slotId) return false;
  if (f.status && row.status !== f.status) return false;
  if (f.nationality && row.nationality !== f.nationality) return false;
  if (f.ageGroup && row.age_group !== f.ageGroup) return false;
  if (!matchesDateRange(row.created_at, f.dateFrom, f.dateTo)) return false;

  if (search) {
    const nationalityLabel = row.nationality
      ? posNationalityLabel(row.nationality as PosNationality)
      : "";
    const ageGroupLabel = row.age_group ? posAgeGroupLabel(row.age_group as PosAgeGroup) : "";
    const blob = [
      row.customer_name,
      row.mobile,
      row.email ?? "",
      row.nationality ?? "",
      nationalityLabel,
      row.age_group ?? "",
      ageGroupLabel,
      eventName,
      slotName,
      row.status,
      registrationStatusLabel(row.status),
      capacity,
      guestCount,
      rowYmd(row.created_at),
    ].join(" ");
    if (!matchesSearch(blob, search)) return false;
  }

  return true;
}

export function filterSlotRow(row: AdminSlotRow, f: AdminTableFilters, search: string): boolean {
  const eventName = row.events?.name ?? "";
  if (f.eventId && row.event_id !== f.eventId) return false;
  if (f.slotId && row.id !== f.slotId) return false;
  if (!matchesDateRange(row.starts_at, f.dateFrom, f.dateTo)) return false;

  if (search) {
    const blob = [
      row.name,
      eventName,
      String(row.capacity),
      rowYmd(row.starts_at),
      rowYmd(row.ends_at),
    ].join(" ");
    if (!matchesSearch(blob, search)) return false;
  }

  return true;
}

export function buildRegistrationFilterChips(
  f: AdminTableFilters,
  eventLabel: (id: string) => string,
  slotLabel: (id: string) => string,
): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (f.search.trim()) chips.push({ key: "search", label: `Search: ${f.search.trim()}` });
  if (f.eventId) chips.push({ key: "eventId", label: `Event: ${eventLabel(f.eventId)}` });
  if (f.slotId) chips.push({ key: "slotId", label: `Slot: ${slotLabel(f.slotId)}` });
  if (f.status) chips.push({ key: "status", label: `Status: ${registrationStatusLabel(f.status)}` });
  if (f.nationality) {
    chips.push({
      key: "nationality",
      label: `Nationality: ${posNationalityLabel(f.nationality as PosNationality)}`,
    });
  }
  if (f.ageGroup) {
    chips.push({
      key: "ageGroup",
      label: `Age group: ${posAgeGroupLabel(f.ageGroup as PosAgeGroup)}`,
    });
  }
  if (f.dateFrom) chips.push({ key: "dateFrom", label: `From: ${f.dateFrom}` });
  if (f.dateTo) chips.push({ key: "dateTo", label: `To: ${f.dateTo}` });
  return chips;
}

export function buildSlotFilterChips(
  f: AdminTableFilters,
  eventLabel: (id: string) => string,
  slotLabel: (id: string) => string,
): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (f.search.trim()) chips.push({ key: "search", label: `Search: ${f.search.trim()}` });
  if (f.eventId) chips.push({ key: "eventId", label: `Event: ${eventLabel(f.eventId)}` });
  if (f.slotId) chips.push({ key: "slotId", label: `Slot: ${slotLabel(f.slotId)}` });
  if (f.dateFrom) chips.push({ key: "dateFrom", label: `From: ${f.dateFrom}` });
  if (f.dateTo) chips.push({ key: "dateTo", label: `To: ${f.dateTo}` });
  return chips;
}
