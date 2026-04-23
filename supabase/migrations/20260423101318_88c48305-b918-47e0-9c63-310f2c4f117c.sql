DROP POLICY IF EXISTS "Users can create reports" ON public.incident_reports;

CREATE POLICY "Users can create reports"
ON public.incident_reports
FOR INSERT
TO authenticated
WITH CHECK (
  (is_anonymous = true AND (user_id IS NULL OR user_id = auth.uid()))
  OR
  (is_anonymous = false AND user_id = auth.uid())
);