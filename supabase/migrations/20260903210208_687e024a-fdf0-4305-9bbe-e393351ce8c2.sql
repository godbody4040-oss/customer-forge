-- Role-aware website content authorization.
-- Previously ANY organization member (including viewer) had full write access to
-- website_pages / website_sections / website_components / website_settings.

CREATE OR REPLACE FUNCTION private.org_role_at_least(_org uuid, _min text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH rank AS (
    SELECT CASE m.role::text
             WHEN 'owner' THEN 4
             WHEN 'admin' THEN 3
             WHEN 'manager' THEN 2
             WHEN 'staff' THEN 1
             ELSE 0
           END AS lvl
    FROM public.memberships m
    WHERE m.organization_id = _org AND m.user_id = auth.uid()
    ORDER BY 1 DESC
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT lvl FROM rank) >= CASE _min
                                WHEN 'owner' THEN 4
                                WHEN 'admin' THEN 3
                                WHEN 'manager' THEN 2
                                WHEN 'staff' THEN 1
                                ELSE 0
                              END,
    false)
  OR private.has_support_access(_org);
$$;

REVOKE ALL ON FUNCTION private.org_role_at_least(uuid, text) FROM PUBLIC;

-- website_pages
DROP POLICY IF EXISTS website_pages_member_all ON public.website_pages;
CREATE POLICY website_pages_member_read ON public.website_pages
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY website_pages_manager_insert ON public.website_pages
  FOR INSERT TO authenticated
  WITH CHECK (private.org_role_at_least(organization_id, 'manager'));
CREATE POLICY website_pages_staff_update ON public.website_pages
  FOR UPDATE TO authenticated
  USING (private.org_role_at_least(organization_id, 'staff'))
  WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY website_pages_manager_delete ON public.website_pages
  FOR DELETE TO authenticated
  USING (private.org_role_at_least(organization_id, 'manager'));

-- website_sections
DROP POLICY IF EXISTS website_sections_member_all ON public.website_sections;
CREATE POLICY website_sections_member_read ON public.website_sections
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY website_sections_manager_insert ON public.website_sections
  FOR INSERT TO authenticated
  WITH CHECK (private.org_role_at_least(organization_id, 'manager'));
CREATE POLICY website_sections_staff_update ON public.website_sections
  FOR UPDATE TO authenticated
  USING (private.org_role_at_least(organization_id, 'staff'))
  WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY website_sections_manager_delete ON public.website_sections
  FOR DELETE TO authenticated
  USING (private.org_role_at_least(organization_id, 'manager'));

-- website_components
DROP POLICY IF EXISTS website_components_member_all ON public.website_components;
CREATE POLICY website_components_member_read ON public.website_components
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY website_components_manager_insert ON public.website_components
  FOR INSERT TO authenticated
  WITH CHECK (private.org_role_at_least(organization_id, 'manager'));
CREATE POLICY website_components_staff_update ON public.website_components
  FOR UPDATE TO authenticated
  USING (private.org_role_at_least(organization_id, 'staff'))
  WITH CHECK (private.org_role_at_least(organization_id, 'staff'));
CREATE POLICY website_components_manager_delete ON public.website_components
  FOR DELETE TO authenticated
  USING (private.org_role_at_least(organization_id, 'manager'));

-- website_settings: domain/routing/publish state is a manager+ decision.
DROP POLICY IF EXISTS website_settings_member_all ON public.website_settings;
CREATE POLICY website_settings_member_read ON public.website_settings
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY website_settings_manager_insert ON public.website_settings
  FOR INSERT TO authenticated
  WITH CHECK (private.org_role_at_least(organization_id, 'manager'));
CREATE POLICY website_settings_manager_update ON public.website_settings
  FOR UPDATE TO authenticated
  USING (private.org_role_at_least(organization_id, 'manager'))
  WITH CHECK (private.org_role_at_least(organization_id, 'manager'));
CREATE POLICY website_settings_admin_delete ON public.website_settings
  FOR DELETE TO authenticated
  USING (private.org_role_at_least(organization_id, 'admin'));
