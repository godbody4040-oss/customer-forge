import { describe, expect, it } from "vitest";
import { interactionSummary, scanInteractions } from "@/lib/interaction-health";
import type { ContentComponent, ContentPage, ContentSection } from "@/lib/website-content";

let seq = 0;
const id = () => `id-${++seq}`;

function component(patch: Partial<ContentComponent> = {}): ContentComponent {
  return {
    id: id(),
    section_id: "sec",
    kind: "button",
    label: "Get a quote",
    body: null,
    media_url: null,
    link_url: null,
    link_label: null,
    settings: {},
    sort_order: 0,
    is_visible: true,
    ...patch,
  };
}

function section(patch: Partial<ContentSection> = {}): ContentSection {
  return {
    id: id(),
    page_id: "page",
    kind: "hero",
    variant: "default",
    heading: "Hero",
    subheading: null,
    body: null,
    settings: {},
    sort_order: 0,
    is_visible: true,
    components: [],
    ...patch,
  };
}

function page(patch: Partial<ContentPage> = {}): ContentPage {
  return {
    id: id(),
    slug: "home",
    title: "Home",
    kind: "home",
    sort_order: 0,
    is_visible: true,
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    og_title: null,
    og_description: null,
    og_image_url: null,
    noindex: false,
    sections: [],
    ...patch,
  };
}

describe("interaction health — internal links", () => {
  it("passes a link that points at a real page", () => {
    const report = scanInteractions([
      page({ slug: "home", sections: [section({ components: [component({ link_url: "/services" })] })] }),
      page({ slug: "services", title: "Services", kind: "services" }),
    ]);
    expect(report.broken).toBe(0);
    expect(report.working).toBe(1);
    expect(report.publishSafe).toBe(true);
  });

  it("flags a link to a page that does not exist as broken", () => {
    const report = scanInteractions([
      page({ sections: [section({ components: [component({ link_url: "/pricing" })] })] }),
    ]);
    expect(report.broken).toBe(1);
    expect(report.publishSafe).toBe(false);
    expect(report.checks[0]?.detail).toMatch(/not a page/i);
    expect(report.checks[0]?.fix).toMatch(/pricing/);
  });

  it("treats the root path as the home page", () => {
    const report = scanInteractions([
      page({ sections: [section({ components: [component({ link_url: "/" })] })] }),
    ]);
    expect(report.working).toBe(1);
  });
});

describe("interaction health — dead and unsafe controls", () => {
  it("flags a button with no destination", () => {
    const report = scanInteractions([
      page({ sections: [section({ components: [component({ kind: "button", link_url: null })] })] }),
    ]);
    expect(report.broken).toBe(1);
    expect(report.checks[0]?.detail).toMatch(/no destination/i);
  });

  it("flags a target the renderer would drop", () => {
    const report = scanInteractions([
      page({
        sections: [section({ components: [component({ link_url: "javascript:alert(1)" })] })],
      }),
    ]);
    expect(report.broken).toBe(1);
    expect(report.checks[0]?.target).toBeNull();
  });

  it("accepts a built-in conversion component without an href", () => {
    const report = scanInteractions([
      page({
        sections: [section({ components: [component({ kind: "quote_button", link_url: null })] })],
      }),
    ]);
    expect(report.broken).toBe(0);
    expect(report.checks[0]?.kind).toBe("conversion");
  });
});

describe("interaction health — contact targets", () => {
  it("accepts a full phone number and rejects a stub", () => {
    const ok = scanInteractions([
      page({ sections: [section({ components: [component({ link_url: "tel:+15125550188" })] })] }),
    ]);
    expect(ok.working).toBe(1);

    const bad = scanInteractions([
      page({ sections: [section({ components: [component({ link_url: "tel:123" })] })] }),
    ]);
    expect(bad.broken).toBe(1);
  });

  it("validates mailto addresses", () => {
    const ok = scanInteractions([
      page({
        sections: [section({ components: [component({ link_url: "mailto:hi@example.com" })] })],
      }),
    ]);
    expect(ok.working).toBe(1);

    const bad = scanInteractions([
      page({ sections: [section({ components: [component({ link_url: "mailto:nope" })] })] }),
    ]);
    expect(bad.broken).toBe(1);
  });
});

describe("interaction health — anchors and external links", () => {
  it("resolves a conversion anchor against sections on the page", () => {
    const report = scanInteractions([
      page({
        sections: [
          section({ kind: "hero", components: [component({ link_url: "#quote" })] }),
          section({ kind: "quote", heading: "Get a quote" }),
        ],
      }),
    ]);
    expect(report.broken).toBe(0);
    expect(report.needsAttention).toBe(0);
  });

  it("warns when an anchor points at a section that is not on the page", () => {
    const report = scanInteractions([
      page({
        sections: [section({ components: [component({ link_url: "#team-bios" })] })],
      }),
    ]);
    expect(report.needsAttention).toBe(1);
    expect(report.publishSafe).toBe(true);
  });

  it("warns when an external link points back at a build/preview host", () => {
    const report = scanInteractions([
      page({
        sections: [
          section({ components: [component({ link_url: "https://project--x-dev.lovable.app/a" })] }),
        ],
      }),
    ]);
    expect(report.needsAttention).toBe(1);
  });

  it("accepts a real external link", () => {
    const report = scanInteractions([
      page({
        sections: [section({ components: [component({ link_url: "https://maps.google.com/x" })] })],
      }),
    ]);
    expect(report.working).toBe(1);
  });
});

describe("interaction health — visibility and scoring", () => {
  it("ignores hidden pages, sections and components", () => {
    const report = scanInteractions([
      page({ is_visible: false, sections: [section({ components: [component({ link_url: "/gone" })] })] }),
      page({
        slug: "b",
        sections: [
          section({ is_visible: false, components: [component({ link_url: "/gone" })] }),
          section({ components: [component({ is_visible: false, link_url: "/gone" })] }),
        ],
      }),
    ]);
    expect(report.total).toBe(0);
    expect(report.score).toBe(100);
    expect(interactionSummary(report)).toMatch(/No clickable/i);
  });

  it("scores broken controls harder than warnings", () => {
    const warned = scanInteractions([
      page({ sections: [section({ components: [component({ link_url: "#nope" })] })] }),
    ]);
    const brokenReport = scanInteractions([
      page({ sections: [section({ components: [component({ link_url: "/nope" })] })] }),
    ]);
    expect(warned.score).toBeGreaterThan(brokenReport.score);
    expect(brokenReport.score).toBe(0);
  });

  it("summarises counts for the publish preflight", () => {
    const report = scanInteractions([
      page({
        sections: [
          section({
            components: [
              component({ link_url: "tel:+15125550188" }),
              component({ link_url: "/missing" }),
              component({ link_url: "#missing" }),
            ],
          }),
        ],
      }),
    ]);
    expect(interactionSummary(report)).toBe(
      "3 interactions checked · 1 working · 1 need attention · 1 broken",
    );
  });
});
