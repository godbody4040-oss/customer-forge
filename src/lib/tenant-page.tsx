/**
 * Shared address handling for paths that exist on BOTH Revora's own site and on
 * client websites (for example `/contact`, `/pricing`, `/about`).
 *
 * On `revoragrowthsystems.com` these paths are Revora's marketing pages. On a
 * client's free Revora address or verified custom domain, the same path must be
 * the client's own page — a visitor on `joesplumbing.revoragrowthsystems.com`
 * should never see Revora's pricing page.
 */
import type { ReactNode } from "react";
import { getHostSite, type HostSiteResult } from "@/lib/host-site.functions";
import { isPossibleTenantHost } from "@/lib/revora-address";
import { PublicSiteView } from "@/routes/s.$slug";

/** Loads the client page for this host, or null on Revora's own hosts. */
export async function loadTenantPage(pageSlug: string): Promise<HostSiteResult> {
  if (typeof window !== "undefined" && !isPossibleTenantHost(window.location.hostname)) {
    return null;
  }
  try {
    const result = await getHostSite({ data: { pageSlug } });
    return result?.site?.content ? result : null;
  } catch {
    return null;
  }
}

/** Metadata for a client page, so shares and search results show the business. */
export function tenantPageHead(result: HostSiteResult) {
  if (!result?.site?.content) return null;
  const page = result.site.content.page;
  const name = result.site.org.name;
  const title = (page.seo_title || `${page.title} — ${name}`).slice(0, 60);
  const description = (
    page.seo_description ||
    result.site.profile?.tagline ||
    `${page.title} from ${name}.`
  ).slice(0, 158);
  const url = page.seo_canonical || `https://${result.host}/${page.slug}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: page.og_title || title },
      { property: "og:description", content: page.og_description || description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      ...(page.noindex ? [{ name: "robots", content: "noindex" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** Renders the client's page when the visitor is on a client address. */
export function TenantOrMarketing({
  tenant,
  children,
}: {
  tenant: HostSiteResult;
  children: ReactNode;
}) {
  if (tenant?.site?.content) return <PublicSiteView site={tenant.site} />;
  return <>{children}</>;
}
