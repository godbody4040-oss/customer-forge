CREATE TABLE public.website_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'custom',
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE public.website_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES public.website_pages(id) ON DELETE CASCADE,
  kind text NOT NULL,
  variant text NOT NULL DEFAULT 'default',
  heading text,
  subheading text,
  body text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.website_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.website_sections(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'text',
  label text,
  body text,
  media_url text,
  link_url text,
  link_label text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX website_pages_org_idx ON public.website_pages(organization_id, sort_order);
CREATE INDEX website_sections_page_idx ON public.website_sections(page_id, sort_order);
CREATE INDEX website_components_section_idx ON public.website_components(section_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_pages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_components TO authenticated;
GRANT SELECT ON public.website_pages TO anon;
GRANT SELECT ON public.website_sections TO anon;
GRANT SELECT ON public.website_components TO anon;
GRANT ALL ON public.website_pages TO service_role;
GRANT ALL ON public.website_sections TO service_role;
GRANT ALL ON public.website_components TO service_role;

ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY website_pages_member_all ON public.website_pages FOR ALL TO authenticated
  USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY website_sections_member_all ON public.website_sections FOR ALL TO authenticated
  USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY website_components_member_all ON public.website_components FOR ALL TO authenticated
  USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));

CREATE POLICY website_pages_public_read ON public.website_pages FOR SELECT TO anon
  USING (is_visible AND private.org_site_published(organization_id));
CREATE POLICY website_sections_public_read ON public.website_sections FOR SELECT TO anon
  USING (is_visible AND private.org_site_published(organization_id));
CREATE POLICY website_components_public_read ON public.website_components FOR SELECT TO anon
  USING (is_visible AND private.org_site_published(organization_id));

CREATE TRIGGER website_pages_touch BEFORE UPDATE ON public.website_pages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER website_sections_touch BEFORE UPDATE ON public.website_sections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER website_components_touch BEFORE UPDATE ON public.website_components
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Owner contact details and review feedback: anonymous reads only for published sites.
DROP POLICY IF EXISTS bp_public_read ON public.business_profiles;
CREATE POLICY bp_public_read ON public.business_profiles FOR SELECT TO anon
  USING (private.org_site_published(organization_id));

DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
CREATE POLICY reviews_public_read ON public.reviews FOR SELECT TO anon
  USING (is_published AND private.org_site_published(organization_id));