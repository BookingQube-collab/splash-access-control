-- Label print templates + printer settings on app_settings singleton

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS printer_settings JSONB NOT NULL DEFAULT '{
    "enabled": false,
    "connection": "browser_print",
    "network_host": "",
    "network_port": 9100,
    "label_width_in": 4,
    "label_height_in": 2,
    "dpi": 203
  }'::jsonb;

CREATE TABLE public.label_print_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  preset_key TEXT NOT NULL DEFAULT 'classic',
  is_default BOOLEAN NOT NULL DEFAULT false,
  layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  zpl_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.label_print_templates ENABLE ROW LEVEL SECURITY;

-- Staff (pos/scanner/dashboard) can read templates for printing
CREATE POLICY "label_templates_read_staff" ON public.label_print_templates
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dashboard') OR
    public.has_role(auth.uid(), 'pos') OR
    public.has_role(auth.uid(), 'scanner')
  );

CREATE POLICY "label_templates_admin_all" ON public.label_print_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Extend app_settings read to pos (for printer config at kiosk)
DROP POLICY IF EXISTS "app_settings_read" ON public.app_settings;
CREATE POLICY "app_settings_read" ON public.app_settings FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'scanner') OR
    public.has_role(auth.uid(), 'pos') OR
    public.has_role(auth.uid(), 'dashboard')
  );

-- Seed preset templates (only when table empty)
INSERT INTO public.label_print_templates (name, preset_key, is_default, layout_json)
SELECT v.name, v.preset_key, v.is_default, v.layout_json::jsonb
FROM (VALUES
  ('Classic', 'classic', true, '{"show_mobile":true,"show_slot":true,"show_date":true,"show_time":true,"show_guests":true,"show_booking_ref":true,"show_event_name":false,"fontSize":"medium"}'),
  ('Compact', 'compact', false, '{"show_mobile":true,"show_slot":true,"show_date":true,"show_time":true,"show_guests":true,"show_booking_ref":true,"show_event_name":false,"fontSize":"small"}'),
  ('Bold header', 'bold_header', false, '{"show_mobile":true,"show_slot":true,"show_date":true,"show_time":true,"show_guests":true,"show_booking_ref":true,"show_event_name":true,"fontSize":"large"}'),
  ('Minimal', 'minimal', false, '{"show_mobile":false,"show_slot":false,"show_date":true,"show_time":false,"show_guests":false,"show_booking_ref":false,"show_event_name":false,"fontSize":"medium"}')
) AS v(name, preset_key, is_default, layout_json)
WHERE NOT EXISTS (SELECT 1 FROM public.label_print_templates LIMIT 1);
