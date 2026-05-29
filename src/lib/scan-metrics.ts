/** Scan row shape when joined with registration status (admin reports / dashboard). */
export type ScanEventWithRegistration = {
  result: string;
  registration_id: string | null;
  registrations?: { status: string } | { status: string }[] | null;
};

export function registrationStatusFromScanRow(
  row: ScanEventWithRegistration,
): string | undefined {
  const reg = row.registrations;
  if (!reg) return undefined;
  return Array.isArray(reg) ? reg[0]?.status : reg.status;
}

/**
 * Invalid scan attempts that still need staff attention.
 * Excludes duplicate/error events for guests who already checked in (status entered/exited).
 */
const CHECKED_IN_STATUSES = new Set(["entered", "exited", "auto_exited"]);

export function isActionableInvalidScan(
  row: Pick<ScanEventWithRegistration, "result" | "registration_id">,
  registrationStatus?: string | null,
): boolean {
  if (row.result !== "invalid") return false;
  if (!row.registration_id) return true;
  return !CHECKED_IN_STATUSES.has(registrationStatus ?? "");
}

export function countActionableInvalidScans(rows: ScanEventWithRegistration[]): number {
  return rows.filter((row) =>
    isActionableInvalidScan(row, registrationStatusFromScanRow(row)),
  ).length;
}

/** Successful scanner entry check-in (matches `scanQR` insert). */
export function isValidEntryCheckin(row: { mode: string; result: string }): boolean {
  return row.mode === "entry" && row.result === "valid";
}
