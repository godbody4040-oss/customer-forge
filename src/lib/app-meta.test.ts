import { describe, expect, it } from "vitest";
import {
  META_FALLBACK_DESCRIPTION,
  META_FALLBACK_TITLE,
  PRIVATE_ROBOTS,
  REVIEWS_META,
  buildPrivateMeta,
} from "./app-meta";

function tag(meta: typeof REVIEWS_META.meta, key: string) {
  const found = meta.find(
    (entry) => ("name" in entry && entry.name === key) || ("property" in entry && entry.property === key),
  );
  return found && "content" in found ? found.content : undefined;
}

describe("/app/reviews search & social metadata", () => {
  const { meta, links, resolved } = REVIEWS_META;

  it("keeps the exact approved title and description", () => {
    expect(resolved.title).toBe("Reviews & Reputation — Revora");
    expect(resolved.description).toBe(
      "Collect 5-star reviews automatically after every completed job, reply fast, and publish the best testimonials straight to your website.",
    );
    expect(meta[0]).toEqual({ title: resolved.title });
    expect(resolved.description.length).toBeLessThan(200);
  });

  it("is excluded from search and link-following for every crawler", () => {
    expect(resolved.robots).toBe(PRIVATE_ROBOTS);
    for (const agent of ["robots", "googlebot", "bingbot"]) {
      expect(tag(meta, agent)).toContain("noindex");
      expect(tag(meta, agent)).toContain("nofollow");
    }
    expect(tag(meta, "GPTBot")).toBe("noindex, nofollow");
  });

  it("self-references canonical and og:url on the project domain", () => {
    expect(links).toEqual([{ rel: "canonical", href: "https://revoragrowthsystems.com/app/reviews" }]);
    expect(resolved.ogUrl).toBe("https://revoragrowthsystems.com/app/reviews");
    expect(tag(meta, "og:url")).toBe(resolved.canonical);
  });

  it("emits complete OpenGraph and Twitter cards", () => {
    expect(tag(meta, "og:title")).toBe(resolved.title);
    expect(tag(meta, "og:description")).toBe(resolved.description);
    expect(tag(meta, "og:type")).toBe("website");
    expect(tag(meta, "og:site_name")).toBe("Revora");
    expect(tag(meta, "twitter:card")).toBe("summary");
    expect(tag(meta, "twitter:title")).toBe(resolved.title);
    expect(tag(meta, "twitter:description")).toBe(resolved.description);
  });

  it("omits image tags when there is no absolute image (host supplies the preview)", () => {
    expect(resolved.image).toBeNull();
    expect(tag(meta, "og:image")).toBeUndefined();
    expect(tag(meta, "twitter:image")).toBeUndefined();
  });
});

describe("buildPrivateMeta fallbacks", () => {
  it("falls back to brand title and description when blank", () => {
    const result = buildPrivateMeta({ path: "app/anything", title: "   ", description: "" });
    expect(result.resolved.title).toBe(META_FALLBACK_TITLE);
    expect(result.resolved.description).toBe(META_FALLBACK_DESCRIPTION);
    expect(result.resolved.ogTitle).toBe(META_FALLBACK_TITLE);
    expect(result.resolved.twitterTitle).toBe(META_FALLBACK_TITLE);
  });

  it("normalizes paths into a single canonical form", () => {
    expect(buildPrivateMeta({ path: "app/reviews/" }).resolved.canonical).toBe(
      "https://revoragrowthsystems.com/app/reviews",
    );
  });

  it("rejects relative or insecure images and upgrades the card when one is valid", () => {
    expect(buildPrivateMeta({ path: "/app/x", image: "/local.png" }).resolved.image).toBeNull();
    expect(buildPrivateMeta({ path: "/app/x", image: "http://a.com/i.png" }).resolved.image).toBeNull();
    const ok = buildPrivateMeta({ path: "/app/x", image: "https://a.com/i.png" });
    expect(ok.resolved.image).toBe("https://a.com/i.png");
    expect(ok.resolved.twitterCard).toBe("summary_large_image");
    expect(tag(ok.meta, "twitter:image")).toBe("https://a.com/i.png");
  });
});
