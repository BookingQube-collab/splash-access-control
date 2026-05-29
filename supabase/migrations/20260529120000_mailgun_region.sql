-- Mailgun sending region (US vs EU) on app_settings singleton.
-- EU-hosted Mailgun domains MUST use https://api.eu.mailgun.net; sending them
-- to the US endpoint returns HTTP 401 Forbidden. Default to US for back-compat.
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS mailgun_region TEXT NOT NULL DEFAULT 'us';
