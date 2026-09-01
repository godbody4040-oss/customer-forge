-- Table-wide SELECT overrides column revokes, so grant SELECT per column instead.
REVOKE SELECT ON public.team_invitations FROM authenticated;
GRANT SELECT (
  id, organization_id, email, role, invited_by, expires_at,
  accepted_at, accepted_by, revoked_at, created_at, updated_at
) ON public.team_invitations TO authenticated;
