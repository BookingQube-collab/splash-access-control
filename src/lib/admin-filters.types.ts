export type AdminFilterMode = "local" | "server";

export type AdminTableFilters = {
  search: string;
  eventId: string;
  slotId: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

export const emptyAdminTableFilters = (): AdminTableFilters => ({
  search: "",
  eventId: "",
  slotId: "",
  status: "",
  dateFrom: "",
  dateTo: "",
});

/** Filters sent to server actions (omits empty strings). */
export type AdminServerFilters = {
  eventId?: string;
  slotId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export function toServerFilters(f: AdminTableFilters): AdminServerFilters | undefined {
  const out: AdminServerFilters = {};
  if (f.eventId) out.eventId = f.eventId;
  if (f.slotId) out.slotId = f.slotId;
  if (f.status) out.status = f.status;
  if (f.dateFrom) out.dateFrom = f.dateFrom;
  if (f.dateTo) out.dateTo = f.dateTo;
  if (f.search.trim()) out.search = f.search.trim();
  return Object.keys(out).length > 0 ? out : undefined;
}

export function hasActiveFilters(f: AdminTableFilters): boolean {
  return !!(
    f.search.trim() ||
    f.eventId ||
    f.slotId ||
    f.status ||
    f.dateFrom ||
    f.dateTo
  );
}

export const REGISTRATION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "entered", label: "Inside" },
  { value: "exited", label: "Exited" },
  { value: "auto_exited", label: "Auto exited" },
  { value: "expired", label: "Expired" },
  { value: "invalid", label: "Invalid" },
];

export function registrationStatusLabel(status: string): string {
  return REGISTRATION_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}
