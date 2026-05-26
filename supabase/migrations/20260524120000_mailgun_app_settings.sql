-- Mailgun transactional email (digital pass) on app_settings singleton
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS mailgun_api_key TEXT,
  ADD COLUMN IF NOT EXISTS mailgun_domain TEXT,
  ADD COLUMN IF NOT EXISTS mailgun_from_email TEXT,
  ADD COLUMN IF NOT EXISTS mailgun_enabled BOOLEAN NOT NULL DEFAULT false;
