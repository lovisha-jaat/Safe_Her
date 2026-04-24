-- Emergency contacts stored in database for reliable SOS delivery
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relation TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own emergency contacts"
ON public.emergency_contacts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emergency contacts"
ON public.emergency_contacts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emergency contacts"
ON public.emergency_contacts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own emergency contacts"
ON public.emergency_contacts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_emergency_contacts_updated_at
BEFORE UPDATE ON public.emergency_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Optional audit trail for SOS calls
CREATE TABLE IF NOT EXISTS public.sos_alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_url TEXT,
  message TEXT NOT NULL,
  recipients TEXT[] NOT NULL DEFAULT '{}'::text[],
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sos_alert_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sos logs"
ON public.sos_alert_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sos logs"
ON public.sos_alert_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
