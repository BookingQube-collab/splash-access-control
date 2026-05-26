-- Simplified BookingQube sync URLs (full GET/POST URLs + registration slug)

ALTER TABLE public.integration_settings
  ADD COLUMN IF NOT EXISTS get_api_url TEXT,
  ADD COLUMN IF NOT EXISTS post_api_url TEXT,
  ADD COLUMN IF NOT EXISTS registration_event_slug TEXT;

-- Backfill slug from legacy default_form_id when present
UPDATE public.integration_settings
SET registration_event_slug = NULLIF(TRIM(default_form_id), '')
WHERE provider = 'bookingqube'
  AND registration_event_slug IS NULL
  AND default_form_id IS NOT NULL
  AND TRIM(default_form_id) <> '';
