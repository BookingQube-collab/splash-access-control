-- Speed up scanner "recent scans" (filter by scanner, valid only, sort by time).
CREATE INDEX IF NOT EXISTS idx_scan_events_scanner_recent
  ON public.scan_events (scanner_user_id, scanned_at DESC)
  WHERE result = 'valid'::scan_result;
