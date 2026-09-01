/**
 * Serves a client website from the hostname the visitor typed.
 *
 * `clientname.revoragrowthsystems.com` (the free Revora address) and a verified
 * custom domain both land on the same published website, with no redirect and
 * no path prefix. Anything unpublished stays private: the loader reuses the
 * published-only reader, so drafts return nothing here.
 */
import { createServerFn } from "@tanstack/react-start";
import type { loadSite } from "@/lib/public-site.server";

export type HostSiteResult = {
  slug: string;
  host: string;
  via: "revora" | "custom";
  site: NonNullable<Awaited<ReturnType<typeof loadSite>>>;
} | null;

export const getHostSite = createServerFn({ method: "GET" })
  .inputValidator((input?: { pageSlug?: string }) => {
    const raw = String(input?.pageSlug ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 80);
    if (raw && !/^[a-z0-9-]+$/.test(raw)) return {};
    return raw ? { pageSlug: raw } : {};
  })
  .handler(async ({ data }): Promise<HostSiteResult> => {
    const { getRequestHost } = await import("@tanstack/react-start/server");
    const { resolveTenantHost } = await import("@/lib/site-host.server");
    const { loadSite } = await import("@/lib/public-site.server");

    let host: string | null = null;
    try {
      host = getRequestHost({ xForwardedHost: true }) ?? null;
    } catch {
      host = null;
    }
    const tenant = await resolveTenantHost(host);
    if (!tenant) return null;

    // Published-only: `loadSite` refuses drafts unless an authorised preview
    // token is presented, which never happens on a public host.
    const site = await loadSite(
      tenant.slug,
      data.pageSlug ? { pageSlug: data.pageSlug } : undefined,
    );
    if (!site) return null;
    return { slug: tenant.slug, host: tenant.host, via: tenant.via, site };
  });
