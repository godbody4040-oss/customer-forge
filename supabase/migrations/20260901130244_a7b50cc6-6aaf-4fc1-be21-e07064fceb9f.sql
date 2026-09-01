CREATE UNIQUE INDEX IF NOT EXISTS website_settings_custom_domain_unique
  ON public.website_settings (lower(custom_domain))
  WHERE custom_domain IS NOT NULL AND custom_domain <> '';