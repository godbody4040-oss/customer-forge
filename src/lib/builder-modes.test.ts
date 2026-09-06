import { describe, expect, it } from "vitest";
import { BUILDER_MODES, BUILDER_QUICK_ACTIONS, normalizeBuilderMode } from "./builder-modes";

describe("builder information architecture", () => {
  it("exposes exactly the five primary modes in order", () => {
    expect(BUILDER_MODES.map((mode) => mode.key)).toEqual([
      "build",
      "design",
      "pages",
      "ai",
      "launch",
    ]);
  });

  it("keeps older builder deep links working", () => {
    expect(normalizeBuilderMode(undefined)).toBe("build");
    expect(normalizeBuilderMode("structure")).toBe("pages");
    expect(normalizeBuilderMode("media")).toBe("design");
    expect(normalizeBuilderMode("assistant")).toBe("ai");
    expect(normalizeBuilderMode("publish")).toBe("launch");
    expect(normalizeBuilderMode("nonsense")).toBe("build");
  });

  it("every mode has a plain-language hint without technical jargon", () => {
    const jargon = /html|css|component|breakpoint|schema|dom/i;
    for (const mode of BUILDER_MODES) {
      expect(mode.hint.length).toBeGreaterThan(3);
      expect(jargon.test(`${mode.label} ${mode.hint}`)).toBe(false);
    }
  });

  it("quick actions are real, unique, plain-language instructions", () => {
    expect(BUILDER_QUICK_ACTIONS.length).toBeGreaterThanOrEqual(12);
    const labels = new Set<string>();
    for (const action of BUILDER_QUICK_ACTIONS) {
      expect(labels.has(action.label)).toBe(false);
      labels.add(action.label);
      expect(action.instruction.length).toBeGreaterThan(40);
      expect(action.instruction).not.toMatch(/TODO|lorem/i);
    }
  });

  it("never asks the builder to invent facts", () => {
    const inventing = BUILDER_QUICK_ACTIONS.filter((action) =>
      /make up|invent (?!claims|prices)/i.test(action.instruction),
    );
    expect(inventing).toEqual([]);
  });
});
