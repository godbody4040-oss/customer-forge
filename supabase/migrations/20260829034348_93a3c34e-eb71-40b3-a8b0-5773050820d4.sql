ALTER VIEW public.public_reviews SET (security_invoker = true);

CREATE POLICY reviews_public_read ON public.reviews
  FOR SELECT TO anon
  USING (is_published AND private.org_site_published(organization_id));

GRANT SELECT (id, organization_id, author_name, rating, comment, created_at)
  ON public.reviews TO anon;