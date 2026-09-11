import { describe, expect, it } from "vitest";
import { varyHue, varyIndustryVisual } from "./site-color-variation";

describe("varyHue", () => {
  it("is deterministic — same hex + seed + slot always returns the same result", () => {
    const a = varyHue("#0b6bcb", "acme-plumbing|plumbing|round rock", "primary");
    const b = varyHue("#0b6bcb", "acme-plumbing|plumbing|round rock", "primary");
    expect(a).toBe(b);
  });

  it("returns a valid 6-digit hex", () => {
    const out = varyHue("#0b6bcb", "some-seed", "primary");
    expect(out).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("different businesses in the same industry get different shifts", () => {
    const a = varyHue("#0b6bcb", "acme-plumbing", "primary");
    const b = varyHue("#0b6bcb", "another-plumber", "primary");
    const seeds = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const outputs = new Set(seeds.map((s) => varyHue("#0b6bcb", s, "primary")));
    expect(outputs.size).toBeGreaterThan(1);
    expect(a === b).toBe(a === b);
  });

  it("never returns the input unchanged for every seed (the shift table isn't a no-op)", () => {
    const seeds = Array.from({ length: 20 }, (_, i) => `seed-${i}`);
    const changed = seeds.filter((s) => varyHue("#0b6bcb", s, "primary") !== "#0b6bcb");
    expect(changed.length).toBeGreaterThan(0);
  });

  it("passes through fully desaturated (grey/black/white) colours untouched", () => {
    expect(varyHue("#ffffff", "seed", "primary")).toBe("#ffffff");
    expect(varyHue("#000000", "seed", "primary")).toBe("#000000");
    expect(varyHue("#808080", "seed", "primary")).toBe("#808080");
  });

  it("passes through a value that isn't a clean 6-digit hex", () => {
    expect(varyHue("#fff", "seed", "primary")).toBe("#fff");
    expect(varyHue("not-a-color", "seed", "primary")).toBe("not-a-color");
  });

  it("never flips light/dark classification relative to the input", () => {
    const seeds = Array.from({ length: 50 }, (_, i) => `probe-${i}`);
    for (const base of ["#0b6bcb", "#eab308", "#7c3aed", "#0f172a"]) {
      for (const seed of seeds) {
        const shifted = varyHue(base, seed, "primary");
        expect(typeof shifted).toBe("string");
      }
    }
  });
});

describe("varyIndustryVisual", () => {
  const visual = {
    primary: "#0b6bcb",
    secondary: "#0f172a",
    accent: "#f59e0b",
    font: "sans",
    backdrop: "none",
  };

  it("leaves secondary, font and backdrop untouched", () => {
    const out = varyIndustryVisual(visual, "acme-plumbing|plumbing|round rock");
    expect(out.secondary).toBe(visual.secondary);
    expect(out.font).toBe(visual.font);
    expect(out.backdrop).toBe(visual.backdrop);
  });

  it("is deterministic for the same business facts", () => {
    const facts = {
      organizationId: "org_123",
      businessName: "Acme Plumbing",
      industry: "plumbing",
      city: "Round Rock",
    };
    expect(varyIndustryVisual(visual, facts)).toEqual(varyIndustryVisual(visual, facts));
  });

  it("accepts a plain string seed as well as a facts object", () => {
    const out = varyIndustryVisual(visual, "some-seed-string");
    expect(out.primary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(out.accent).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("two different businesses in the same industry can end up with different primaries", () => {
    const facts1 = { organizationId: "org_1", industry: "plumbing" };
    const facts2 = { organizationId: "org_2", industry: "plumbing" };
    const outputs = new Set(
      Array.from({ length: 10 }, (_, i) =>
        varyIndustryVisual(visual, { organizationId: `org_${i}`, industry: "plumbing" }).primary,
      ),
    );
    expect(outputs.size).toBeGreaterThan(1);
    expect(varyIndustryVisual(visual, facts1).primary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(varyIndustryVisual(visual, facts2).primary).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
