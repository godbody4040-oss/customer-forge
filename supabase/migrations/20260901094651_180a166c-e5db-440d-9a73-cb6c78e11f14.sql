REVOKE SELECT (token_hash) ON public.team_invitations FROM authenticated;
REVOKE SELECT (token_hash) ON public.team_invitations FROM anon;
REVOKE EXECUTE ON FUNCTION public.org_team_members(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.org_team_members(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.org_team_members(uuid) FROM PUBLIC;
