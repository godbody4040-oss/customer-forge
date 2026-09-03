import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CLAIMS, claimStates, type ClaimFacts } from "@/lib/claim-registry";

const root = process.cwd();

describe("claim registry", () => {
  it("has a real implementation and a real test behind every promise", () => {
    for (const claim of CLAIMS) {
      expect(existsSync(resolve(root, claim.module)), `${claim.key}: ${claim.module}`).toBe(true);
      expect(existsSync(resolve(root, claim.test)), `${claim.key}: ${claim.test}`).toBe(true);
    }
  });

  it("uses unique keys", () => {
    expect(new Set(CLAIMS.map((c) => c.key)).size).toBe(CLAIMS.length);
  });

  it("reports capabilities as off when the workspace has not enabled them", () => {
    const facts: ClaimFacts = {
      pagesCount: 0,
      bookableCount: 0,
      quoteFormCount: 0,
      leadsCount: 0,
      followUpAutomations: 0,
      analyticsConfigured: false,
      seoConfigured: false,
      reviewRequests: 0,
      publicHost: null,
      setupPaid: false,
    };
    const states = claimStates(facts);
    expect(states.filter((s) => s.live).map((s) => s.claim.key)).toEqual(["preflight"]);
  });

  it("reports capabilities as live once the workspace really has them", () => {
    const states = claimStates({
      pagesCount: 6,
      bookableCount: 2,
      quoteFormCount: 1,
      leadsCount: 12,
      followUpAutomations: 3,
      analyticsConfigured: true,
      seoConfigured: true,
      reviewRequests: 4,
      publicHost: "elite.com",
      setupPaid: true,
    });
    expect(states.every((s) => s.live)).toBe(true);
  });
});
