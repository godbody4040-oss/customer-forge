import { describe, expect, it } from "vitest";
import { businessDna } from "@/lib/business-dna";
import {
  describeFingerprint,
  designFingerprint,
  distinctFingerprint,
  similarity,
  tooSimilar,
} from "@/lib/design-fingerprint";

const dna = (over: Parameters<typeof businessDna>[0] = {}) =>
  businessDna({ businessName: "Acme", industry: "Roofing", city: "Dallas", ...over });

describe("design fingerprint", () => {
  it("is deterministic for the same business", () => {
    const a = designFingerprint({ organizationId: "org-1", dna: dna() });
    const b = designFingerprint({ organizationId: "org-1", dna: dna() });
    expect(a).toEqual(b);
  });

  it("gives two businesses in the same trade and town different designs", () => {
    const a = designFingerprint({ organizationId: "org-1", dna: dna({ businessName: "Acme" }) });
    const b = designFingerprint({ organizationId: "org-2", dna: dna({ businessName: "Bravo" }) });
    expect(similarity(a, b)).toBeLessThan(1);
    expect(a.id).not.toBe(b.id);
  });

  it("steers urgent trades away from heavy motion", () => {
    const urgent = designFingerprint({
      organizationId: "org-9",
      dna: dna({ industry: "Emergency plumbing" }),
    });
    expect(["none", "subtle-fade"]).toContain(urgent.motion);
    expect(["banner", "stacked", "split"]).toContain(urgent.hero);
  });

  it("detects excessive similarity", () => {
    const a = designFingerprint({ organizationId: "org-1", dna: dna() });
    expect(tooSimilar(a, [a]).similar).toBe(false); // single self-compare is ignored
    expect(tooSimilar(a, [a, a], 0.5).similar).toBe(true);
  });

  it("re-rolls the visual direction until the site is distinct", () => {
    const first = designFingerprint({ organizationId: "org-1", dna: dna() });
    const result = distinctFingerprint({ organizationId: "org-1", dna: dna() }, [first, first]);
    expect(similarity(result.fingerprint, first)).toBeLessThanOrEqual(0.6);
    expect(result.revision).toBeGreaterThan(0);
  });

  it("describes the look in plain language", () => {
    const text = describeFingerprint(designFingerprint({ organizationId: "org-1", dna: dna() }));
    expect(text).toMatch(/headings/);
    expect(text).toMatch(/hero/);
  });
});
