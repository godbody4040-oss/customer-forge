CREATE TABLE public.onboarding_drafts (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  step integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_drafts TO authenticated;
GRANT ALL ON public.onboarding_drafts TO service_role;

ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY onboarding_drafts_own_select ON public.onboarding_drafts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY onboarding_drafts_own_insert ON public.onboarding_drafts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY onboarding_drafts_own_update ON public.onboarding_drafts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY onboarding_drafts_own_delete ON public.onboarding_drafts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER onboarding_drafts_touch BEFORE UPDATE ON public.onboarding_drafts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.organizations
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '1 day');