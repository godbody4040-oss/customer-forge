CREATE OR REPLACE FUNCTION private.has_support_access(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.support_sessions ss
    WHERE ss.organization_id = _org
      AND ss.admin_id = auth.uid()
      AND ss.ended_at IS NULL
      AND ss.started_at > now() - interval '4 hours'
  ) AND private.is_super_admin();
$function$;

CREATE OR REPLACE FUNCTION private.is_org_member(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = _org AND m.user_id = auth.uid()
  ) OR private.has_support_access(_org);
$function$;

CREATE OR REPLACE FUNCTION private.can_manage_org(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = _org
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin','manager')
  ) OR private.has_support_access(_org);
$function$;