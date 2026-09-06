
describe("building a page and filling it in one plan", () => {
  const known = {
    pageIds: new Set<string>(),
    sectionIds: new Set<string>(),
    componentIds: new Set<string>(),
  };

  it("keeps steps that point at a page the same plan creates", () => {
    const actions = readActions(
      [
        { type: "add_page", kind: "services", title: "Services", slug: "services", ref: "temp_1" },
        { type: "add_section", pageId: "temp_1", kind: "hero", heading: "Mobile detailing" },
        { type: "set_page", pageId: "temp_1", patch: { seo_title: "Detailing services" } },
      ],
      known,
    );
    expect(actions).toHaveLength(3);
    expect(actions[0]).toMatchObject({ type: "add_page", ref: "temp_1" });
    expect(actions[1]).toMatchObject({ type: "add_section", pageId: "temp_1" });
  });

  it("drops steps that point at a page nobody created", () => {
    const actions = readActions(
      [{ type: "add_section", pageId: "temp_9", kind: "hero", heading: "Hi" }],
      known,
    );
    expect(actions).toHaveLength(0);
  });

  it("ignores a made-up reference name", () => {
    const actions = readActions(
      [
        { type: "add_page", kind: "about", title: "About", slug: "about", ref: "../../etc" },
        { type: "add_section", pageId: "../../etc", kind: "hero" },
      ],
      known,
    );
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: "add_page", ref: undefined });
  });
});
