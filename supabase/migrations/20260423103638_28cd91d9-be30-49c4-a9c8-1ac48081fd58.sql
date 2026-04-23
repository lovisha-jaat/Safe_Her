-- Allow any authenticated user to view incident reports that have been verified by moderators.
-- This enables a community map of approved incidents while keeping pending/rejected reports private.
CREATE POLICY "Authenticated users can view verified reports"
ON public.incident_reports
FOR SELECT
TO authenticated
USING (status = 'verified');