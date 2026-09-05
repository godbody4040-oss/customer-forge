ALTER TABLE public.platform_trials
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

CREATE INDEX IF NOT EXISTS platform_trials_converted_at_idx
  ON public.platform_trials (converted_at);

GRANT ALL ON public.platform_trials TO service_role;