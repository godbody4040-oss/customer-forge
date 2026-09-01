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

export const REVORA_HOSTS = [
  "revoragrowthsystems.com",
  "www.revoragrowthsystems.com",
  "customer-forge.lovable.app",
];

export type HostSite = {
  slug: string;
  origin: string;
  pages: { slug: string; updatedAt: string | null }[];
  noindex: boolean;
};

function normalise(host: string) {
  return host.toLowerCase().split(":")[0]!.replace(/\.$/, "");
}

/**
 * Returns the published tenant that owns this host, or null when the host is
 * Revora's own marketing site / preview environment.
 */
export async function resolveHostSite(
  rawHost: string | null,
  protocol = "https",
): Promise<HostSite | null> {
  if (!rawHost) return null;
  const host = normalise(rawHost);
  if (!host || host.startsWith("localhost") || host.startsWith("127.0.0.1")) return null;
  if (
    REVORA_HOSTS.includes(host) ||
    host.endsWith("lovable.app") ||
    host.endsWith("lovableproject.com")
  ) {
    return null;
  }

  const supabase = publicClient();
  const bare = host.replace(/^www\./, "");
  const subdomain = host.endsWith(".revoragrowthsystems.com")
    ? host.slice(0, -".revoragrowthsystems.com".length)
    : null;

  const { data: settings } = await supabase
    .from("website_settings")
    .select("organization_id, custom_domain, subdomain, seo")
    .or(
      [
        `custom_domain.eq.${host}`,
        `custom_domain.eq.${bare}`,
        ...(subdomain ? [`subdomain.eq.${subdomain}`] : []),
      ].join(","),
    )
    .limit(1)
    .maybeSingle();
  if (!settings?.organization_id) return null;

  const org = await publicOrganization({ id: settings.organization_id });
  if (!org?.slug) return null;

  const { data: pages } = await supabase
    .from("website_pages")
    .select("slug, updated_at, noindex")
    .eq("organization_id", settings.organization_id)
    .order("sort_order", { ascending: true });

  return {
    slug: org.slug,
    origin: `${protocol}://${host}`,
    noindex: false,
    pages: (pages ?? [])
      .filter((p) => !p.noindex)
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
