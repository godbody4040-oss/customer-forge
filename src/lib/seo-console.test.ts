import { describe, expect, it } from "vitest";
import { consoleCoverage, parseConsoleRows, seoOpportunities } from "@/lib/seo-console";

const csv = `Query,Landing Page,Clicks,Impressions,Position
"crm for plumbers",https://revoragrowthsystems.com/industries/plumbers,0,420,12.4
"revora",https://revoragrowthsystems.com/,31,900,1.8
broken line,,x,y,z`;

describe("search console feedback loop", () => {
  it("reads a real export and skips malformed rows", () => {
    const rows = parseConsoleRows(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.page).toContain("/industries/plumbers");
    expect(rows[0]?.impressions).toBe(420);
  });

  it("reads tab-separated copies and previous-period columns", () => {
    const rows = parseConsoleRows(
      "Page\tClicks\tImpressions\tPosition\tPrevious clicks\tPrevious impressions\n/pricing\t4\t200\t8.1\t20\t150",
    );
    expect(rows[0]?.previous).toEqual({ clicks: 20, impressions: 150 });
  });

  it("returns nothing when the data is unusable", () => {
    expect(parseConsoleRows("")).toEqual([]);
    expect(parseConsoleRows("Page\nonly-a-header")).toEqual([]);
  });

  it("turns real rows into prioritised recommendations", () => {
    const rows = parseConsoleRows(csv);
    const found = seoOpportunities(rows);
    expect(found.length).toBeGreaterThan(0);
    expect(found[0]?.recommendation).toBeTruthy();
    expect(found.every((item) => item.page.startsWith("/"))).toBe(true);
  });

  it("summarises coverage from the data only", () => {
    const coverage = consoleCoverage(parseConsoleRows(csv));
    expect(coverage.rows).toBe(2);
    expect(coverage.clicks).toBe(31);
    expect(coverage.impressions).toBe(1320);
  });
});
