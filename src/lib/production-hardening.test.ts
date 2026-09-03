import { describe, it, expect } from "vitest";
import {
  CONTENT_SECURITY_POLICY,
  baseSecurityHeaders,
  documentSecurityHeaders,
  withSecurityHeaders,
} from "@/lib/security-headers";
import {
  REVORA_ROOT,
  RESERVED_SUBDOMAINS,
  SITE_ROOT,
  canonicalSiteUrl,
  isRevoraOwnHost,
  normalizeHost,
  revoraSubdomainFromHost,
  validateSubdomain,
} from "@/lib/revora-address";
import worker from "../../cloudflare/worker.js";

describe("security headers", () => {
  it("locks down executable sources while allowing the real integrations", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("https://js.stripe.com");
    expect(CONTENT_SECURITY_POLICY).toContain("wss://*.supabase.co");
    expect(CONTENT_SECURITY_POLICY).toContain("https://fonts.gstatic.com");
    // No blanket wildcard for code execution or data exfiltration targets.
    expect(CONTENT_SECURITY_POLICY).not.toContain("script-src *");
    expect(CONTENT_SECURITY_POLICY).not.toContain("connect-src *");
  });

  it("only sends HSTS over https", () => {
    expect(baseSecurityHeaders({ https: true })["strict-transport-security"]).toContain("max-age=");
    expect(baseSecurityHeaders({ https: false })["strict-transport-security"]).toBeUndefined();
    expect(documentSecurityHeaders({ https: true })["content-security-policy"]).toBe(
      CONTENT_SECURITY_POLICY,
    );
  });

  it("adds document headers to html and never overwrites a deliberate header", () => {
    const html = withSecurityHeaders(
      new Response("<html></html>", {
        headers: { "content-type": "text/html; charset=utf-8", "referrer-policy": "no-referrer" },
      }),
      { https: true },
    );
    expect(html.headers.get("content-security-policy")).toBeTruthy();
    expect(html.headers.get("x-content-type-options")).toBe("nosniff");
    expect(html.headers.get("referrer-policy")).toBe("no-referrer");

    const json = withSecurityHeaders(
      new Response("{}", { headers: { "content-type": "application/json" } }),
      { https: true },
    );
    expect(json.headers.get("x-content-type-options")).toBe("nosniff");
    expect(json.headers.get("content-security-policy")).toBeNull();
  });
});

describe("hostname resolution edge cases", () => {
  it("normalises spoofing-shaped hosts", () => {
    expect(normalizeHost("Business.RevoraWeb.Site.")).toBe("business.revoraweb.site");
    expect(normalizeHost("business.revoraweb.site:443")).toBe("business.revoraweb.site");
    expect(normalizeHost(null)).toBe("");
  });

  it("never treats the platform domain or a preview host as a client", () => {
    for (const host of [
      REVORA_ROOT,
      `www.${REVORA_ROOT}`,
      SITE_ROOT,
      `www.${SITE_ROOT}`,
      "localhost:8080",
      "id-preview--x.lovable.app",
    ]) {
      expect(isRevoraOwnHost(host), host).toBe(true);
    }
    expect(isRevoraOwnHost(`business.${SITE_ROOT}`)).toBe(false);
  });

  it("rejects nested and look-alike client hosts", () => {
    expect(revoraSubdomainFromHost(`business.${SITE_ROOT}`)).toBe("business");
    expect(revoraSubdomainFromHost(`BUSINESS.${SITE_ROOT}.`)).toBe("business");
    expect(revoraSubdomainFromHost(`a.b.${SITE_ROOT}`)).toBeNull();
    expect(revoraSubdomainFromHost(`evil${SITE_ROOT}`)).toBeNull();
    expect(revoraSubdomainFromHost("business.attacker.com")).toBeNull();
  });

  it("refuses reserved addresses", () => {
    for (const name of ["www", "admin", "api", "app", "billing"]) {
      expect(RESERVED_SUBDOMAINS).toContain(name);
      expect(validateSubdomain(name).ok, name).toBe(false);
    }
    expect(validateSubdomain("Miller Roofing")).toEqual({ ok: true, value: "miller-roofing" });
  });
});

describe("client website canonical urls", () => {
  const verifiedDomain = {
    custom_domain: "millerroofing.com",
    subdomain: "miller",
    dns_ok: true,
    ssl_ok: true,
  };

  it("uses the client's own verified domain, never Revora's platform domain", () => {
    expect(canonicalSiteUrl(verifiedDomain, "miller", "home")).toBe("https://millerroofing.com");
    expect(canonicalSiteUrl(verifiedDomain, "miller", "services")).toBe(
      "https://millerroofing.com/services",
    );
    expect(canonicalSiteUrl(verifiedDomain, "miller", "services")).not.toContain(REVORA_ROOT);
  });

  it("falls back to the always-working platform path only when nothing is verified", () => {
    const unverified = { custom_domain: "millerroofing.com", dns_ok: false, ssl_ok: false };
    expect(canonicalSiteUrl(unverified, "miller", "home")).toBe(`https://${REVORA_ROOT}/s/miller`);
    expect(canonicalSiteUrl(unverified, "miller", "about")).toBe(
      `https://${REVORA_ROOT}/s/miller/about`,
    );
  });

  it("honours an explicit https canonical the client set", () => {
    expect(canonicalSiteUrl(verifiedDomain, "miller", "home", "https://chosen.example/x")).toBe(
      "https://chosen.example/x",
    );
    // A non-https value can never override the computed canonical.
    expect(canonicalSiteUrl(verifiedDomain, "miller", "home", "javascript:alert(1)")).toBe(
      "https://millerroofing.com",
    );
  });
});

describe("cloudflare hosting worker", () => {
  const call = (url: string, init?: RequestInit) => worker.fetch(new Request(url, init));

  it("refuses hosts that are not one-level client addresses", async () => {
    for (const url of [
      `https://a.b.${SITE_ROOT}/`,
      `https://evil${SITE_ROOT}/`,
      `https://-bad.${SITE_ROOT}/`,
      "https://attacker.com/",
    ]) {
      const res = await call(url);
      expect(res.status, url).toBe(404);
    }
  });

  it("refuses unsupported methods", async () => {
    // `Request` itself forbids TRACE, so the edge case is exercised with the
    // same shape the Worker runtime hands the handler.
    const res = await worker.fetch({
      method: "TRACE",
      url: `https://business.${SITE_ROOT}/`,
      headers: new Headers(),
    } as unknown as Request);
    expect(res.status).toBe(405);
  });
});
