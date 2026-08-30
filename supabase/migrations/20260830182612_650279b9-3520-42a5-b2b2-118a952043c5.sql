CREATE TABLE IF NOT EXISTS public.lifecycle_email_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  window_key text NOT NULL,
  recipient text,
  status text NOT NULL DEFAULT 'sent',
  detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, kind, window_key)
);

CREATE INDEX IF NOT EXISTS lifecycle_email_log_org_idx ON public.lifecycle_email_log (organization_id, created_at DESC);

GRANT SELECT ON public.lifecycle_email_log TO authenticated;
GRANT ALL ON public.lifecycle_email_log TO service_role;

ALTER TABLE public.lifecycle_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lifecycle_log_member_read" ON public.lifecycle_email_log
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.memberships m
  WHERE m.organization_id = lifecycle_email_log.organization_id
    AND m.user_id = auth.uid()
));