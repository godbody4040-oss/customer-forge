
CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL,
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_activities_lead_idx ON public.lead_activities(lead_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_activities_member_all ON public.lead_activities FOR ALL TO authenticated
  USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

CREATE TABLE public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  automation_id uuid REFERENCES public.automations(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.automation_steps(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  trigger_event text NOT NULL,
  action_type text NOT NULL,
  recipient text,
  subject text,
  body text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'queued',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX automation_runs_org_idx ON public.automation_runs(organization_id, scheduled_for);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_runs TO authenticated;
GRANT ALL ON public.automation_runs TO service_role;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY automation_runs_member_all ON public.automation_runs FOR ALL TO authenticated
  USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

CREATE TABLE public.quote_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.quote_forms(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_addons TO authenticated;
GRANT SELECT ON public.quote_addons TO anon;
GRANT ALL ON public.quote_addons TO service_role;
ALTER TABLE public.quote_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_addons_member_all ON public.quote_addons FOR ALL TO authenticated
  USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY quote_addons_public_read ON public.quote_addons FOR SELECT TO anon USING (true);

ALTER TABLE public.automation_steps ADD COLUMN IF NOT EXISTS channel text;
UPDATE public.automation_steps SET channel = COALESCE(channel, action_type);
