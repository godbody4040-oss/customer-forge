# Revora client hosting via Cloudflare

The Revora platform lives at `revoragrowthsystems.com` (permanent primary, never
modified). Client websites are hosted on free addresses under `revoraweb.site`
(`clientname.revoraweb.site`). Because the hosting layer serves a single
primary hostname with a single certificate, arbitrary client subdomains are
served through Cloudflare instead:

```text
visitor ──> https://clientname.revoraweb.site
                │  Cloudflare edge (Universal SSL for *.revoraweb.site)
                ▼
            Worker (cloudflare/worker.js)  ── passes X-Forwarded-Host
                ▼
        https://revoragrowthsystems.com  ── app routes by hostname
                ▼
        that client's own published website
```

## Steps

1. **Move `revoraweb.site` to Cloudflare.** Add the domain on the free plan in
   Cloudflare, then at Name.com change `revoraweb.site`'s nameservers to the
   two Cloudflare assigns. `revoragrowthsystems.com` stays untouched at Name.com.

2. **Add DNS records in Cloudflare** (all with the proxy on / orange cloud):

   | Type | Name | Value         | Proxy   |
   | ---- | ---- | ------------- | ------- |
   | A    | @    | 185.158.133.1 | Proxied |
   | A    | *    | 185.158.133.1 | Proxied |
   | A    | www  | 185.158.133.1 | Proxied |

3. **Deploy the Worker.** Workers & Pages → Create Worker → paste the contents
   of `cloudflare/worker.js` → Deploy.

4. **Add the Worker route.** Worker → Settings → Triggers → Routes →
   `*revoraweb.site/*` on the `revoraweb.site` zone.

5. **SSL.** Leave SSL/TLS on the default Full mode; the Worker reaches the
   platform over its own public HTTPS.

6. **Verify.** Open `https://<your-client>.revoraweb.site` — it must render that
   client's website, not the platform and not another client. The "Check my
   address" button in the builder reports the live status.

## App-side support (already implemented)

- `src/start.ts` — CSRF trusts origins on `revoraweb.site` (the hosting domain)
  and the custom-domain redirect reads `X-Forwarded-Host` first.
- `src/lib/host-site.functions.ts` — unknown labels on `revoraweb.site` show the
  neutral holding page, never the marketing site.
- `src/lib/admin.server.ts` / `src/lib/revora-address.functions.ts` — the live
  address check accepts the Cloudflare edge as valid DNS and only reports
  "live" when HTTPS actually serves the site.

## Notes

- Remove `revoraweb.site` from the Lovable project's connected domains once
  Cloudflare owns its DNS — Lovable's records for it will no longer exist, and
  the Worker (not Lovable) is what serves client hostnames.
- Keep `revoragrowthsystems.com` as the project's primary domain.

---

## Turning Revora-branded client addresses back on

`businessname.revoraweb.site` is fully implemented and hardened, but it is
**deliberately switched off in the product** while client-owned domains are the
advertised model. The switch is a single constant:

```ts
// src/lib/revora-address.ts
export const REVORA_SUBDOMAIN_HOSTING_ENABLED = false;
```

Flipping it to `true` is safe **only** once all of the following are true at the
edge — otherwise clients would be shown an address that does not answer:

1. `revoraweb.site` is on Cloudflare with the DNS records above, including the
   proxied wildcard `A * → 185.158.133.1`.
2. Cloudflare Universal SSL has issued the `*.revoraweb.site` certificate
   (SSL/TLS → Edge Certificates shows it active).
3. The Worker in `cloudflare/worker.js` is deployed on route
   `*revoraweb.site/*`.
4. `https://<any-client>.revoraweb.site` returns that client's published site in
   a browser (the builder's "Check my address" probe reports live).

The platform domain `revoragrowthsystems.com` is never part of this Worker and
never resolves to a client website.

### What the Worker guarantees

- Only `revoraweb.site` and **one-level** subdomains with a valid DNS label are
  served; nested (`a.b.revoraweb.site`), malformed (`-bad.…`) and look-alike
  (`evilrevoraweb.site`) hosts get a 404.
- Every visitor-supplied `X-Forwarded-Host` / `X-Forwarded-Proto` /
  `X-Original-Host` / `Forwarded` header is deleted before forwarding, so a
  visitor can never name a different tenant. The Worker sets those values itself
  from the real hostname.
- Responses carry `Vary: X-Forwarded-Host`, so no cache can serve one client's
  page on another client's address.
- Only real website HTTP methods are accepted (405 otherwise), and an origin
  outage returns a plain 502 instead of leaking internals.
