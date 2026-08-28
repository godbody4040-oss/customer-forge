-- Domain + publishing lifecycle
CREATE TYPE public.domain_status AS ENUM ('not_connected','dns_pending','verifying','connected','ssl_active','error');
CREATE TYPE public.publish_state AS ENUM ('draft','preview','published','unpublished');

ALTER TABLE public.website_settings
  ADD COLUMN domain_status public.domain_status NOT NULL DEFAULT 'not_connected',
  ADD COLUMN domain_checked_at timestamptz,
  ADD COLUMN domain_error text,
  ADD COLUMN domain_target text,
  ADD COLUMN publish_state public.publish_state NOT NULL DEFAULT 'draft',
  ADD COLUMN last_published_at timestamptz;

UPDATE public.website_settings SET publish_state = 'published', last_published_at = now() WHERE published = true;

ALTER TABLE public.business_profiles
  ADD COLUMN owner_name text,
  ADD COLUMN owner_email text,
  ADD COLUMN review_link text,
  ADD COLUMN support_email text;

-- Support/impersonation audit trail
CREATE TABLE public.support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email text,
  reason text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

GRANT SELECT ON public.support_sessions TO authenticated;
GRANT ALL ON public.support_sessions TO service_role;
ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage support sessions"
  ON public.support_sessions FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Org members see support sessions on their org"
  ON public.support_sessions FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE INDEX support_sessions_org_idx ON public.support_sessions (organization_id, started_at DESC);
CREATE INDEX website_settings_custom_domain_idx ON public.website_settings (custom_domain);