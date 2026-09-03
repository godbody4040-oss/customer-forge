# revoraweb.site — traffic-only redirect domain

`revoragrowthsystems.com` is the permanent, sole primary Revora platform domain:
marketing, signup, login, dashboard, builder, CRM, billing, Stripe, API — all of
it. Nothing moves off it.

`revoraweb.site` exists only to send visitors there:

```text
visitor ──> https://revoraweb.site/pricing
                │  Cloudflare edge
                ▼
            Worker (cloudflare/worker.js) — permanent redirect
                ▼
        https://revoragrowthsystems.com/pricing
```

It is not an application origin, not a client-hosting domain and not a tenant
domain. `business.revoraweb.site` and any other subdomain are refused (404), and
client subdomain hosting stays disabled in the app
(`REVORA_SUBDOMAIN_HOSTING_ENABLED = false`).

## Steps

1. **Add `revoraweb.site` to Cloudflare** (free plan) and point its nameservers
   at the two Cloudflare assigns. `revoragrowthsystems.com` stays untouched.

2. **DNS records** (Proxied / orange cloud). No wildcard record — arbitrary
   subdomains must not resolve:

   | Type | Name | Value     | Proxy   |
   | ---- | ---- | --------- | ------- |
   | A    | @    | 192.0.2.1 | Proxied |
   | A    | www  | 192.0.2.1 | Proxied |

   The address is a placeholder: the Worker answers before any origin is used.

3. **Deploy the Worker.** Workers & Pages → Create Worker → paste
   `cloudflare/worker.js` → Deploy.

4. **Routes.** Worker → Settings → Triggers → Routes:
   `revoraweb.site/*` and `www.revoraweb.site/*` (zone `revoraweb.site`).

5. **SSL.** Leave SSL/TLS on Full; Universal SSL covers the apex and `www`.

6. **Verify.** `https://revoraweb.site` and `https://www.revoraweb.site` both
   return `301` to `https://revoragrowthsystems.com`, and
   `https://revoraweb.site/pricing` lands on the platform's pricing page.

## Guarantees

- The redirect target origin is hardcoded, so no query parameter, header or
  hostname can redirect a visitor off the platform (no open redirect).
- The platform domain is never redirected by the Worker, so no loop is possible.
- Visitor-supplied `X-Forwarded-Host` / `Forwarded` headers cannot make the app
  serve a tenant on this domain: `resolveTenantHost` refuses every host on
  `revoraweb.site`, and the app's own `trafficDomainRedirect` middleware
  (`src/start.ts`) redirects such requests to the platform domain.
- Canonicals, sitemaps, structured data and Open Graph URLs continue to use
  `revoragrowthsystems.com`, so no duplicate site is ever indexed here.
