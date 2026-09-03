import { describe, expect, it } from "vitest";
import { addressFields, formatMoney, regionProfile, telHref } from "@/lib/locale";

describe("globalization", () => {
  it("uses the client's country instead of assuming the US", () => {
    const gb = regionProfile({ country: "gb" });
    expect(gb.currency).toBe("GBP");
    expect(gb.postalLabel).toBe("Postcode");
    expect(gb.measurement).toBe("metric");
    expect(addressFields(gb)[1]).toBe("Postcode");

    const us = regionProfile({ country: "US" });
    expect(us.postalLabel).toBe("ZIP code");
    expect(addressFields(us)[1]).toBe("Town / city");
  });

  it("falls back to a neutral profile when the country is unknown", () => {
    const neutral = regionProfile({});
    expect(neutral.country).toBeNull();
    expect(neutral.regionLabel).toBe("Region / state");
  });

  it("formats money in the client's currency", () => {
    expect(formatMoney(750, regionProfile({ country: "US" }))).toContain("750");
    expect(formatMoney(750, regionProfile({ country: "DE" }))).toMatch(/€/);
  });

  it("builds safe international tel links and rejects junk", () => {
    expect(telHref("+44 7123 456789")).toBe("tel:+447123456789");
    expect(telHref("(214) 555-0110")).toBe("tel:2145550110");
    expect(telHref("call us")).toBeNull();
    expect(telHref("12")).toBeNull();
    expect(telHref(null)).toBeNull();
  });
});
