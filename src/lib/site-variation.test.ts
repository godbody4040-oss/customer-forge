import { describe, expect, it } from "vitest";
import { siteVariation } from "./site-variation";
import { buildContentBlueprint } from "./website-content";

const facts = (organizationId: string, businessName: string) => ({
  organizationId,
  businessName,
  industry: "Plumbing",
  city: "Raleigh",
});

describe("siteVariation", () => {
  it("is stable for the same business", () => {
    const a = siteVariation(facts("org-1", "Ace Plumbing"));
    const b = siteVariation(facts("org-1", "Ace Plumbing"));
    expect(a.id).toBe(b.id);
    expect(a.heroVariant).toBe(b.heroVariant);
    expect(a.optionalOrder).toEqual(b.optionalOrder);
  });

  it("differs between two businesses in the same trade", () => {
    const a = siteVariation(facts("org-1", "Ace Plumbing"));
    const b = siteVariation(facts("org-2", "Bright Plumbing"));
    const fingerprint = (v: ReturnType<typeof siteVariation>) =>
      [v.heroVariant, v.serviceVariant, v.optionalOrder.join(","), v.heading("services")].join("|");
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });
});

describe("blueprint variation", () => {
  const input = (organizationId: string) => ({
    organizationId,
    businessName: "Ace Plumbing",
    industry: "Plumbing",
    city: "Raleigh",
    state: "NC",
    serviceArea: "Raleigh, Durham",
    description: "We fix leaks fast. Same-day callouts.",
    phone: "555-0100",
    email: "hi@ace.test",
    hasHours: true,
    photoCount: 3,
    reviewCount: 12,
    ctaLabel: "Get my price",
    services: [{ name: "Leak repair", starting_price: 120 }],
    benefits: ["Same-day service"],
    faqs: [{ question: "Do you charge callout?", answer: "No." }],
  });

  const homeShape = (orgId: string) => {
    const home = buildContentBlueprint(input(orgId))[0]!;
    return `${home.sections.map((s) => s.kind).join(">")}::${home.sections[0]!.heading}`;
  };

  it("produces different home layouts for different clients", () => {
    expect(homeShape("org-1")).not.toBe(homeShape("org-9"));
  });

  it("stays the same on rebuild for one client", () => {
    expect(homeShape("org-1")).toBe(homeShape("org-1"));
  });
});
