CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'staff',
  token_hash text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_invitations_email_check CHECK (email = lower(email) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  CONSTRAINT team_invitations_role_check CHECK (role <> 'owner')
);

CREATE UNIQUE INDEX team_invitations_pending_unique
  ON public.team_invitations (organization_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX team_invitations_org_idx ON public.team_invitations (organization_id, created_at DESC);

GRANT SELECT ON public.team_invitations TO authenticated;
GRANT ALL ON public.team_invitations TO service_role;

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY team_invitations_read ON public.team_invitations
  FOR SELECT TO authenticated
  USING (private.can_manage_org(organization_id));

CREATE POLICY team_invitations_service_write ON public.team_invitations
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE TRIGGER team_invitations_touch BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

REVOKE SELECT (token_hash) ON public.team_invitations FROM authenticated;