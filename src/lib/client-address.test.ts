import { describe, expect, it } from "vitest";
import {
  REVORA_ROOT,
  REVORA_SUBDOMAIN_HOSTING_ENABLED,
  customDomainIsLive,
  liveAddressUrl,
  primaryAddress,
  revoraHostIsLive,
} from "@/lib/revora-address";

describe("production client address model", () => {
  it("keeps revoragrowthsystems.com as the platform domain", () => {
    expect(REVORA_ROOT).toBe("revoragrowthsystems.com");
  });

  it("deactivates Revora-branded client hosting", () => {
    expect(REVORA_SUBDOMAIN_HOSTING_ENABLED).toBe(false);
    expect(revoraHostIsLive({ subdomain: "acme", revora_host_ok: true })).toBe(false);
  });

  it("never treats an unverified client domain as live", () => {
    expect(customDomainIsLive({ custom_domain: "acme.com", dns_ok: true, ssl_ok: false })).toBe(
      false,
    );
    expect(customDomainIsLive({ custom_domain: "acme.com", dns_ok: true, ssl_ok: true })).toBe(true);
  });

  it("makes the verified client domain the public address, never a Revora subdomain", () => {
    const settings = {
      custom_domain: "acme.com",
      subdomain: "acme",
      dns_ok: true,
      ssl_ok: true,
      revora_host_ok: true,
    };
    expect(primaryAddress(settings)).toBe("acme.com");
    expect(liveAddressUrl(settings, "acme").url).toBe("https://acme.com");
  });

  it("falls back to the platform preview path while a domain is unverified", () => {
    const address = liveAddressUrl(
      { custom_domain: "acme.com", subdomain: "acme", dns_ok: false, ssl_ok: false },
      "acme",
    );
    expect(address.kind).toBe("path");
    expect(address.url).toBe(`https://${REVORA_ROOT}/s/acme`);
  });
});
