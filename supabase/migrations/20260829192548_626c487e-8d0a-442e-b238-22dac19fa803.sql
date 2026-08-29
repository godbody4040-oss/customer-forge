DROP POLICY IF EXISTS services_public_read ON public.services;
CREATE POLICY services_public_read ON public.services
  FOR SELECT TO anon
  USING (is_active AND private.org_site_published(organization_id));

DROP POLICY IF EXISTS qf_public_read ON public.quote_forms;
CREATE POLICY qf_public_read ON public.quote_forms
  FOR SELECT TO anon
  USING (is_active AND private.org_site_published(organization_id));

DROP POLICY IF EXISTS ws_public_read ON public.website_settings;
CREATE POLICY ws_public_read ON public.website_settings
  FOR SELECT TO anon
  USING (
    published
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = website_settings.organization_id
        AND NOT o.is_suspended
    )
  );