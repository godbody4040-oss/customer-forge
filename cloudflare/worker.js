/**
 * REVORA — TRAFFIC DOMAIN REDIRECT (Cloudflare Worker)
 * ===================================================
 *
 * `revoraweb.site` exists ONLY to send visitors to the Revora platform. It is
 * not a SaaS origin, not a client-hosting domain and not a tenant domain: every
 * request it receives is permanently redirected to
 *
 *     https://revoragrowthsystems.com
 *
 * keeping the requested path so marketing links such as
 * `revoraweb.site/pricing` land on `revoragrowthsystems.com/pricing`.
 *
 * The redirect target origin is fixed in code, so no visitor input — query
 * string, header or hostname — can ever redirect somebody off the platform
 * (no open redirect), and the platform domain is never redirected by this
 * Worker, so no loop is possible.
 *
 * DEPLOYMENT
 * ----------
 * 1. Add `revoraweb.site` to Cloudflare (free plan) and point its nameservers
 *    at the two Cloudflare assigns. `revoragrowthsystems.com` is untouched.
 * 2. DNS in Cloudflare (Proxied / orange cloud):
 *       A  @    → 192.0.2.1   (placeholder; the Worker answers, not an origin)
 *       A  www  → 192.0.2.1
 *    No wildcard record: arbitrary subdomains must NOT resolve.
 * 3. Workers & Pages → Create Worker → paste this file → Deploy.
 * 4. Worker → Settings → Triggers → Routes:
 *       revoraweb.site/*
 *       www.revoraweb.site/*
 *    (zone: revoraweb.site)
 */

/** The one and only redirect target. Never derived from request input. */
const PRIMARY_ORIGIN = "https://revoragrowthsystems.com";
const TRAFFIC_ROOT = "revoraweb.site";

const REDIRECTABLE_METHODS = new Set(["GET", "HEAD"]);

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
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase().replace(/\.+$/, "");

    // Only the traffic domain itself and its `www` form are served. Look-alikes
    // (`evilrevoraweb.site`) and arbitrary/nested subdomains — which must never
    // act as client websites — are refused rather than redirected.
    if (host !== TRAFFIC_ROOT && host !== `www.${TRAFFIC_ROOT}`) {
      return refuse(404, "Not found");
    }

    // Path and query are preserved; the origin is hardcoded, so a parameter
    // such as ?redirect=https://example.com cannot change where the visitor
    // goes — it is simply carried along as an inert query string.
    const location = `${PRIMARY_ORIGIN}${url.pathname}${url.search}`;
    const status = REDIRECTABLE_METHODS.has(request.method) ? 301 : 308;

    return new Response(null, {
      status,
      headers: {
        location,
        "cache-control": "public, max-age=3600",
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
        "strict-transport-security": "max-age=31536000; includeSubDomains",
      },
    });
  },
};
