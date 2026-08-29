-- Curated public view becomes the ONLY anon path to organization data.
DROP VIEW IF EXISTS public.public_organizations;

CREATE VIEW public.public_organizations
WITH (security_invoker = false) AS
SELECT id, name, slug, industry, is_demo
FROM public.organizations
WHERE NOT is_suspended;

ALTER VIEW public.public_organizations OWNER TO postgres;

REVOKE ALL ON public.public_organizations FROM anon, authenticated;
GRANT SELECT ON public.public_organizations TO anon, authenticated;
GRANT ALL ON public.public_organizations TO service_role;

-- Remove the table-wide anonymous read policy and every anon privilege on the
-- base table: anon now has no direct access to organizations at all.
DROP POLICY IF EXISTS orgs_public_read ON public.organizations;
REVOKE ALL ON public.organizations FROM anon;
