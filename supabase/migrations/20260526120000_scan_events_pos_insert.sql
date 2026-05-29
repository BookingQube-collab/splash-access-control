-- Allow POS auto check-in to record valid entry scans (was scanner/admin only).
DROP POLICY IF EXISTS "scan_events_insert" ON public.scan_events;
CREATE POLICY "scan_events_insert" ON public.scan_events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pos')
    OR public.has_role(auth.uid(), 'scanner')
  );
