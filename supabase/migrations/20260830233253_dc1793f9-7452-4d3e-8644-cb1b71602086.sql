DROP POLICY IF EXISTS leads_public_insert ON public.leads;
CREATE POLICY leads_public_insert ON public.leads
FOR INSERT TO anon
WITH CHECK (
  private.org_site_published(organization_id)
  AND char_length(coalesce(name, '')) <= 160
  AND char_length(coalesce(email, '')) <= 200
  AND char_length(coalesce(phone, '')) <= 40
  AND char_length(coalesce(notes, '')) <= 4000
  AND char_length(coalesce(message, '')) <= 4000
);