ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS review_state TEXT NOT NULL DEFAULT 'onboarding',
  ADD COLUMN IF NOT EXISTS generation JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID;

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
  ADD COLUMN IF NOT EXISTS certifications TEXT,
  ADD COLUMN IF NOT EXISTS awards TEXT,
  ADD COLUMN IF NOT EXISTS testimonials JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.website_settings
SET review_state = CASE WHEN publish_state = 'published' THEN 'live'
                        WHEN publish_state = 'preview' THEN 'ready_for_review'
                        ELSE 'onboarding' END
WHERE review_state = 'onboarding';

CREATE TABLE IF NOT EXISTS public.website_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID,
  kind TEXT NOT NULL DEFAULT 'change',
  title TEXT NOT NULL,
  details TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_requests TO authenticated;
GRANT ALL ON public.website_requests TO service_role;

ALTER TABLE public.website_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "website_requests_select" ON public.website_requests;
CREATE POLICY "website_requests_select" ON public.website_requests
  FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id) OR private.is_super_admin());

DROP POLICY IF EXISTS "website_requests_insert" ON public.website_requests;
CREATE POLICY "website_requests_insert" ON public.website_requests
  FOR INSERT TO authenticated
  WITH CHECK (private.is_org_member(organization_id) OR private.is_super_admin());

DROP POLICY IF EXISTS "website_requests_update" ON public.website_requests;
CREATE POLICY "website_requests_update" ON public.website_requests
  FOR UPDATE TO authenticated
  USING (private.can_manage_org(organization_id) OR private.is_super_admin())
  WITH CHECK (private.can_manage_org(organization_id) OR private.is_super_admin());

DROP POLICY IF EXISTS "website_requests_delete" ON public.website_requests;
CREATE POLICY "website_requests_delete" ON public.website_requests
  FOR DELETE TO authenticated
  USING (private.can_manage_org(organization_id) OR private.is_super_admin());

CREATE INDEX IF NOT EXISTS website_requests_org_idx ON public.website_requests(organization_id, status);

DROP TRIGGER IF EXISTS update_website_requests_updated_at ON public.website_requests;
CREATE TRIGGER update_website_requests_updated_at
  BEFORE UPDATE ON public.website_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();