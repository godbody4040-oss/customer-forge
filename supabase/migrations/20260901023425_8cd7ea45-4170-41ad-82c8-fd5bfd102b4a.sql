-- Harden anonymous access to public.website_settings: the anon role keeps
-- row access via the existing published-site policy, but only for the columns
-- required to render a public website. Operational/domain columns
-- (domain_transfer, email_forwarding, ssl_detail, domain_records,
-- domain_seo_report, traffic_*, approved_by, ...) are no longer readable.
REVOKE SELECT ON public.website_settings FROM anon;

GRANT SELECT (
  id,
  organization_id,
  template,
  pages,
  seo,
  subdomain,
  custom_domain,
  published,
  publish_state,
  last_published_at,
  generation,
  created_at,
  updated_at
) ON public.website_settings TO anon;

-- Authenticated members/admins keep full access (RLS still scopes rows).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_settings TO authenticated;
GRANT ALL ON public.website_settings TO service_role;