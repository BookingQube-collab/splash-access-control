-- POS customer demographics (nationality / age group)
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS age_group text;

COMMENT ON COLUMN public.registrations.nationality IS 'resident | tourist';
COMMENT ON COLUMN public.registrations.age_group IS 'child | teen | adult | senior';
