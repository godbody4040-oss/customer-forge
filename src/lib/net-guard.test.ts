import { describe, it, expect } from "vitest";
import { guardedFetch, isFetchableHostname } from "@/lib/net-guard.server";
describe("ssrf guard", () => {
  it("rejects private and metadata hosts", () => {
    for (const h of [
      "localhost",
      "127.0.0.1",
      "169.254.169.254",
      "10.0.0.5",
      "192.168.1.1",
      "172.16.0.9",
      "[::1]",
      "metadata.google.internal",
      "0.0.0.0",
    ]) {
      expect(isFetchableHostname(h), h).toBe(false);
    }
    expect(isFetchableHostname("example.com")).toBe(true);
  });
  it("rejects non-http, credential and odd-port urls", async () => {
    for (const u of [
      "file:///etc/passwd",
      "http://example.com@169.254.169.254/",
      "https://example.com:8081/",
      "gopher://x",
    ]) {
      await expect(guardedFetch(u), u).rejects.toThrow();
    }
  });
});
