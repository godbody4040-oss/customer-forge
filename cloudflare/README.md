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
