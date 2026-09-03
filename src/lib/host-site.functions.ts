/**
 * Serves a client website from the hostname the visitor typed.
 *
 * `clientname.revoraweb.site` (the free Revora address) and a verified
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

/**
 * Answers two things: does this web address belong to a client (`tenant`), and
 * is the requested page published on it (`result`). The distinction matters —
 * on a client's address a missing page must be a plain "page not found", never
 * Revora's own marketing page.
 */
export const getHostSite = createServerFn({ method: "GET" })
  .inputValidator((input?: { pageSlug?: string }) => {
    const raw = String(input?.pageSlug ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 80);
    if (raw && !/^[a-z0-9-]+$/.test(raw)) return {};
    return raw ? { pageSlug: raw } : {};
  })
  .handler(async ({ data }): Promise<{ tenant: boolean; result: HostSiteResult }> => {
    const { getRequestHost } = await import("@tanstack/react-start/server");
    const { resolveTenantHost } = await import("@/lib/site-host.server");
    const { loadSite } = await import("@/lib/public-site.server");
    const { SITE_ROOT, normalizeHost } = await import("@/lib/revora-address");

    let host: string | null = null;
    try {
      host = getRequestHost({ xForwardedHost: true }) ?? null;
    } catch {
      host = null;
    }
    // The client-hosting domain only ever serves client websites. The bare
    // root belongs to no client, and neither does an unclaimed label on it
    // (including when it arrives through the Cloudflare proxy) — both show the
    // neutral holding page, never Revora's marketing site.
    const bare = normalizeHost(host);
    if (bare === SITE_ROOT || bare === `www.${SITE_ROOT}`) {
      return { tenant: true, result: null };
    }
    const tenant = await resolveTenantHost(host);
    if (!tenant) {
      if (bare.endsWith(`.${SITE_ROOT}`)) return { tenant: true, result: null };
      return { tenant: false, result: null };
    }

    // Published-only: `loadSite` refuses drafts unless an authorised preview
    // token is presented, which never happens on a public host.
    const site = await loadSite(
      tenant.slug,
      data.pageSlug ? { pageSlug: data.pageSlug } : undefined,
    );
    if (!site) return { tenant: true, result: null };
    return {
      tenant: true,
      result: { slug: tenant.slug, host: tenant.host, via: tenant.via, site },
    };
  });
