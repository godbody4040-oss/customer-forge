ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS notification_email text,
  ADD COLUMN IF NOT EXISTS notify_on_lead boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.lead_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id uuid,
  recipient text NOT NULL,
  kind text NOT NULL DEFAULT 'lead',
  status text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_alert_log_org_created_idx
  ON public.lead_alert_log (organization_id, created_at DESC);

GRANT SELECT ON public.lead_alert_log TO authenticated;
GRANT ALL ON public.lead_alert_log TO service_role;

ALTER TABLE public.lead_alert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_alert_log_member_read ON public.lead_alert_log;
CREATE POLICY lead_alert_log_member_read ON public.lead_alert_log
  FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id));