-- Randomize demographics for legacy registrations (empty, invalid, or uniform tourist/adult backfill).
-- Only `registrations` stores nationality / age_group; related tables read from it at sync time.

UPDATE public.registrations
SET
  nationality = (ARRAY['resident', 'tourist'])[1 + floor(random() * 2)::int],
  age_group = (ARRAY['child', 'teen', 'adult', 'senior'])[1 + floor(random() * 4)::int]
WHERE
  nationality IS NULL
  OR btrim(coalesce(nationality, '')) = ''
  OR age_group IS NULL
  OR btrim(coalesce(age_group, '')) = ''
  OR nationality NOT IN ('resident', 'tourist')
  OR age_group NOT IN ('child', 'teen', 'adult', 'senior')
  OR (
    nationality = 'tourist'
    AND age_group = 'adult'
    AND created_at < '2026-06-04T00:00:00+00'
  );
