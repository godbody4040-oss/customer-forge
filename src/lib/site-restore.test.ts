import { describe, expect, it } from "vitest";
import { buildFullSnapshot, countSnapshot, planRestore, readFullSnapshot, snapshotsMatch } from "./site-restore";

const pages = [{ id: "p1", slug: "home", title: "Home", kind: "home", sort_order: 0 }];
const sections = [{ id: "s1", page_id: "p1", kind: "hero", variant: "bold", heading: "Hi", sort_order: 0 }];
const components = [
  { id: "c1", section_id: "s1", kind: "button", label: "Call", link_url: "tel:+15550001111", sort_order: 0 },
];

describe("site-restore", () => {
  it("captures pages, sections and components as a nested snapshot", () => {
    const snap = buildFullSnapshot(pages, sections, components, "2026-01-01T00:00:00.000Z");
    expect(countSnapshot(snap)).toEqual({ pages: 1, sections: 1, components: 1 });
    expect(snap.pages[0]!.sections[0]!.components[0]!.label).toBe("Call");
    expect(snap.pages[0]!.sections[0]!.variant).toBe("bold");
  });

  it("plans deletions for items added after the snapshot", () => {
    const before = buildFullSnapshot(pages, sections, components);
    const after = buildFullSnapshot(
      [...pages, { id: "p2", slug: "extra", title: "Extra", kind: "custom", sort_order: 1 }],
      [...sections, { id: "s2", page_id: "p1", kind: "faq", sort_order: 1 }],
      [...components, { id: "c2", section_id: "s1", kind: "text", body: "new", sort_order: 1 }],
    );
    const plan = planRestore(after, before);
    expect(plan.deletePageIds).toEqual(["p2"]);
    expect(plan.deleteSectionIds).toEqual(["s2"]);
    expect(plan.deleteComponentIds).toEqual(["c2"]);
    expect(plan.pages).toHaveLength(1);
    expect(plan.summary).toContain("restored exactly");
  });

  it("keeps original ids so links stay valid", () => {
    const snap = buildFullSnapshot(pages, sections, components);
    const plan = planRestore(null, snap);
    expect(plan.components[0]!.id).toBe("c1");
    expect(plan.components[0]!.section_id).toBe("s1");
    expect(plan.sections[0]!.page_id).toBe("p1");
  });

  it("verifies an exact match and rejects unreadable snapshots", () => {
    const snap = buildFullSnapshot(pages, sections, components);
    expect(snapshotsMatch(snap, buildFullSnapshot(pages, sections, components))).toBe(true);
    expect(snapshotsMatch(snap, buildFullSnapshot(pages, sections, []))).toBe(false);
    expect(readFullSnapshot({ format: 2, pages: [] })).toBeNull();
    expect(readFullSnapshot(snap)).not.toBeNull();
  });
});
