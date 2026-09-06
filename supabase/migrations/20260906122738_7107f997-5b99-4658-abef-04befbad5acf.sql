-- 1) Prevent a concurrent race from creating two owners for the same workspace.
CREATE UNIQUE INDEX IF NOT EXISTS memberships_single_owner_idx
  ON public.memberships (organization_id)
  WHERE role = 'owner'::app_role;

-- 2) Generation jobs: manager-level roles only for regeneration, and a job can
--    never be moved between workspaces by an update.
CREATE OR REPLACE FUNCTION public.freeze_generation_job_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS freeze_generation_job_org_trg ON public.generation_jobs;
CREATE TRIGGER freeze_generation_job_org_trg
  BEFORE UPDATE ON public.generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.freeze_generation_job_org();

DROP POLICY IF EXISTS generation_jobs_update ON public.generation_jobs;
CREATE POLICY generation_jobs_update ON public.generation_jobs
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (private.org_role_at_least(organization_id, 'manager') OR private.is_super_admin())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (private.org_role_at_least(organization_id, 'manager') OR private.is_super_admin())
  );

DROP POLICY IF EXISTS generation_jobs_write ON public.generation_jobs;
CREATE POLICY generation_jobs_write ON public.generation_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    private.org_role_at_least(organization_id, 'manager') OR private.is_super_admin()
  );