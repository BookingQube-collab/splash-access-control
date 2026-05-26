-- Optional BookingQube numeric event_id override per local event (POST submit)

ALTER TABLE public.integration_event_mappings
  ADD COLUMN IF NOT EXISTS bookingqube_event_id TEXT;
