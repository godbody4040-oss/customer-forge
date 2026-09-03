import { describe, expect, it } from "vitest";
import {
  describeRegressions,
  detectRegressions,
  shouldRollback,
  type HealthSnapshot,
} from "@/lib/site-regression";

const base: HealthSnapshot = {
  at: "2026-09-01T00:00:00.000Z",
  score: 88,
  pages: ["home", "services", "contact"],
  sections: { home: 7, services: 4, contact: 2 },
  checks: { "forms:lead": "pass", "seo:title": "pass", "domain:https": "pass" },
  ctas: 5,
  forms: 2,
  publicHttps: true,
};

const after = (over: Partial<HealthSnapshot>): HealthSnapshot => ({
  ...base,
  at: "2026-09-02T00:00:00.000Z",
  ...over,
});

describe("regression detection", () => {
  it("reports nothing when the site is unchanged", () => {
    expect(detectRegressions(base, after({}))).toEqual([]);
    expect(describeRegressions([])).toBe("No regressions detected.");
  });

  it("does not complain when things improve", () => {
    expect(detectRegressions(base, after({ score: 95, ctas: 7, forms: 3 }))).toEqual([]);
  });

  it("catches a removed page as critical", () => {
    const found = detectRegressions(base, after({ pages: ["home", "contact"] }));
    expect(found[0]?.kind).toBe("page_removed");
    expect(shouldRollback(found)).toBe(true);
  });

  it("catches emptied sections and lost forms", () => {
    const found = detectRegressions(base, after({ sections: { ...base.sections, home: 0 }, forms: 0 }));
    const kinds = found.map((f) => f.kind);
    expect(kinds).toContain("sections_removed");
    expect(kinds).toContain("forms_removed");
    expect(found.find((f) => f.kind === "forms_removed")?.message).toContain("new leads can't");
  });

  it("catches a check that went from pass to fail, but ignores skipped checks", () => {
    const found = detectRegressions(
      base,
      after({ checks: { ...base.checks, "forms:lead": "fail", "seo:title": "skip" } }),
    );
    expect(found.filter((f) => f.kind === "check_regressed")).toHaveLength(1);
    expect(found[0]?.severity).toBe("critical");
  });

  it("flags the site going offline and a real score drop", () => {
    const found = detectRegressions(base, after({ publicHttps: false, score: 55 }));
    expect(found[0]?.kind).toBe("site_offline");
    expect(found.some((f) => f.kind === "score" && f.severity === "critical")).toBe(true);
    expect(describeRegressions(found)).toContain("critical");
  });

  it("ignores score noise below the threshold", () => {
    expect(detectRegressions(base, after({ score: 86 }))).toEqual([]);
  });
});
