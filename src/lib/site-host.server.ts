/**
 * Host resolution for published business websites.
 *
 * A tenant site is reachable at `/s/:slug`, at its Revora subdomain, and at a
 * connected custom domain. `robots.txt` and `sitemap.xml` must describe the
 * business that owns the requested host — not the Revora marketing site — so
 * both are resolved from the incoming Host header.
 */
import { publicClient, publicOrganization } from "@/lib/public-site.server";
import { INDUSTRIES, industrySlug } from "@/lib/domain";
import {
  REVORA_OWN_HOSTS,
  isRevoraOwnHost,
  normalizeHost,
  revoraSubdomainFromHost,
} from "@/lib/revora-address";

export const REVORA_HOSTS = REVORA_OWN_HOSTS;

export type HostSite = {
  slug: string;
  origin: string;
  pages: { slug: string; updatedAt: string | null }[];
  noindex: boolean;
};

export type TenantHost = {
  organizationId: string;
  slug: string;
  /** Which address the visitor arrived on. */
  via: "revora" | "custom";
  host: string;
};

/**
 * Resolves which organization owns an incoming host.
 *
 * - A Revora subdomain always resolves (it is included with the website).
 * - A custom domain only resolves once DNS **and** HTTPS have been verified, so
 *   a half-configured domain can never serve a client's site over a broken
 *   certificate — the free Revora address stays the working address.
 *
 * One host maps to exactly one organization (the subdomain column is unique),
 * which is what keeps one client's host from ever reaching another's website.
 */
export async function resolveTenantHost(rawHost: string | null): Promise<TenantHost | null> {
  if (!rawHost) return null;
  const host = normalizeHost(rawHost);
  if (!host || isRevoraOwnHost(host)) return null;

  // Address settings are private, so the lookup runs with server credentials on
  // the server only. It returns nothing but the owning workspace, and callers
  // still go through the published-only site reader.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const bare = host.replace(/^www\./, "");
  const subdomain = revoraSubdomainFromHost(host);

  const { data: rows } = await supabaseAdmin
    .from("website_settings")
    .select("organization_id, custom_domain, subdomain, dns_ok, ssl_ok")
    .or(
      [
        ...(subdomain ? [`subdomain.eq.${subdomain}`] : []),
        `custom_domain.eq.${host}`,
        `custom_domain.eq.${bare}`,
      ].join(","),
    )
    .limit(3);

  const ordered = [...(rows ?? [])].sort((a, b) => {
    const aRevora = !!subdomain && a.subdomain === subdomain ? 0 : 1;
    const bRevora = !!subdomain && b.subdomain === subdomain ? 0 : 1;
    return aRevora - bRevora;
  });

  for (const row of ordered) {
    if (!row.organization_id) continue;
    const viaRevora = !!subdomain && row.subdomain === subdomain;
    const viaCustom =
      !viaRevora &&
      (row.custom_domain?.toLowerCase() === host || row.custom_domain?.toLowerCase() === bare) &&
      !!row.dns_ok &&
      !!row.ssl_ok;
    if (!viaRevora && !viaCustom) continue;
    const org = await publicOrganization({ id: row.organization_id });
    if (!org?.slug) continue;
    return {
      organizationId: row.organization_id,
      slug: org.slug,
      via: viaRevora ? "revora" : "custom",
      host,
    };
  }
  return null;
}


/**
 * Returns the published tenant that owns this host, or null when the host is
 * Revora's own marketing site / preview environment.
 */
export async function resolveHostSite(
  rawHost: string | null,
  protocol = "https",
): Promise<HostSite | null> {
  const tenant = await resolveTenantHost(rawHost);
  if (!tenant) return null;

  const supabase = publicClient();
  const [{ data: pages }, { data: sections }] = await Promise.all([
    supabase
      .from("website_pages")
      .select("id, slug, updated_at, noindex")
      .eq("organization_id", tenant.organizationId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("website_sections")
      .select("page_id, is_visible")
      .eq("organization_id", tenant.organizationId),
  ]);

  // A page with no visible sections renders blank — never advertise it publicly.
  const populated = new Set(
    (sections ?? []).filter((s) => s.is_visible !== false).map((s) => s.page_id as string),
  );

  return {
    slug: tenant.slug,
    origin: `${protocol}://${tenant.host}`,
    noindex: false,
    pages: (pages ?? [])
      .filter((p) => !p.noindex && populated.has(p.id as string))
      .map((p) => ({ slug: p.slug, updatedAt: p.updated_at ?? null })),
  };

}


/** Absolute URLs for a tenant site, or for Revora's own marketing pages. */
export function sitemapUrls(site: HostSite | null, origin: string) {
  if (!site) {
    const industryPaths = INDUSTRIES.map((i) => `/industries/${industrySlug(i.name)}`);
    return [
      "",
      "/pricing",
      "/growth-assessment",
      "/website-audit",
      "/industries",
      ...industryPaths,
      "/crm-for-contractors",
      "/about",
      "/contact",
      "/demo",
      "/demo/dashboard",
      "/privacy",
      "/terms",
    ].map((path) => ({
      loc: `${origin}${path}`,
      lastmod: null as string | null,
    }));
  }
  const paths = [{ slug: "home", updatedAt: null as string | null }, ...site.pages].filter(
    (p, i, all) => all.findIndex((x) => x.slug === p.slug) === i,
  );
  return paths.map((page) => ({
    loc: page.slug === "home" ? site.origin : `${site.origin}/${page.slug}`,
    lastmod: page.updatedAt,
  }));
}

export function xmlSitemap(urls: { loc: string; lastmod: string | null }[]) {
  const body = urls
    .map(
      ({ loc, lastmod }) =>
        `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ""}</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
