-- BookingQube third-party ticketing integration tables

ALTER TABLE public.slots
  ADD COLUMN IF NOT EXISTS bookingqube_ticket_id TEXT;

-- Provider credentials & toggles (one row per provider)
CREATE TABLE public.integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  base_url TEXT NOT NULL DEFAULT '',
  api_key TEXT,
  api_key_env_var TEXT,
  default_form_id TEXT,
  cached_form_schema JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.integration_settings (provider, enabled, base_url)
VALUES (
  'bookingqube',
  false,
  'https://bookingqube-staging-deb2ecbxcrd5cmbq.eastus-01.azurewebsites.net'
)
ON CONFLICT (provider) DO NOTHING;

-- Local event ↔ BookingQube form/event id
CREATE TABLE public.integration_event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'bookingqube',
  local_event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  bookingqube_form_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, local_event_id)
);

ALTER TABLE public.integration_event_mappings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_integration_event_mappings_local ON public.integration_event_mappings(local_event_id);

-- BookingQube field ↔ SummerSplash column
CREATE TABLE public.integration_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_mapping_id UUID NOT NULL REFERENCES public.integration_event_mappings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'bookingqube',
  bookingqube_field_id TEXT,
  bookingqube_label TEXT NOT NULL,
  local_field TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_field_mappings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_integration_field_mappings_event ON public.integration_field_mappings(event_mapping_id);

-- Outbound/inbound sync audit log
CREATE TABLE public.integration_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'bookingqube',
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  payload JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_sync_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_integration_sync_log_created ON public.integration_sync_log(created_at DESC);

-- Admin-only access (server uses service role for outbound sync)
CREATE POLICY "integration_settings_admin" ON public.integration_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "integration_event_mappings_admin" ON public.integration_event_mappings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "integration_field_mappings_admin" ON public.integration_field_mappings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "integration_sync_log_admin" ON public.integration_sync_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
