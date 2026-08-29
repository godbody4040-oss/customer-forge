import { describe, expect, it } from "vitest";
import { GROWTH_COMMANDS, commandPlan, growthAudit, type GrowthAuditInput } from "./growth-command";

const empty: GrowthAuditInput = {
  businessName: "Test Co",
  description: null,
  tagline: null,
  phone: null,
  email: null,
  city: null,
  serviceArea: null,
  logoUrl: null,
  hoursSet: false,
  headline: null,
  metaDescription: null,
  primaryCtaLabel: null,
  hasCopy: false,
  copyFaqCount: 0,
  copyHeadline: null,
  copyMetaDescription: null,
  copyPrimaryCta: null,
  servicesCount: 0,
  pricedServicesCount: 0,
  bookableCount: 0,
  quoteFormCount: 0,
  mediaCount: 0,
  reviewCount: 0,
  socialLinks: 0,
  pagesCount: 0,
  visibleSections: 0,
  publishState: "draft",
  domainStatus: null,
  visitors: 0,
  leads: 0,
  bookings: 0,
  callClicks: 0,
};

const complete: GrowthAuditInput = {
  ...empty,
  description: "We detail cars at your door.",
  tagline: "Mobile detailing done right",
  phone: "+19195550100",
  email: "hi@test.co",
  city: "Raleigh",
  serviceArea: "Raleigh, Cary, Durham",
  logoUrl: "https://example.com/logo.png",
  hoursSet: true,
  headline: "Mobile detailing in Raleigh",
  metaDescription: "Mobile car detailing across Raleigh, Cary and Durham.",
  primaryCtaLabel: "Get my quote",
  hasCopy: true,
  copyFaqCount: 5,
  servicesCount: 5,
  pricedServicesCount: 5,
  bookableCount: 2,
  quoteFormCount: 1,
  mediaCount: 8,
  reviewCount: 6,
  socialLinks: 3,
  pagesCount: 6,
  visibleSections: 14,
  publishState: "published",
  domainStatus: "ssl_active",
  visitors: 400,
  leads: 20,
  bookings: 6,
  callClicks: 9,
};

describe("growthAudit", () => {
  it("scores an empty workspace low and flags critical gaps", () => {
    const audit = growthAudit(empty);
    expect(audit.score).toBeLessThan(20);
    expect(audit.grade).toBe("Not ready");
    expect(audit.issues.some((i) => i.severity === "critical")).toBe(true);
  });

  it("scores a complete, converting workspace as elite", () => {
    const audit = growthAudit(complete);
    expect(audit.score).toBeGreaterThanOrEqual(90);
    expect(audit.grade).toBe("Elite");
    expect(audit.issues.filter((i) => i.severity === "critical")).toHaveLength(0);
  });

  it("offers an auto fix when drafted copy can fill a blank field", () => {
    const audit = growthAudit({ ...empty, copyPrimaryCta: "Get my quote", copyMetaDescription: "Detailing in Raleigh." });
    expect(audit.findings.find((x) => x.key === "cta")?.autoFix).toBe("apply_cta");
    expect(audit.findings.find((x) => x.key === "meta")?.autoFix).toBe("apply_meta");
  });

  it("waits for real traffic before giving data-based advice", () => {
    expect(growthAudit(empty).findings.some((x) => x.key === "need-visits")).toBe(true);
    expect(growthAudit({ ...complete, visitors: 200, leads: 0 }).findings.some((x) => x.key === "no-leads")).toBe(true);
  });

  it("never marks a healthy workspace's category below its findings", () => {
    const audit = growthAudit(complete);
    for (const cat of audit.categories) expect(cat.earned).toBeLessThanOrEqual(cat.max);
  });

  it("builds a command plan scoped to the command's categories", () => {
    const audit = growthAudit(empty);
    const seo = GROWTH_COMMANDS.find((c) => c.key === "improve-seo")!;
    const plan = commandPlan(seo, audit);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.every((finding) => finding.category === "seo")).toBe(true);
  });
});
