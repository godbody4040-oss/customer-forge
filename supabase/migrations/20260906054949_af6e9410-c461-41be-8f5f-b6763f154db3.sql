-- 1. offer_config is internal configuration. Nothing on the public site reads
-- it (the published offer lives in application code), so remove public read.
DROP POLICY IF EXISTS offer_config_read ON public.offer_config;
REVOKE SELECT ON public.offer_config FROM anon, authenticated;
GRANT ALL ON public.offer_config TO service_role;

-- 2. platform_settings: the browser needs only the GA measurement ID.
-- Replace broad public read with a narrow view exposing just that column.
DROP POLICY IF EXISTS platform_settings_public_read ON public.platform_settings;
REVOKE SELECT ON public.platform_settings FROM anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;

CREATE OR REPLACE VIEW public.public_ga_config
WITH (security_barrier = true) AS
SELECT id, ga_measurement_id
FROM public.platform_settings
WHERE id = 'default';

GRANT SELECT ON public.public_ga_config TO anon, authenticated;