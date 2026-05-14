
-- ============== ENUMS ==============
CREATE TYPE public.app_role AS ENUM ('admin', 'dashboard', 'pos', 'scanner');
CREATE TYPE public.registration_status AS ENUM ('active', 'entered', 'exited', 'auto_exited', 'expired', 'invalid');
CREATE TYPE public.scan_mode AS ENUM ('entry', 'exit', 'auto_exit');
CREATE TYPE public.scan_result AS ENUM ('valid', 'invalid');

-- ============== PROFILES ==============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============== USER ROLES ==============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- ============== EVENTS ==============
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'SummerSplash',
  event_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ============== SLOTS ==============
CREATE TABLE public.slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_slots_event ON public.slots(event_id);

-- ============== REGISTRATIONS ==============
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.slots(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count > 0),
  qr_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status registration_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entered_at TIMESTAMPTZ,
  exited_at TIMESTAMPTZ
);
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_registrations_slot ON public.registrations(slot_id);
CREATE INDEX idx_registrations_mobile ON public.registrations(mobile);
CREATE INDEX idx_registrations_token ON public.registrations(qr_token);

-- ============== SCAN EVENTS ==============
CREATE TABLE public.scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL,
  mode scan_mode NOT NULL,
  result scan_result NOT NULL,
  reason TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scanner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_scan_events_slot ON public.scan_events(slot_id);

-- ============== APP SETTINGS (singleton) ==============
CREATE TABLE public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  scandit_api_key TEXT,
  scandit_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings (id, scandit_enabled) VALUES (1, false);

-- ============== TRIGGER: auto-create profile + role on signup ==============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============== RLS POLICIES ==============

-- profiles: user reads own; admin reads all
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- user_roles: user reads own; admin manages
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- events
CREATE POLICY "events_read_authenticated" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_admin_write" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- slots
CREATE POLICY "slots_read_authenticated" ON public.slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "slots_admin_write" ON public.slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- registrations: dashboard/pos/scanner/admin can read; pos+admin can insert; scanner+admin can update status
CREATE POLICY "registrations_read_staff" ON public.registrations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dashboard') OR
    public.has_role(auth.uid(), 'pos') OR
    public.has_role(auth.uid(), 'scanner')
  );
CREATE POLICY "registrations_insert_pos" ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'pos'));
CREATE POLICY "registrations_update_scanner" ON public.registrations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'scanner') OR public.has_role(auth.uid(), 'pos'));
CREATE POLICY "registrations_delete_admin" ON public.registrations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- scan_events: staff read, scanner+admin insert
CREATE POLICY "scan_events_read_staff" ON public.scan_events FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dashboard') OR
    public.has_role(auth.uid(), 'scanner')
  );
CREATE POLICY "scan_events_insert" ON public.scan_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'scanner'));

-- app_settings: admin full; scanner can read (for scandit toggle)
CREATE POLICY "app_settings_read" ON public.app_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'scanner'));
CREATE POLICY "app_settings_admin_write" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed a default event for today
INSERT INTO public.events (name, event_date) VALUES ('SummerSplash', CURRENT_DATE);
