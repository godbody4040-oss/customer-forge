import { describe, expect, it } from "vitest";
import { businessDna, dnaBrief, screenClaims, type DnaFacts } from "@/lib/business-dna";

const roofer: DnaFacts = {
  businessName: "Lone Star Roofing",
  industry: "Roofing",
  services: ["Roof replacement", "Roof repair", "Roof inspection"],
  city: "Dallas",
  serviceArea: "Dallas & Fort Worth",
  phone: "(214) 555 0110",
  email: "hello@lonestar.example",
  conversionGoal: "calls",
  hasHours: true,
};

describe("business DNA", () => {
  it("derives strategy from supplied facts and lists what is missing", () => {
    const dna = businessDna(roofer);
    expect(dna.positioning).toContain("Dallas & Fort Worth");
    expect(dna.urgency).toBe("emergency");
    expect(dna.primaryCta).toBe("Call now");
    expect(dna.desiredAction).toBe("Get the phone ringing");
    expect(dna.geoStrategy).toBe("multi_area");
    expect(dna.seoStrategy[0]).toBe("Roofing in Dallas & Fort Worth");
    expect(dna.unknown).toContain("photos of real work");
    expect(dna.needed.length).toBeGreaterThan(0);
    expect(dna.confidence).toBeGreaterThan(50);
  });

  it("never fabricates identity when nothing was supplied", () => {
    const dna = businessDna({});
    expect(dna.name).toBe("This business");
    expect(dna.services).toEqual([]);
    expect(dna.city).toBeNull();
    expect(dna.unknown).toContain("industry");
    expect(dna.confidence).toBe(0);
    expect(dna.prohibited).toContain("awards");
  });

  it("classifies appointment and project trades differently", () => {
    expect(businessDna({ industry: "Mobile car detailing", bookableServices: 3 }).primaryCta).toBe(
      "Book a time",
    );
    const remodel = businessDna({ industry: "Kitchen remodeling" });
    expect(remodel.urgency).toBe("planned");
    expect(remodel.qualifyingFields).toContain("Rough size of the job");
  });

  it("uses real prices only when the client entered them", () => {
    expect(businessDna(roofer).pricingModel).toBe("quote_per_job");
    expect(businessDna({ ...roofer, hasPrices: true }).pricingModel).toBe("starting_prices");
  });

  it("screens invented claims out of copy but allows supplied facts", () => {
    const issues = screenClaims(
      "Award-winning, licensed roofers with a 5 star rating and a 100% guarantee.",
      roofer,
    );
    expect(issues.map((i) => i.reason)).toEqual(
      expect.arrayContaining(["award", "credential", "star rating", "statistic", "guarantee"]),
    );

    const allowed = screenClaims("Certified installers.", {
      ...roofer,
      certifications: "GAF Master Elite",
    });
    expect(allowed.some((i) => i.reason === "credential")).toBe(false);
  });

  it("renders a prompt brief that carries the do-not-guess ledger", () => {
    const brief = dnaBrief(businessDna(roofer));
    expect(brief).toContain("NEVER CLAIM");
    expect(brief).toContain("UNKNOWN — never guess");
    expect(brief).toContain("Lone Star Roofing");
  });
});
