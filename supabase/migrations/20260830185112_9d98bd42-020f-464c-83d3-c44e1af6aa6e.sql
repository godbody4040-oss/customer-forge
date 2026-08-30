-- Enforce a link-scheme allowlist for site link fields at the database level so
-- neither the editor, the AI agent, nor any future write path can persist a
-- javascript:/data: URI that would execute in a visitor's browser.
CREATE OR REPLACE FUNCTION public.is_safe_link_url(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT value IS NULL
     OR btrim(value) = ''
     OR (
       -- no control characters that could smuggle a scheme past a parser
       btrim(value) !~ '[[:cntrl:]]'
       AND btrim(value) ~* '^(#[^[:space:]]*|/[^/][^[:space:]]*|/|https?://[^[:space:]]+|mailto:[^[:space:]]+|tel:[+0-9()\-\. ]+|sms:[+0-9()\-\. ]+)$'
     )
$$;

ALTER TABLE public.website_components
  ADD CONSTRAINT website_components_link_url_safe
  CHECK (public.is_safe_link_url(link_url)) NOT VALID;

ALTER TABLE public.website_components VALIDATE CONSTRAINT website_components_link_url_safe;

-- Subscription rows must only ever be written by the payment webhook / admin
-- paths that run with elevated privileges: members stay read-only, and the
-- write privileges themselves are removed so no policy change can re-open it.
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
REVOKE ALL ON public.subscriptions FROM anon;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;