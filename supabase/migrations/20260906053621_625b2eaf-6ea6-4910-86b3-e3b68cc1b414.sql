CREATE TABLE public.website_visual_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  measurements JSONB NOT NULL,
  report JSONB NOT NULL,
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX website_visual_reports_org_recent ON public.website_visual_reports (organization_id, measured_at DESC);
GRANT SELECT, INSERT ON public.website_visual_reports TO authenticated;
GRANT ALL ON public.website_visual_reports TO service_role;
ALTER TABLE public.website_visual_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view visual reports" ON public.website_visual_reports FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = website_visual_reports.organization_id AND m.user_id = auth.uid()));
CREATE POLICY "Managers can record visual reports" ON public.website_visual_reports FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = website_visual_reports.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin','manager')));