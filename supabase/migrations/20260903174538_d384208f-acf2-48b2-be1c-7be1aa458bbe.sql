DROP POLICY IF EXISTS memberships_insert ON public.memberships;

CREATE POLICY memberships_insert ON public.memberships
FOR INSERT TO authenticated
WITH CHECK (
  private.can_manage_org(organization_id)
  OR (
    user_id = auth.uid()
    AND role = 'owner'::app_role
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = memberships.organization_id
        AND o.created_by = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = memberships.organization_id
    )
  )
);