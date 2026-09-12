import { describe, expect, it } from "vitest";
import { interpret } from "./interpreter";

describe("builder interpreter safety", () => {
  it("does not turn a hero refresh into a whole-site rebuild", () => {
    const result = interpret("refresh the hero headline");

    expect(result.wholeSite).toBe(false);
    expect(result.sectionKinds).toContain("hero");
    expect(result.goals).toContain("redesign");
  });

  it("does not turn a scoped redesign into a whole-site rebuild", () => {
    const result = interpret("redesign the pricing section");

    expect(result.wholeSite).toBe(false);
    expect(result.sectionKinds).toContain("pricing");
    expect(result.goals).toContain("redesign");
  });

  it("allows a clearly explicit whole-site rebuild", () => {
    const result = interpret("rebuild my entire website from scratch");

    expect(result.wholeSite).toBe(true);
  });

  it("allows an explicit website-creation request", () => {
    const result = interpret("build me a website for my plumbing business");

    expect(result.wholeSite).toBe(true);
  });

  it("keeps multi-step requests scoped to their own clauses", () => {
    const result = interpret(
      "remove the gallery and add a booking section",
    );

    expect(result.operations.length).toBeGreaterThanOrEqual(2);

    const removeOperation = result.operations.find((operation) =>
      operation.verbs.includes("remove"),
    );

    const addOperation = result.operations.find((operation) =>
      operation.verbs.includes("add"),
    );

    expect(removeOperation?.sectionKinds).toContain("gallery");
    expect(addOperation?.sectionKinds).toContain("booking");
  });

  it("does not split protected before-and-after wording", () => {
    const result = interpret("add a before and after gallery");

    expect(result.operations.length).toBe(1);
    expect(result.sectionKinds).toContain("gallery");
  });

  it("preserves fact-safety constraints", () => {
    const result = interpret(
      "refresh the hero but do not invent reviews or change my business details",
    );

    expect(result.wholeSite).toBe(false);
    expect(result.keepFacts).toBe(true);
    expect(result.constraints).toContain("no_invention");
    expect(result.constraints).toContain("keep_facts");
  });
});
