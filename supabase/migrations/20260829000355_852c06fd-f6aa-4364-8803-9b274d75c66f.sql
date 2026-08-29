ALTER TABLE public.website_pages
  ADD COLUMN IF NOT EXISTS seo_canonical text,
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT false;

CREATE TABLE public.website_preview_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  label text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX website_preview_links_org_idx ON public.website_preview_links (organization_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_preview_links TO authenticated;
GRANT ALL ON public.website_preview_links TO service_role;

ALTER TABLE public.website_preview_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their preview links"
ON public.website_preview_links FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.memberships m
  WHERE m.organization_id = website_preview_links.organization_id
    AND m.user_id = auth.uid()
));

CREATE POLICY "Members create their preview links"
ON public.website_preview_links FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.memberships m
  WHERE m.organization_id = website_preview_links.organization_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner','admin','manager')
));

CREATE POLICY "Members update their preview links"
ON public.website_preview_links FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.memberships m
  WHERE m.organization_id = website_preview_links.organization_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner','admin','manager')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.memberships m
  WHERE m.organization_id = website_preview_links.organization_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner','admin','manager')
));

CREATE POLICY "Members delete their preview links"
ON public.website_preview_links FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.memberships m
  WHERE m.organization_id = website_preview_links.organization_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner','admin','manager')
));

CREATE TRIGGER website_preview_links_touch
BEFORE UPDATE ON public.website_preview_links
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();