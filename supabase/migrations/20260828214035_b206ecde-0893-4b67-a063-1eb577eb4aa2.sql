ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS website_goals TEXT[] NOT NULL DEFAULT '{}'::text[];