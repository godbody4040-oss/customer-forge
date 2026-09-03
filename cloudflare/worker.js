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

/** Methods a website is ever served with. Anything else is refused at the edge. */
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

/**
 * Headers a visitor must never be able to set, because the platform trusts them
 * to decide WHICH client's website to serve. Whatever the browser sent is
 * dropped and replaced with values this Worker derives from the real hostname.
 */
const SPOOFABLE_HEADERS = [
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
  "x-forwarded-server",
  "x-original-host",
  "x-host",
  "forwarded",
];

/** A single valid DNS label: no dots, no leading/trailing hyphen. */
function isValidLabel(label) {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
}

function refuse(status, message) {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
    },
  });
}

export default {
  async fetch(request) {
    if (!ALLOWED_METHODS.has(request.method)) {
      return refuse(405, "Method not allowed");
    }

    const url = new URL(request.url);
    // Strip a trailing dot and any port before matching: `a.revoraweb.site.`
    // and `a.revoraweb.site:443` are the same host, and only the normalised
    // form may be compared against the hosting root.
    const host = url.hostname.toLowerCase().replace(/\.+$/, "");

    // Only the hosting domain and its one-level subdomains belong to this
    // Worker. Anything else — including a nested `a.b.revoraweb.site`, an
    // invalid label, or a look-alike such as `evilrevoraweb.site` — is not a
    // Revora client address.
    const bare = host === SITE_ROOT || host === `www.${SITE_ROOT}`;
    const label = host.endsWith(`.${SITE_ROOT}`) ? host.slice(0, -(SITE_ROOT.length + 1)) : null;
    if (!bare && !(label && isValidLabel(label))) {
      return refuse(404, "Not found");
    }

    // Forward to the platform, carrying the real client hostname separately.
    // The Host header must be the platform's own (fetch sets it from ORIGIN) —
    // sending the client subdomain as Host would make the platform's edge
    // treat it as an unknown hostname. X-Forwarded-Host is what the app reads
    // to resolve which client's website to serve, so every visitor-supplied
    // variant is deleted first and cannot influence tenant resolution.
    const headers = new Headers(request.headers);
    for (const name of SPOOFABLE_HEADERS) headers.delete(name);
    headers.delete("host");
    headers.set("X-Forwarded-Host", host);
    headers.set("X-Forwarded-Proto", "https");

    let upstream;
    try {
      upstream = await fetch(ORIGIN + url.pathname + url.search, {
        method: request.method,
        headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        redirect: "manual",
      });
    } catch {
      return refuse(502, "This website is temporarily unavailable. Please try again.");
    }

    // Pass the origin response through — status, body, streaming, and any
    // deliberate redirects (e.g. to a client's own verified custom domain) keep
    // working as-is. Two corrections are applied: responses vary by hostname, so
    // no cache may ever serve one client's page on another's address, and the
    // platform's own security headers are backfilled if the edge dropped them.
    const responseHeaders = new Headers(upstream.headers);
    const vary = responseHeaders.get("vary");
    if (!/\bx-forwarded-host\b/i.test(vary ?? "")) {
      responseHeaders.set("vary", vary ? `${vary}, X-Forwarded-Host` : "X-Forwarded-Host");
    }
    if (!responseHeaders.has("x-content-type-options")) {
      responseHeaders.set("x-content-type-options", "nosniff");
    }
    if (!responseHeaders.has("strict-transport-security")) {
      responseHeaders.set("strict-transport-security", "max-age=31536000; includeSubDomains");
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  },
};
