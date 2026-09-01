ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS revora_host_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revora_host_checked_at timestamptz;