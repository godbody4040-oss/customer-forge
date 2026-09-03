CREATE TABLE public.platform_settings (
  id text PRIMARY KEY DEFAULT 'default',
  ga_measurement_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT platform_settings_single_row CHECK (id = 'default'),
  CONSTRAINT platform_settings_ga_format CHECK (
    ga_measurement_id IS NULL OR ga_measurement_id ~ '^G-[A-Z0-9]{4,20}$'
  )
);

GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_settings_public_read ON public.platform_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY platform_settings_no_insert ON public.platform_settings
  FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY platform_settings_no_update ON public.platform_settings
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY platform_settings_no_delete ON public.platform_settings
  FOR DELETE TO anon, authenticated USING (false);

INSERT INTO public.platform_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;