
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

UPDATE public.events SET start_date = COALESCE(start_date, event_date), end_date = COALESCE(end_date, event_date);

ALTER TABLE public.events ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN end_date SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN start_date SET DEFAULT CURRENT_DATE;
ALTER TABLE public.events ALTER COLUMN end_date SET DEFAULT CURRENT_DATE;
