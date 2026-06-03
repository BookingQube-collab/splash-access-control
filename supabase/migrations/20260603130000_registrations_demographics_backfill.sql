-- Backfill demographics for registrations created before POS captured these fields.
UPDATE public.registrations
SET nationality = 'tourist'
WHERE nationality IS NULL OR btrim(nationality) = '';

UPDATE public.registrations
SET age_group = 'adult'
WHERE age_group IS NULL OR btrim(age_group) = '';

ALTER TABLE public.registrations
  ALTER COLUMN nationality SET DEFAULT 'tourist',
  ALTER COLUMN age_group SET DEFAULT 'adult';
