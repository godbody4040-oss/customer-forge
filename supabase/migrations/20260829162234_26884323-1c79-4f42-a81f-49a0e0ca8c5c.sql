-- Anonymous clients lose all access to the base table and the view; public
-- site rendering resolves the few public fields server-side.
DROP POLICY IF EXISTS orgs_public_site_read ON public.organizations;
REVOKE ALL ON public.organizations FROM anon;
REVOKE ALL ON public.public_organizations FROM anon;

-- Signed-in reads are limited to the caller's own organizations (plus staff).
DROP POLICY IF EXISTS orgs_member_read ON public.organizations;
CREATE POLICY orgs_member_read
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    private.is_org_member(id)
    OR private.has_support_access(id)
    OR private.is_super_admin()
  );
