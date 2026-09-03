import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Defense-in-depth guard: the public site renderer looks child content up by
 * parent id (page_id / section_id / form_id / question_id). Database composite
 * foreign keys make cross-workspace parents impossible, and these assertions
 * keep the explicit workspace filter in the query layer too, so a future edit
 * cannot silently reintroduce an unscoped child read.
 */
describe("public site child queries stay workspace-scoped", () => {
  const source = readFileSync("src/lib/public-site.server.ts", "utf8");

  const childQueries = [
    'from("quote_questions")',
    'from("quote_options")',
    'from("quote_addons")',
    'from("website_sections")',
    'from("website_components")',
  ];

  it.each(childQueries)("%s filters by organization_id", (marker) => {
    const positions: number[] = [];
    let index = source.indexOf(marker);
    while (index !== -1) {
      positions.push(index);
      index = source.indexOf(marker, index + 1);
    }
    expect(positions.length).toBeGreaterThan(0);
    for (const position of positions) {
      const block = source.slice(position, position + 500);
      expect(block).toContain('.eq("organization_id", orgId)');
    }
  });
});
