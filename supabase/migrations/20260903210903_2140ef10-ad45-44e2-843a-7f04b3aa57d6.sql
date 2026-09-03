-- Support access metadata (admin identity/email) is sensitive internal detail.
-- Only workspace owners/admins, or platform super admins, may read it.
DROP POLICY IF EXISTS "Org members see support sessions on their org" ON public.support_sessions;

CREATE POLICY "support_sessions_manager_read"
ON public.support_sessions
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    private.org_role_at_least(organization_id, 'admin')
    OR private.is_super_admin()
  )
);

-- Generation job history: deletion is a destructive, audit-relevant action, so
-- it now needs owner/admin rather than any manager. Membership is always
-- re-derived from auth.uid() inside the helper, never from client input.
DROP POLICY IF EXISTS generation_jobs_delete ON public.generation_jobs;

CREATE POLICY generation_jobs_delete
ON public.generation_jobs
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    private.org_role_at_least(organization_id, 'admin')
    OR private.is_super_admin()
  )
);

-- Update stays manager+, but with an explicit signed-in requirement and the
-- same organization on both sides so a row cannot be moved between tenants.
DROP POLICY IF EXISTS generation_jobs_update ON public.generation_jobs;

CREATE POLICY generation_jobs_update
ON public.generation_jobs
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (private.can_manage_org(organization_id) OR private.is_super_admin())
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (private.can_manage_org(organization_id) OR private.is_super_admin())
);