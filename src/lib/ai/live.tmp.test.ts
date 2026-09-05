import { describe, expect, it } from "vitest";
import { generateText, generateStructuredOutput } from "@/lib/ai/router.server";

describe("live providers", () => {
  it("google answers", async () => {
    process.env["AI_DEFAULT_PROVIDER"] = "google";
    delete process.env["AI_FALLBACK_PROVIDER"];
    const saved = process.env["OPENAI_API_KEY"];
    delete process.env["OPENAI_API_KEY"];
    const r = await generateText({ task: "live.google", organizationId: null, userId: null }, {
      messages: [{ role: "user", content: "Reply with the single word: ready" }],
    });
    process.env["OPENAI_API_KEY"] = saved!;
    console.log("GOOGLE:", r.provider, r.model, JSON.stringify(r.text.slice(0, 60)));
    expect(r.text.toLowerCase()).toContain("ready");
  }, 60000);

  it("openai answers and json works", async () => {
    process.env["AI_DEFAULT_PROVIDER"] = "openai";
    const saved = process.env["GOOGLE_AI_API_KEY"];
    delete process.env["GOOGLE_AI_API_KEY"];
    const r = await generateStructuredOutput({ task: "live.openai", organizationId: null, userId: null }, {
      messages: [{ role: "user", content: 'Return JSON: {"status":"ready"}' }],
    });
    process.env["GOOGLE_AI_API_KEY"] = saved!;
    console.log("OPENAI:", r.provider, r.model, JSON.stringify(r.data));
    expect(r.data["status"]).toBe("ready");
  }, 60000);
});
