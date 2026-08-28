CREATE TABLE public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  progress integer NOT NULL DEFAULT 0,
  current_step text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX generation_jobs_org_created_idx ON public.generation_jobs (organization_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_jobs TO authenticated;
GRANT ALL ON public.generation_jobs TO service_role;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generation_jobs_read" ON public.generation_jobs FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id) OR private.is_super_admin());
CREATE POLICY "generation_jobs_write" ON public.generation_jobs FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_org(organization_id) OR private.is_super_admin());
CREATE POLICY "generation_jobs_update" ON public.generation_jobs FOR UPDATE TO authenticated
  USING (private.can_manage_org(organization_id) OR private.is_super_admin())
  WITH CHECK (private.can_manage_org(organization_id) OR private.is_super_admin());
CREATE POLICY "generation_jobs_delete" ON public.generation_jobs FOR DELETE TO authenticated
  USING (private.can_manage_org(organization_id) OR private.is_super_admin());
CREATE TRIGGER generation_jobs_touch BEFORE UPDATE ON public.generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.website_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version integer NOT NULL,
  label text,
  template text,
  generation jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  pages jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, version)
);
CREATE INDEX website_versions_org_idx ON public.website_versions (organization_id, version DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_versions TO authenticated;
GRANT ALL ON public.website_versions TO service_role;
ALTER TABLE public.website_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_versions_read" ON public.website_versions FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id) OR private.is_super_admin());
CREATE POLICY "website_versions_write" ON public.website_versions FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_org(organization_id) OR private.is_super_admin());
CREATE POLICY "website_versions_update" ON public.website_versions FOR UPDATE TO authenticated
  USING (private.can_manage_org(organization_id) OR private.is_super_admin())
  WITH CHECK (private.can_manage_org(organization_id) OR private.is_super_admin());
CREATE POLICY "website_versions_delete" ON public.website_versions FOR DELETE TO authenticated
  USING (private.can_manage_org(organization_id) OR private.is_super_admin());

CREATE TABLE public.ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.generation_jobs(id) ON DELETE SET NULL,
  kind text NOT NULL,
  model text,
  instruction text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_generations_org_idx ON public.ai_generations (organization_id, created_at DESC);

GRANT SELECT, INSERT ON public.ai_generations TO authenticated;
GRANT ALL ON public.ai_generations TO service_role;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_generations_read" ON public.ai_generations FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id) OR private.is_super_admin());
CREATE POLICY "ai_generations_write" ON public.ai_generations FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_org(organization_id) OR private.is_super_admin());