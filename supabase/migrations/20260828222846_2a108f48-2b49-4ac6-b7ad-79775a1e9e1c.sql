ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

CREATE INDEX IF NOT EXISTS generation_jobs_queue_idx
  ON public.generation_jobs (status, created_at)
  WHERE status IN ('queued', 'processing');

CREATE TABLE IF NOT EXISTS public.job_queue_state (
  id text PRIMARY KEY,
  paused boolean NOT NULL DEFAULT false,
  pause_reason text,
  pause_kind text,
  paused_at timestamptz,
  last_run_at timestamptz,
  last_error text,
  consecutive_rate_limits integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.job_queue_state TO authenticated;
GRANT ALL ON public.job_queue_state TO service_role;

ALTER TABLE public.job_queue_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can read job queue state"
  ON public.job_queue_state FOR SELECT TO authenticated
  USING (private.is_super_admin());

CREATE TRIGGER job_queue_state_touch
  BEFORE UPDATE ON public.job_queue_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.job_queue_state (id) VALUES ('site_engine')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS dns_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ssl_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS domain_records jsonb NOT NULL DEFAULT '{}'::jsonb;