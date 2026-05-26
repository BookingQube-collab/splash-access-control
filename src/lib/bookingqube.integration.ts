/** Shared BookingQube integration DB / migration helpers (client-safe). */

export const BOOKINGQUBE_BOOTSTRAP_MIGRATION_FILE =
  "supabase/migrations/20260521150000_bookingqube_integration_bootstrap.sql";

export function isBookingQubeIntegrationTableError(error: {
  message?: string;
  code?: string;
}): boolean {
  const msg = error.message ?? "";
  return (
    error.code === "PGRST205" ||
    /schema cache/i.test(msg) ||
    /integration_settings/i.test(msg) ||
    /integration_event_mappings/i.test(msg) ||
    /integration_field_mappings/i.test(msg) ||
    /integration_sync_log/i.test(msg)
  );
}

export function bookingQubeIntegrationTableErrorMessage(): string {
  return (
    "BookingQube tables are missing in Supabase. Run the SQL migration " +
    `(${BOOKINGQUBE_BOOTSTRAP_MIGRATION_FILE}) in the Supabase SQL editor, then retry.`
  );
}
