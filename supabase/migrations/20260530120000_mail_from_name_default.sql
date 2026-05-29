-- Replace legacy default sender display name for digital-pass emails.
UPDATE public.app_settings
SET mail_from_name = 'Summer Splash 2026'
WHERE id = 1
  AND (
    mail_from_name IS NULL
    OR trim(mail_from_name) = ''
    OR lower(trim(mail_from_name)) = 'bookingqube'
  );
