-- Speed up per-day guest counts for public/POS slot availability (slot_id + status + created_at filters).
CREATE INDEX IF NOT EXISTS idx_registrations_slot_status_created
  ON public.registrations (slot_id, status, created_at);
