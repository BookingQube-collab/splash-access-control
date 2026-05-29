-- SMTP (nodemailer) transport for digital-pass emails, alongside the existing
-- Mailgun HTTP API fields. mail_driver selects which transport is used:
--   'api'  -> Mailgun HTTP API (mailgun_* columns)
--   'smtp' -> SMTP relay (mail_* columns below)
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS mail_driver TEXT NOT NULL DEFAULT 'api',
  ADD COLUMN IF NOT EXISTS mail_host TEXT,
  ADD COLUMN IF NOT EXISTS mail_port INTEGER,
  ADD COLUMN IF NOT EXISTS mail_username TEXT,
  ADD COLUMN IF NOT EXISTS mail_password TEXT,
  ADD COLUMN IF NOT EXISTS mail_encryption TEXT,
  ADD COLUMN IF NOT EXISTS mail_from_email TEXT,
  ADD COLUMN IF NOT EXISTS mail_from_name TEXT;

ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_mail_driver_check;
ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_mail_driver_check
  CHECK (mail_driver IN ('api', 'smtp'));
