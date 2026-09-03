/**
 * Adversarial tests: hostile input against the money, tenancy and link paths.
 * These are the rules an attacker (or a bad copy/paste) would try to break.
 */
import { describe, expect, it } from "vitest";
import { resolveAccess } from "@/lib/access-state";
import {
  isRevoraOwnHost,
  isPossibleTenantHost,
  normalizeHost,
  isTrafficDomainHost,
  customDomainIsLive,
} from "@/lib/revora-address";
import { safeLinkUrl } from "@/lib/website-content";

const DAY = 86_400_000;

describe("access cannot be forged", () => {
  it("keeps a canceled subscription locked even when a setup fee was paid", () => {
    const decision = resolveAccess({
      created_at: new Date(Date.now() - 90 * DAY).toISOString(),
      setup_paid_at: new Date(Date.now() - 60 * DAY).toISOString(),
      setup_payment_status: "paid",
      subscription_status: "canceled",
    });
    expect(decision.state).toBe("CANCELED");
    expect(decision.allowed).toBe(false);
  });

  it("keeps a suspended workspace locked no matter what billing claims", () => {
    const decision = resolveAccess({
      created_at: new Date().toISOString(),
      is_suspended: true,
      setup_payment_status: "paid",
      subscription_status: "active",
    });
    expect(decision.state).toBe("SUSPENDED");
    expect(decision.allowed).toBe(false);
  });

  it("ignores unknown or spoofed status strings instead of granting access", () => {
    for (const status of ["ACTIVE ", "active-ish", "paid", "true", "'; drop table", "??"]) {
      const decision = resolveAccess({
        created_at: new Date(Date.now() - 90 * DAY).toISOString(),
        subscription_status: status,
      });
      expect(decision.allowed).toBe(false);
    }
  });

  it("never explains a lockout with credits or usage limits", () => {
    const locked = resolveAccess({
      created_at: new Date(Date.now() - 90 * DAY).toISOString(),
      subscription_status: "canceled",
    });
    expect(locked.reason.toLowerCase()).not.toMatch(/credit|token|quota|usage limit/);
    expect(locked.builderUsage).toBe("included");
  });
});

describe("tenant hostnames cannot be spoofed", () => {
  it("strips ports, case, trailing dots and whitespace", () => {
    expect(normalizeHost("  ELITE.Revoraweb.Site:8443. ")).toBe("elite.revoraweb.site");
  });

  it("does not treat lookalike domains as Revora's own hosts", () => {
    for (const host of [
      "revoragrowthsystems.com.evil.tld",
      "notrevoragrowthsystems.com",
      "revoraweb.site.attacker.com",
    ]) {
      expect(isRevoraOwnHost(host)).toBe(false);
    }
  });

  it("never treats a revoraweb.site host as a possible client website", () => {
    for (const host of [
      "business.revoraweb.site",
      "customer.revoraweb.site",
      "a.b.revoraweb.site",
      "revoraweb.site",
      "www.revoraweb.site",
      "BUSINESS.Revoraweb.Site:443",
    ]) {
      expect(isPossibleTenantHost(host)).toBe(false);
      expect(isTrafficDomainHost(host)).toBe(true);
    }
  });

  it("does not treat a revoraweb.site lookalike as the traffic domain", () => {
    for (const host of ["evilrevoraweb.site", "revoraweb.site.attacker.com"]) {
      expect(isTrafficDomainHost(host)).toBe(false);
    }
  });

  it("treats localhost and platform hosts as non-tenant hosts", () => {
    expect(isPossibleTenantHost("localhost")).toBe(false);
    expect(isPossibleTenantHost("revoragrowthsystems.com")).toBe(false);
  });

  it("only reports a custom domain live when it is verified end to end", () => {
    expect(customDomainIsLive({ custom_domain: "client.com" })).toBe(false);
    expect(
      customDomainIsLive({
        custom_domain: "client.com",
        dns_ok: true,
        ssl_ok: true,
      }),
    ).toBe(true);
  });
});

describe("client-supplied links cannot execute code", () => {
  it("blocks script-bearing and credential-stealing schemes", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      " javascript:alert(1)",
      "java\tscript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      expect(safeLinkUrl(bad)).toBeNull();
    }
  });

  it("keeps legitimate links, anchors and contact links usable", () => {
    expect(safeLinkUrl("https://client.com/book")).toBe("https://client.com/book");
    expect(safeLinkUrl("/services")).toBe("/services");
    expect(safeLinkUrl("#book")).toBe("#book");
    expect(safeLinkUrl("mailto:hello@client.com")).toBe("mailto:hello@client.com");
  });
});
