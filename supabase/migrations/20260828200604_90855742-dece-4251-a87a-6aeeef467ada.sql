CREATE OR REPLACE FUNCTION public.has_support_access(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_sessions ss
    WHERE ss.organization_id = _org
      AND ss.admin_id = auth.uid()
      AND ss.ended_at IS NULL
      AND ss.started_at > now() - interval '4 hours'
  ) AND public.is_super_admin();
$$;

REVOKE EXECUTE ON FUNCTION public.has_support_access(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_support_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = _org AND m.user_id = auth.uid()
  ) OR public.has_support_access(_org);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = _org
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin','manager')
  ) OR public.has_support_access(_org);
$$;