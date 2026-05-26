-- Allow "skipped" sync log status (e.g. duplicate email already in BookingQube).
ALTER TABLE public.integration_sync_log
  DROP CONSTRAINT IF EXISTS integration_sync_log_status_check;

ALTER TABLE public.integration_sync_log
  ADD CONSTRAINT integration_sync_log_status_check
  CHECK (status IN ('success', 'error', 'pending', 'skipped'));
