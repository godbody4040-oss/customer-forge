DROP POLICY IF EXISTS "ws_public_read" ON public.website_settings;
CREATE POLICY "ws_public_read" ON public.website_settings
  FOR SELECT TO anon
  USING (published AND private.org_site_published(organization_id));