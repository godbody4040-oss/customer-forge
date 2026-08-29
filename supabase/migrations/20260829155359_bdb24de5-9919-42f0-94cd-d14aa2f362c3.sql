CREATE TABLE public.marketing_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  landing_path TEXT,
  industry_slug TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  session_id TEXT,
  email TEXT,
  amount_cents INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.marketing_conversions TO service_role;
GRANT SELECT ON public.marketing_conversions TO authenticated;

ALTER TABLE public.marketing_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read marketing conversions"
ON public.marketing_conversions
FOR SELECT
TO authenticated
USING (private.is_super_admin());

CREATE INDEX marketing_conversions_created_at_idx ON public.marketing_conversions (created_at DESC);
CREATE INDEX marketing_conversions_event_idx ON public.marketing_conversions (event_name, industry_slug);