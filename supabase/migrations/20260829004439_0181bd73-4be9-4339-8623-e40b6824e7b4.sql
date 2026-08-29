ALTER TABLE public.website_settings ALTER COLUMN published SET DEFAULT false;
UPDATE public.website_settings SET published = false
WHERE published = true AND publish_state <> 'published';