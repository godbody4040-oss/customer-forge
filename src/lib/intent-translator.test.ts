import { describe, expect, it } from "vitest";
import { translateIntent } from "@/lib/intent-translator";

describe("intent translator", () => {
  it("never rejects a request, however it is worded", () => {
    for (const text of [
      "i want people to stop leaving my page",
      "make it look like the expensive plumbers near me",
      "help",
      "asdkjhaskdjh",
    ]) {
      const intent = translateIntent(text);
      expect(intent.brief).toContain(text);
      expect(intent.brief).toMatch(/Never refuse a request/);
      expect(intent.restated).toMatch(/Revora will handle/);
    }
  });

  it("works out the areas a plain request touches", () => {
    const intent = translateIntent("add a page for gutter cleaning so google finds me");
    expect(intent.areas).toContain("pages");
    expect(intent.areas).toContain("seo");
  });

  it("asks at most one question, and only for facts it cannot know", () => {
    expect(translateIntent("make my home page nicer").question).toBeNull();
    const prices = translateIntent("show my prices on the services page");
    expect(prices.question).toMatch(/prices/i);
    expect(prices.brief).toMatch(/Ask at most one question/i);
  });

  it("handles empty input without throwing", () => {
    const intent = translateIntent("   ");
    expect(intent.brief).toBe("");
    expect(intent.restated).toMatch(/your own words/);
  });
});
