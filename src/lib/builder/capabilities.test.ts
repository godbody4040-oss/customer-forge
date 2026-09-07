import { describe, expect, it } from "vitest";
import { attachmentNotice, buildCapabilities } from "./capabilities";

describe("builder capabilities", () => {
  it("always reports the free own engine, even with nothing else available", () => {
    const caps = buildCapabilities({ onDevice: false, selfHosted: false, external: false });
    expect(caps.levels).toEqual(["own_engine"]);
    expect(caps.chosen).toBe("own_engine");
    expect(caps.freeToRun).toBe(true);
    expect(caps.summary).toContain("own engine");
  });

  it("prefers a free on-device model over an outside provider", () => {
    const caps = buildCapabilities({ onDevice: true, selfHosted: false, external: true });
    expect(caps.chosen).toBe("on_device");
    expect(caps.levels).toEqual(["own_engine", "on_device", "external"]);
  });

  it("never claims to understand photos, recordings or documents", () => {
    const caps = buildCapabilities({ onDevice: true, selfHosted: true, external: true });
    expect(caps.imageUnderstanding).toBe(false);
    expect(caps.audioUnderstanding).toBe(false);
    expect(caps.documentUnderstanding).toBe(false);
    expect(attachmentNotice(caps, "image")).toContain("cannot read them");
    expect(attachmentNotice(caps, "audio")).toContain("recordings");
  });
});
