-- 1. Restrict anonymous column access on organizations to public-site fields only
REVOKE SELECT ON public.organizations FROM anon;
GRANT SELECT (id, name, slug, industry, is_demo) ON public.organizations TO anon;

-- 2. Helper: is this organization's website published?
CREATE OR REPLACE FUNCTION private.org_site_published(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.website_settings w
    JOIN public.organizations o ON o.id = w.organization_id
    WHERE w.organization_id = _org_id
      AND w.published
      AND NOT o.is_suspended
  )
$$;

REVOKE ALL ON FUNCTION private.org_site_published(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.org_site_published(uuid) TO anon, authenticated, service_role;

-- 3. Scope public media reads to published sites
DROP POLICY IF EXISTS media_public_read ON public.media;
CREATE POLICY media_public_read ON public.media
  FOR SELECT TO anon
  USING (private.org_site_published(organization_id));

-- 4. Scope public social links to published sites
DROP POLICY IF EXISTS social_public_read ON public.social_profiles;
CREATE POLICY social_public_read ON public.social_profiles
  FOR SELECT TO anon
  USING (private.org_site_published(organization_id));

-- 5. Scope quote form structure to published sites and active forms
DROP POLICY IF EXISTS qq_public_read ON public.quote_questions;
CREATE POLICY qq_public_read ON public.quote_questions
  FOR SELECT TO anon
  USING (
    private.org_site_published(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.quote_forms f
      WHERE f.id = quote_questions.form_id AND f.is_active
    )
  );

DROP POLICY IF EXISTS qo_public_read ON public.quote_options;
CREATE POLICY qo_public_read ON public.quote_options
  FOR SELECT TO anon
  USING (
    private.org_site_published(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.quote_questions q
      JOIN public.quote_forms f ON f.id = q.form_id
      WHERE q.id = quote_options.question_id AND f.is_active
    )
  );

DROP POLICY IF EXISTS quote_addons_public_read ON public.quote_addons;
CREATE POLICY quote_addons_public_read ON public.quote_addons
  FOR SELECT TO anon
  USING (
    private.org_site_published(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.quote_forms f
      WHERE f.id = quote_addons.form_id AND f.is_active
    )
  );