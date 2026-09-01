/**
 * REVORA — CLIENT WEBSITE HOSTING PROXY (Cloudflare Worker)
 * ========================================================
 *
 * Serves every free client address (`clientname.revoraweb.site`) by proxying
 * to the Revora platform (`https://revoragrowthsystems.com`) while telling the
 * app which client hostname the visitor actually used.
 *
 * Why this exists
 * ---------------
 * The hosting layer serves one primary hostname with one SSL certificate, so
 * arbitrary client subdomains cannot be served directly. Cloudflare terminates
 * TLS for `revoraweb.site` AND `*.revoraweb.site` (Universal SSL is included on
 * the free plan), and this Worker forwards requests to the platform with the
 * real client hostname attached as `X-Forwarded-Host`. The app routes on that
 * hostname exactly as it does for direct traffic (tenants are resolved by
 * hostname; each client only ever sees their own website).
 *
 * The Revora platform domain (revoragrowthsystems.com) is never involved in
 * this proxy and is not modified by it.
 *
 * DEPLOYMENT (one-time, ~10 minutes)
 * ----------------------------------
 * 1. Add `revoraweb.site` to Cloudflare (free plan). Cloudflare assigns two
 *    nameservers. At your registrar (Name.com), change revoraweb.site's
 *    nameservers to those two. Keep revoragrowthsystems.com's records exactly
 *    as they are — this move only affects revoraweb.site.
 * 2. DNS records in Cloudflare (all Proxied / orange cloud):
 *       A  @   → 185.158.133.1
 *       A  *   → 185.158.133.1
 *       A  www → 185.158.133.1
 * 3. Workers & Pages → Create Worker → paste this file → Deploy.
 * 4. Worker → Settings → Triggers → Routes → Add route:
 *       *revoraweb.site/*   (zone: revoraweb.site)
 * 5. SSL/TLS → Overview: leave on the default "Full" setting. The Worker talks
 *    to the platform over its own public HTTPS, so origin certificates are
 *    handled by the platform, not Cloudflare.
 *
 * VERIFY
 * ------
 * - https://<your-client>.revoraweb.site loads that client's website.
 * - The "Check my address" button in the builder's address panel reports live.
 * - revoragrowthsystems.com keeps serving the platform as before.
 */

const ORIGIN = "https://revoragrowthsystems.com";
const SITE_ROOT = "revoraweb.site";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");

    // Only the hosting domain and its one-level subdomains belong to this
    // Worker. Anything else is not a Revora client address.
    const bare = host === SITE_ROOT || host === `www.${SITE_ROOT}`;
    const label = host.endsWith(`.${SITE_ROOT}`)
      ? host.slice(0, -(SITE_ROOT.length + 1))
      : null;
    if (!bare && (!label || label.includes("."))) {
      return new Response("Not found", { status: 404 });
    }

    // Forward to the platform, carrying the real client hostname separately.
    // The Host header must be the platform's own (fetch sets it from ORIGIN) —
    // sending the client subdomain as Host would make the platform's edge
    // treat it as an unknown hostname. X-Forwarded-Host is what the app reads
    // to resolve which client's website to serve.
    const headers = new Headers(request.headers);
    headers.set("X-Forwarded-Host", host);
    headers.set("X-Forwarded-Proto", "https");
    headers.delete("host");

    const upstream = await fetch(ORIGIN + url.pathname + url.search, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });

    // Pass the origin response through untouched — status, body, headers,
    // streaming, and any deliberate redirects (e.g. to a client's own
    // verified custom domain) keep working as-is.
    return new Response(upstream.body, upstream);
  },
};