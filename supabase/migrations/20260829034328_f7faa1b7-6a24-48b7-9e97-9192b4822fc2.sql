DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
REVOKE SELECT ON public.reviews FROM anon;

CREATE OR REPLACE VIEW public.public_reviews AS
  SELECT r.id, r.organization_id, r.author_name, r.rating, r.comment, r.created_at
  FROM public.reviews r
  WHERE r.is_published AND private.org_site_published(r.organization_id);

ALTER VIEW public.public_reviews SET (security_invoker = false);
GRANT SELECT ON public.public_reviews TO anon, authenticated;