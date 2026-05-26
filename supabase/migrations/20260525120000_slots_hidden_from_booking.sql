-- Hide slots from guest homepage, register, and POS booking while keeping them in admin.
ALTER TABLE public.slots
  ADD COLUMN IF NOT EXISTS hidden_from_booking BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.slots.hidden_from_booking IS
  'When true, slot is omitted from public/POS booking UIs; admins still see and manage it.';
