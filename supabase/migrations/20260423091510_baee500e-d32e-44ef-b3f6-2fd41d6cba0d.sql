
-- 1. Fix profiles public exposure
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Fix anonymous incident reports leaking user_id via trigger
CREATE OR REPLACE FUNCTION public.anonymize_incident_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_anonymous = true THEN
    NEW.user_id = '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  RETURN NEW;
END;
$$;

-- Make user_id nullable so anonymous reports don't store it
ALTER TABLE public.incident_reports ALTER COLUMN user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.anonymize_incident_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_anonymous = true THEN
    NEW.user_id = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS anonymize_incident_report_trigger ON public.incident_reports;
CREATE TRIGGER anonymize_incident_report_trigger
BEFORE INSERT OR UPDATE ON public.incident_reports
FOR EACH ROW
EXECUTE FUNCTION public.anonymize_incident_report();

-- Update INSERT policy to allow anonymous reports (user_id check only when not anonymous)
DROP POLICY IF EXISTS "Users can create reports" ON public.incident_reports;
CREATE POLICY "Users can create reports"
ON public.incident_reports
FOR INSERT
TO authenticated
WITH CHECK (
  (is_anonymous = true) OR (auth.uid() = user_id)
);

-- 3. Lock down user_roles - only admins can manage roles
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
