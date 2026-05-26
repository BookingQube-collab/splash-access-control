import { parseISO } from "date-fns";
import { registrationStatusLabel } from "@/lib/admin-filters.types";
import type { AdminTableFilters } from "@/lib/admin-filters.types";

export type AdminReportsData = {
  totalReg: number;
  totalGuests: number;
  byStatus: Record<string, number>;
  totalScans: number;
  validScans: number;
  invalidScans: number;
  registrationsByDay: { date: string; registrations: number; guests: number }[];
  guestsBySlot: { slotName: string; registrations: number; guests: number }[];
  scansByResult: Record<string, number>;
  scansByMode: Record<string, number>;
  scansByDay: { date: string; total: number; valid: number; invalid: number }[];
  capacityBySlot: {
    slotId: string;
    slotName: string;
    capacity: number;
    booked: number;
    utilizationPct: number;
  }[];
  heatmapRegistrations?: { created_at: string }[];
};

export type ReportsKpiStats = {
  totalReg: number;
  totalGuests: number;
  activeReg: number;
  activePct: number;
  pending: number;
  pendingPct: number;
  checkedIn: number;
  checkedInPct: number;
  cancelled: number;
  cancelledPct: number;
  regGrowthPct: number | null;
  guestGrowthPct: number | null;
};

export type StatusDonutSlice = {
  key: string;
  label: string;
  count: number;
  color: string;
};

export const STATUS_DONUT_COLORS: Record<string, string> = {
  active: "#0d9488",
  pending: "#f97316",
  checkedIn: "#7c3aed",
  cancelled: "#dc2626",
};

const CANCELLED_STATUSES = new Set(["expired", "invalid", "exited", "auto_exited"]);

export function computeReportsKpis(data: AdminReportsData): ReportsKpiStats {
  const by = data.byStatus;
  const pending = by.active ?? 0;
  const checkedIn = by.entered ?? 0;
  const cancelled = [...CANCELLED_STATUSES].reduce((s, k) => s + (by[k] ?? 0), 0);
  const activeReg = pending + checkedIn;
  const totalReg = data.totalReg;
  const activePct = totalReg > 0 ? Math.round((activeReg / totalReg) * 1000) / 10 : 0;
  const pendingPct = totalReg > 0 ? Math.round((pending / totalReg) * 1000) / 10 : 0;
  const checkedInPct = totalReg > 0 ? Math.round((checkedIn / totalReg) * 1000) / 10 : 0;
  const cancelledPct = totalReg > 0 ? Math.round((cancelled / totalReg) * 1000) / 10 : 0;

  return {
    totalReg,
    totalGuests: data.totalGuests,
    activeReg,
    activePct,
    pending,
    pendingPct,
    checkedIn,
    checkedInPct,
    cancelled,
    cancelledPct,
    regGrowthPct: computeRegGrowthPct(data.registrationsByDay),
    guestGrowthPct: computeGuestGrowthPct(data.registrationsByDay),
  };
}

export function computeStatusDonutSlices(stats: ReportsKpiStats): StatusDonutSlice[] {
  return [
    { key: "active", label: "Active", count: stats.activeReg, color: STATUS_DONUT_COLORS.active },
    { key: "pending", label: "Pending", count: stats.pending, color: STATUS_DONUT_COLORS.pending },
    {
      key: "checkedIn",
      label: "Checked In",
      count: stats.checkedIn,
      color: STATUS_DONUT_COLORS.checkedIn,
    },
    {
      key: "cancelled",
      label: "Cancelled",
      count: stats.cancelled,
      color: STATUS_DONUT_COLORS.cancelled,
    },
  ];
}

function growthPctFromSeries<T extends { date: string }>(
  sorted: T[],
  value: (d: T) => number,
): number | null {
  if (sorted.length < 2) return null;
  const last7 = sorted.slice(-7);
  const prev7 = sorted.slice(-14, -7);
  if (last7.length === 0) return null;
  const recent = last7.reduce((s, d) => s + value(d), 0);
  const prior = prev7.reduce((s, d) => s + value(d), 0);
  if (prior === 0) return recent > 0 ? 100 : null;
  return Math.round(((recent - prior) / prior) * 10) / 10;
}

export function computeRegGrowthPct(
  days: { date: string; registrations: number }[],
): number | null {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  return growthPctFromSeries(sorted, (d) => d.registrations);
}

export function computeGuestGrowthPct(
  days: { date: string; guests: number }[],
): number | null {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  return growthPctFromSeries(sorted, (d) => d.guests);
}

export function overallCapacityTotals(
  capacityBySlot: AdminReportsData["capacityBySlot"],
): { booked: number; capacity: number; pct: number } {
  const booked = capacityBySlot.reduce((s, c) => s + c.booked, 0);
  const capacity = capacityBySlot.reduce((s, c) => s + c.capacity, 0);
  const pct = capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
  return { booked, capacity, pct };
}

export type DayTrendStats = {
  highest: number;
  average: number;
  growthPct: number | null;
};

export function computeDayTrendStats(
  days: { date: string; registrations?: number; total?: number }[],
  valueKey: "registrations" | "total" = "registrations",
): DayTrendStats {
  const values = days.map((d) => (valueKey === "total" ? (d.total ?? 0) : (d.registrations ?? 0)));
  const highest = values.length ? Math.max(...values) : 0;
  const average = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const growthPct =
    valueKey === "registrations"
      ? computeRegGrowthPct(days as { date: string; registrations: number }[])
      : computeScanGrowthPct(days as { date: string; total: number }[]);
  return { highest, average, growthPct };
}

function computeScanGrowthPct(days: { date: string; total: number }[]): number | null {
  if (days.length < 2) return null;
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const last7 = sorted.slice(-7);
  const prev7 = sorted.slice(-14, -7);
  const recent = last7.reduce((s, d) => s + d.total, 0);
  const prior = prev7.reduce((s, d) => s + d.total, 0);
  if (prior === 0) return recent > 0 ? 100 : null;
  return Math.round(((recent - prior) / prior) * 100);
}

export function sliceLastNDays<T extends { date: string }>(rows: T[], n: number): T[] {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(-n);
}

export type TopEventRow = {
  eventId: string;
  eventName: string;
  registrations: number;
  guests: number;
};

export function computeTopEvents(
  guestsBySlot: (AdminReportsData["guestsBySlot"][number] & { slotId?: string })[],
  slotIdToEventId: Map<string, string>,
  eventNames: Map<string, string>,
  limit = 5,
): TopEventRow[] {
  const byEvent = new Map<string, { registrations: number; guests: number }>();
  for (const row of guestsBySlot) {
    if (!row.slotId) continue;
    const eventId = slotIdToEventId.get(row.slotId);
    if (!eventId) continue;
    const cur = byEvent.get(eventId) ?? { registrations: 0, guests: 0 };
    cur.registrations += row.registrations;
    cur.guests += row.guests;
    byEvent.set(eventId, cur);
  }
  return [...byEvent.entries()]
    .map(([eventId, v]) => ({
      eventId,
      eventName: eventNames.get(eventId) ?? "Unknown event",
      registrations: v.registrations,
      guests: v.guests,
    }))
    .sort((a, b) => b.registrations - a.registrations)
    .slice(0, limit);
}

/** Attach slotId to guestsBySlot rows when building from capacity data */
export function guestsBySlotWithIds(
  guestsBySlot: AdminReportsData["guestsBySlot"],
  capacityBySlot: AdminReportsData["capacityBySlot"],
): (AdminReportsData["guestsBySlot"][number] & { slotId: string })[] {
  const nameToId = new Map(capacityBySlot.map((s) => [s.slotName, s.slotId]));
  return guestsBySlot.map((g) => ({
    ...g,
    slotId: nameToId.get(g.slotName) ?? "",
  }));
}

export type CapacityGaugeGroup = {
  label: string;
  utilizationPct: number;
  booked: number;
  capacity: number;
};

const GAUGE_MATCHERS: { label: string; test: RegExp }[] = [
  { label: "Park", test: /park/i },
  { label: "General", test: /general|day|morning/i },
  { label: "Night", test: /night|evening/i },
];

export function groupCapacityGauges(
  capacityBySlot: AdminReportsData["capacityBySlot"],
): CapacityGaugeGroup[] {
  const groups: CapacityGaugeGroup[] = GAUGE_MATCHERS.map((m) => ({
    label: m.label,
    utilizationPct: 0,
    booked: 0,
    capacity: 0,
  }));

  const used = new Set<string>();
  for (const slot of capacityBySlot) {
    let idx = GAUGE_MATCHERS.findIndex((m) => m.test.test(slot.slotName));
    if (idx < 0) {
      const fallback = groups.findIndex((g) => g.capacity === 0);
      idx = fallback >= 0 ? fallback : 0;
    }
    groups[idx].booked += slot.booked;
    groups[idx].capacity += slot.capacity;
    used.add(slot.slotId);
  }

  return groups.map((g) => ({
    ...g,
    utilizationPct:
      g.capacity > 0 ? Math.min(100, Math.round((g.booked / g.capacity) * 100)) : 0,
  }));
}

export function overallUtilization(capacityBySlot: AdminReportsData["capacityBySlot"]): number {
  const booked = capacityBySlot.reduce((s, c) => s + c.booked, 0);
  const cap = capacityBySlot.reduce((s, c) => s + c.capacity, 0);
  return cap > 0 ? Math.min(100, Math.round((booked / cap) * 100)) : 0;
}

export type HeatmapCell = { day: string; hour: number; value: number };

/** Mon=0 … Sun=6; columns align with `HEATMAP_HOURS` (local time). */
export const HEATMAP_HOUR_START = 8;
export const HEATMAP_HOUR_END = 20;
export const HEATMAP_HOURS: number[] = Array.from(
  { length: HEATMAP_HOUR_END - HEATMAP_HOUR_START + 1 },
  (_, i) => i + HEATMAP_HOUR_START,
);

export function formatHeatmapHourLabel(hour: number): string {
  if (hour === 0) return "12AM";
  if (hour < 12) return `${hour}AM`;
  if (hour === 12) return "12PM";
  return `${hour - 12}PM`;
}

function weekdayIndexFromDate(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function weekdayIndexFromYmd(ymd: string): number {
  const d = parseISO(`${ymd}T12:00:00`);
  return Number.isNaN(d.getTime()) ? 0 : weekdayIndexFromDate(d);
}

/** Bucket registrations by local day-of-week and hour (`created_at`). */
export function buildHeatmapMatrixFromRegistrations(
  registrations: { created_at: string }[],
): number[][] {
  const matrix: number[][] = Array.from({ length: 7 }, () =>
    HEATMAP_HOURS.map(() => 0),
  );
  for (const row of registrations) {
    const d = parseISO(row.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const wi = weekdayIndexFromDate(d);
    const hour = d.getHours();
    const hi = HEATMAP_HOURS.indexOf(hour);
    if (hi < 0) continue;
    matrix[wi][hi] += 1;
  }
  return matrix;
}

/** Daily-only fallback: spread each day's count across `HEATMAP_HOURS`. */
export function buildHeatmapMatrixFromDaily(
  registrationsByDay: AdminReportsData["registrationsByDay"],
): number[][] {
  const matrix: number[][] = Array.from({ length: 7 }, () =>
    HEATMAP_HOURS.map(() => 0),
  );
  const cells = deriveHeatmapFromDaily(registrationsByDay);
  for (const cell of cells) {
    const wi = weekdayIndexFromYmd(cell.day);
    const hi = HEATMAP_HOURS.indexOf(cell.hour);
    if (hi < 0) continue;
    matrix[wi][hi] += cell.value;
  }
  return matrix;
}

export function heatmapMatrixTotal(matrix: number[][]): number {
  return matrix.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);
}

export function hasHeatmapSourceData(
  registrations: { created_at: string }[],
  registrationsByDay: AdminReportsData["registrationsByDay"],
): boolean {
  if (registrations.length > 0) return true;
  return registrationsByDay.some((d) => d.registrations > 0);
}

/** @deprecated Prefer `buildHeatmapMatrixFromRegistrations` / `buildHeatmapMatrixFromDaily`. */
export function deriveHeatmapFromDaily(
  registrationsByDay: AdminReportsData["registrationsByDay"],
): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (const day of registrationsByDay) {
    if (day.registrations <= 0) continue;
    const perHour = Math.max(1, Math.round(day.registrations / HEATMAP_HOURS.length));
    let remainder = day.registrations;
    HEATMAP_HOURS.forEach((hour, i) => {
      const value =
        i === HEATMAP_HOURS.length - 1 ? remainder : Math.min(remainder, perHour);
      remainder -= value;
      if (value > 0) cells.push({ day: day.date, hour, value });
    });
  }
  return cells;
}

export function scanSuccessRate(valid: number, invalid: number): number {
  const total = valid + invalid;
  return total > 0 ? Math.round((valid / total) * 100) : 0;
}

export function exportReportsCsv(
  data: AdminReportsData,
  filters: AdminTableFilters,
  eventLabel?: string,
  slotLabel?: string,
): void {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: string[] = [
    "SummerSplash Admin Report",
    `Generated,${new Date().toISOString()}`,
    "",
    "Filters",
    `Search,${escape(filters.search || "—")}`,
    `Event,${escape(eventLabel || filters.eventId || "All")}`,
    `Slot,${escape(slotLabel || filters.slotId || "All")}`,
    `Status,${escape(filters.status ? registrationStatusLabel(filters.status) : "All")}`,
    `Date From,${escape(filters.dateFrom || "—")}`,
    `Date To,${escape(filters.dateTo || "—")}`,
    "",
    "Summary",
    `Total Registrations,${data.totalReg}`,
    `Total Guests,${data.totalGuests}`,
    `Valid Scans,${data.validScans}`,
    `Invalid Scans,${data.invalidScans}`,
    "",
    "By Status",
    "Status,Count",
  ];

  for (const [status, count] of Object.entries(data.byStatus)) {
    lines.push(`${escape(registrationStatusLabel(status))},${count}`);
  }

  lines.push("", "Registrations By Day", "Date,Registrations,Guests");
  for (const row of data.registrationsByDay) {
    lines.push(`${row.date},${row.registrations},${row.guests}`);
  }

  lines.push("", "Scans By Day", "Date,Total,Valid,Invalid");
  for (const row of data.scansByDay) {
    lines.push(`${row.date},${row.total},${row.valid},${row.invalid}`);
  }

  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `summersplash-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatReportsUpdatedLabel(updatedAtMs: number | undefined): string {
  if (!updatedAtMs) return "Updated just now";
  const seconds = Math.floor((Date.now() - updatedAtMs) / 1000);
  if (seconds < 10) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours}h ago`;
}
