CREATE OR REPLACE FUNCTION public.revora_site_for_host(_host text)
RETURNS TABLE (organization_id uuid, organization_slug text, via text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH h AS (
    SELECT
      lower(regexp_replace(regexp_replace(coalesce(_host, ''), ':\d+$', ''), '\.$', '')) AS host
  ),
  parsed AS (
    SELECT
      host,
      regexp_replace(host, '^www\.', '') AS bare,
      CASE
        WHEN host LIKE '%.revoragrowthsystems.com'
             AND position('.' in left(host, length(host) - length('.revoragrowthsystems.com'))) = 0
        THEN left(host, length(host) - length('.revoragrowthsystems.com'))
        ELSE NULL
      END AS sub
    FROM h
  )
  SELECT ws.organization_id,
         o.slug,
         CASE WHEN p.sub IS NOT NULL AND ws.subdomain = p.sub THEN 'revora' ELSE 'custom' END
  FROM public.website_settings ws
  JOIN public.organizations o ON o.id = ws.organization_id
  CROSS JOIN parsed p
  WHERE p.host <> ''
    AND p.host NOT IN ('revoragrowthsystems.com', 'www.revoragrowthsystems.com')
    AND (
      (p.sub IS NOT NULL AND ws.subdomain = p.sub)
      OR (ws.custom_domain IS NOT NULL
          AND lower(ws.custom_domain) IN (p.host, p.bare)
          AND coalesce(ws.dns_ok, false)
          AND coalesce(ws.ssl_ok, false))
    )
  ORDER BY (CASE WHEN p.sub IS NOT NULL AND ws.subdomain = p.sub THEN 0 ELSE 1 END)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.revora_site_for_host(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revora_site_for_host(text) TO anon, authenticated, service_role;