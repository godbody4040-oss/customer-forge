import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  isPossibleTenantHost,
  isRevoraOwnHost,
  isTrafficDomainHost,
  REVORA_SUBDOMAIN_HOSTING_ENABLED,
  trafficRedirectUrl,
} from "@/lib/revora-address";

/**
 * The final domain architecture: the platform domain is platform-only, the
 * traffic domain redirects, and ONLY a verified customer-owned domain can ever
 * resolve to a client website. These assertions make subdomain tenant hosting
 * structurally impossible to reintroduce by accident.
 */
describe("subdomain tenant hosting is impossible", () => {
  it("never treats a platform-domain subdomain as a tenant", () => {
    for (const host of [
      "revoragrowthsystems.com",
      "www.revoragrowthsystems.com",
      "business.revoragrowthsystems.com",
      "customer.revoragrowthsystems.com",
      "evil.revoragrowthsystems.com",
    ]) {
      expect(isPossibleTenantHost(host)).toBe(false);
    }
  });

  it("never treats a traffic-domain host as a tenant", () => {
    for (const host of [
      "revoraweb.site",
      "www.revoraweb.site",
      "business.revoraweb.site",
      "customer.revoraweb.site",
      "evil.revoraweb.site",
    ]) {
      expect(isTrafficDomainHost(host)).toBe(true);
      expect(isPossibleTenantHost(host)).toBe(false);
    }
  });

  it("keeps a look-alike host out of Revora's own host list but off the traffic domain", () => {
    expect(isTrafficDomainHost("revoraweb.site.evil.com")).toBe(false);
    expect(isRevoraOwnHost("revoragrowthsystems.com.evil.com")).toBe(false);
    // A look-alike host is only a candidate: it still has to match a verified
    // custom domain row before any site is served.
    expect(isPossibleTenantHost("revoragrowthsystems.com.evil.com")).toBe(true);
  });

  it("redirects traffic-domain requests to the platform without a bypass marker", () => {
    expect(trafficRedirectUrl("/pricing", "?utm_source=x")).toBe(
      "https://revoragrowthsystems.com/pricing?utm_source=x",
    );
    const start = readFileSync("src/start.ts", "utf8");
    expect(start).not.toContain("_rw");
    expect(REVORA_SUBDOMAIN_HOSTING_ENABLED).toBe(false);
  });

  it("resolves tenants only through verified customer-owned domains", () => {
    const source = readFileSync("src/lib/site-host.server.ts", "utf8");
    expect(source).not.toContain("revora_site_for_host");
    expect(source).not.toContain('via: "revora"');
    expect(source).toContain('.eq("custom_domain", host)');
    expect(source).toContain("row.dns_ok");
    expect(source).toContain("row.ssl_ok");
  });

  it("keeps the retired subdomain field out of the public site reader", () => {
    const reader = readFileSync("src/lib/public-site.server.ts", "utf8");
    expect(reader).not.toContain("subdomain");
    // The public settings projection must stay a fixed render-only column list.
    const projection = reader.match(/"id, organization_id, template[^"]*"/)?.[0] ?? "";
    expect(projection).toContain("pages");
    for (const column of [
      "domain_transfer",
      "ssl_detail",
      "domain_records",
      "domain_seo_report",
      "email_forwarding",
    ]) {
      expect(projection).not.toContain(column);
    }
  });
});
