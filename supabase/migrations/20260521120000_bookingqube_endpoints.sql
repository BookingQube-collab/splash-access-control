-- BookingQube API version and named custom endpoints (admin-configured)

ALTER TABLE public.integration_settings
  ADD COLUMN IF NOT EXISTS api_version TEXT NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS custom_endpoints JSONB NOT NULL DEFAULT '[]'::jsonb;
