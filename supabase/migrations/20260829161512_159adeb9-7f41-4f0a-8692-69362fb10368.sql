-- Back to an invoker view (no owner-privilege escalation).
DROP VIEW IF EXISTS public.public_organizations;

CREATE VIEW public.public_organizations
WITH (security_invoker = true) AS
SELECT id, name, slug, industry, is_demo
FROM public.organizations
WHERE NOT is_suspended;

ALTER VIEW public.public_organizations OWNER TO postgres;
REVOKE ALL ON public.public_organizations FROM anon, authenticated;
GRANT SELECT ON public.public_organizations TO anon, authenticated;
GRANT ALL ON public.public_organizations TO service_role;

-- Column-level grants: anon may read ONLY public-site columns of the base
-- table. Billing/plan/trial/onboarding/checkout columns are not granted, so
-- they cannot be selected even through PostgREST column selection.
REVOKE ALL ON public.organizations FROM anon;
GRANT SELECT (id, name, slug, industry, is_demo, is_suspended)
  ON public.organizations TO anon;

-- Row scope: only demo workspaces or organizations whose site is published.
DROP POLICY IF EXISTS orgs_public_read ON public.organizations;
CREATE POLICY orgs_public_site_read
  ON public.organizations
  FOR SELECT
  TO anon
  USING (
    NOT is_suspended
    AND (is_demo OR private.org_site_published(id))
  );
