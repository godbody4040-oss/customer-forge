-- Lock anonymous access on business_profiles down to public-site-safe columns only.
REVOKE ALL ON TABLE public.business_profiles FROM anon;
GRANT SELECT (
  id, organization_id, tagline, description, phone, email, website,
  address, city, state, zip, service_area, hours, logo_url, hero_image_url,
  primary_color, secondary_color, accent_color, font_preference, review_link
) ON public.business_profiles TO anon;

-- Anonymous reads still only work for published sites, and only through the
-- narrow public view.
DROP POLICY IF EXISTS bp_public_read ON public.business_profiles;
CREATE POLICY bp_public_read ON public.business_profiles
  FOR SELECT TO anon
  USING (private.org_site_published(organization_id));

GRANT SELECT ON public.public_business_profiles TO anon, authenticated;