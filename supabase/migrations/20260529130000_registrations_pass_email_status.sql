-- Track digital-pass confirmation email delivery per registration.
-- pass_email_status: 'pending' (not yet sent / no attempt), 'sent', or 'failed'.
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS pass_email_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pass_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pass_email_error TEXT;

ALTER TABLE public.registrations
  DROP CONSTRAINT IF EXISTS registrations_pass_email_status_check;
ALTER TABLE public.registrations
  ADD CONSTRAINT registrations_pass_email_status_check
  CHECK (pass_email_status IN ('pending', 'sent', 'failed'));
