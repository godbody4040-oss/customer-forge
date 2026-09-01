/**
 * Interaction Health — Revora's builder-side checker for everything a visitor
 * can click on a client website.
 *
 * It works on the same content model the public renderer reads
 * (`ContentPage[]` from `website-content.ts`), so a finding here describes the
 * actual published behaviour rather than a guess:
 *
 *  - internal links (`/slug`) are resolved against the real page list, because
 *    the renderer turns them into `<Link to="/s/$slug/$page">` and an unknown
 *    slug is a 404 for the visitor.
 *  - in-page anchors (`#quote`, `#book`, `#contact`) are resolved against the
 *    sections that actually exist on that page.
 *  - `tel:` / `mailto:` / `sms:` targets are validated for a usable value.
 *  - external `http(s)` targets are validated for shape only (no network call),
 *    and flagged when they point back at a Revora-internal host.
 *  - anything `safeLinkUrl()` rejects (javascript:, data:, …) is critical: the
 *    renderer drops it, so the control silently does nothing.
 *
 * Severity model:
 *  - "broken"  → the visitor clicks and nothing useful happens. Blocks publish.
 *  - "warn"    → works, but likely not what the owner intended.
 *  - "ok"      → verified against the content model.
 */
import { type ContentPage, type ContentSection, safeLinkUrl } from "@/lib/website-content";

export type InteractionStatus = "ok" | "warn" | "broken";

export type InteractionKind =
  "internal_link" | "anchor" | "phone" | "email" | "sms" | "external_link" | "conversion" | "form";

export type InteractionCheck = {
  /** Stable id so the UI can key rows and deep-link to the owning section. */
  id: string;
  status: InteractionStatus;
  kind: InteractionKind;
  /** What the visitor sees on the control. */
  label: string;
  /** Where it lives, e.g. "Home → Services". */
  location: string;
  pageId: string;
  pageSlug: string;
  sectionId: string | null;
  /** Resolved target, or null when the renderer would drop it. */
  target: string | null;
  /** Plain-language result for the business owner. */
  detail: string;
  /** Only set for problems: what to do about it. */
  fix?: string;
};

export type InteractionReport = {
  checks: InteractionCheck[];
  total: number;
  working: number;
  needsAttention: number;
  broken: number;
  /** True when nothing is `broken` — the publish gate reads this. */
  publishSafe: boolean;
  /** 0–100, weighted so broken controls cost more than warnings. */
  score: number;
};

/** Anchors the public renderer always resolves, regardless of section list. */
const GLOBAL_ANCHORS = new Set(["#quote", "#book", "#contact", "#top", "#"]);

/** Section kinds that satisfy the matching conversion anchor. */
const ANCHOR_SECTION_KINDS: Record<string, string[]> = {
  "#quote": ["quote", "quote_form", "cta", "contact"],
  "#book": ["booking", "book", "cta", "contact"],
  "#contact": ["contact", "cta", "footer"],
};

const REVORA_INTERNAL_HOSTS = [
  "lovable.app",
  "lovableproject.com",
  "supabase.co",
  "localhost",
  "127.0.0.1",
];

const DIGITS = /\d/g;

function digitCount(value: string) {
  return (value.match(DIGITS) ?? []).length;
}

/** A component/section CTA reduced to the fields the checker needs. */
type Control = {
  id: string;
  label: string;
  rawTarget: string | null;
  sectionId: string | null;
  /** Conversion controls are expected to have no href (handled in-page). */
  conversion: boolean;
};

function sectionControls(section: ContentSection): Control[] {
  const controls: Control[] = [];
  for (const component of section.components) {
    const isClickable =
      typeof component.link_url === "string" && component.link_url.trim().length > 0;
    const looksClickable = /button|link|cta|card|area_link|service/i.test(component.kind);
    if (!isClickable && !looksClickable) continue;
    controls.push({
      id: component.id,
      label:
        component.link_label?.trim() || component.label?.trim() || `${component.kind} (no label)`,
      rawTarget: component.link_url ?? null,
      sectionId: section.id,
      conversion: /quote|book|checkout|lead/i.test(component.kind),
    });
  }
  return controls;
}

function pageLabel(page: ContentPage) {
  return page.title?.trim() || page.slug || "Untitled page";
}

/**
 * Classifies a single control against the site's real page and section lists.
 */
function checkControl(
  control: Control,
  context: {
    page: ContentPage;
    slugs: Set<string>;
    anchors: Set<string>;
  },
): InteractionCheck {
  const { page } = context;
  const base = {
    id: `${page.id}:${control.id}`,
    label: control.label,
    location: `${pageLabel(page)}${control.sectionId ? "" : " (page)"}`,
    pageId: page.id,
    pageSlug: page.slug,
    sectionId: control.sectionId,
  };

  const raw = (control.rawTarget ?? "").trim();

  if (!raw) {
    // A conversion control without an href is handled by the in-page form.
    if (control.conversion) {
      return {
        ...base,
        status: "ok",
        kind: "conversion",
        target: null,
        detail: "Opens the built-in Revora form on the same page.",
      };
    }
    return {
      ...base,
      status: "broken",
      kind: "internal_link",
      target: null,
      detail: "This button has no destination, so clicking it does nothing.",
      fix: "Set a destination: another page, a phone number, or the quote form.",
    };
  }

  const safe = safeLinkUrl(raw);
  if (!safe) {
    return {
      ...base,
      status: "broken",
      kind: "external_link",
      target: null,
      detail: "The destination uses a format the website will not open, so the button is dead.",
      fix: "Use a web address (https://…), an internal page (/services), tel: or mailto:.",
    };
  }

  // In-page anchor
  if (safe.startsWith("#")) {
    const anchor = safe.toLowerCase();
    const resolvable =
      context.anchors.has(anchor.slice(1)) ||
      GLOBAL_ANCHORS.has(anchor) ||
      (ANCHOR_SECTION_KINDS[anchor] ?? []).some((kind) => context.anchors.has(kind));
    return {
      ...base,
      status: resolvable ? "ok" : "warn",
      kind: resolvable && GLOBAL_ANCHORS.has(anchor) ? "conversion" : "anchor",
      target: safe,
      detail: resolvable
        ? "Scrolls the visitor to the matching section on this page."
        : "Points at a section that is not on this page, so the visitor stays put.",
      ...(resolvable
        ? {}
        : { fix: `Add a matching section to ${pageLabel(page)}, or link to a page instead.` }),
    };
  }

  // Internal page link — must resolve to a real page slug.
  if (safe.startsWith("/")) {
    const slug = safe.slice(1).split(/[?#]/)[0] ?? "";
    if (!slug) {
      return {
        ...base,
        status: "ok",
        kind: "internal_link",
        target: "/",
        detail: "Goes to the website home page.",
      };
    }
    const exists = context.slugs.has(slug);
    return {
      ...base,
      status: exists ? "ok" : "broken",
      kind: "internal_link",
      target: safe,
      detail: exists
        ? `Goes to the "${slug}" page on this website.`
        : `Points at "/${slug}", which is not a page on this website — visitors get a not-found page.`,
      ...(exists
        ? {}
        : { fix: `Create the "${slug}" page, or point this button at an existing page.` }),
    };
  }

  if (/^tel:/i.test(safe)) {
    const ok = digitCount(safe) >= 7;
    return {
      ...base,
      status: ok ? "ok" : "broken",
      kind: "phone",
      target: safe,
      detail: ok ? "Starts a phone call on mobile." : "The phone number is too short to dial.",
      ...(ok ? {} : { fix: "Enter the full business phone number, including area code." }),
    };
  }

  if (/^sms:/i.test(safe)) {
    const ok = digitCount(safe) >= 7;
    return {
      ...base,
      status: ok ? "ok" : "broken",
      kind: "sms",
      target: safe,
      detail: ok
        ? "Opens a text message to the business."
        : "The text number is too short to send to.",
      ...(ok ? {} : { fix: "Enter the full number that can receive texts." }),
    };
  }

  if (/^mailto:/i.test(safe)) {
    const address = safe.slice("mailto:".length).split("?")[0] ?? "";
    const ok = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(address);
    return {
      ...base,
      status: ok ? "ok" : "broken",
      kind: "email",
      target: safe,
      detail: ok ? "Opens an email to the business." : "The email address is not a valid address.",
      ...(ok ? {} : { fix: "Enter a working business email address." }),
    };
  }

  // External http(s)
  let host = "";
  try {
    host = new URL(safe).hostname.toLowerCase();
  } catch {
    return {
      ...base,
      status: "broken",
      kind: "external_link",
      target: null,
      detail: "The web address is not valid, so the link will not open.",
      fix: "Re-enter the full address, starting with https://",
    };
  }
  const internal = REVORA_INTERNAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  return {
    ...base,
    status: internal ? "warn" : "ok",
    kind: "external_link",
    target: safe,
    detail: internal
      ? `Sends visitors to ${host}, which is a build/preview address rather than the live website.`
      : `Opens ${host} in the visitor's browser.`,
    ...(internal
      ? { fix: "Point this at your own page (/services) or your real public address." }
      : {}),
  };
}

/**
 * Scans every clickable control on a client website.
 *
 * Hidden pages, hidden sections and hidden components are skipped: a visitor
 * can never reach them, so reporting them as broken would only add noise.
 */
export function scanInteractions(pages: ContentPage[]): InteractionReport {
  const visiblePages = pages.filter((page) => page.is_visible);
  const slugs = new Set(visiblePages.map((page) => page.slug));

  const checks: InteractionCheck[] = [];

  for (const page of visiblePages) {
    const visibleSections = page.sections.filter((section) => section.is_visible);
    const anchors = new Set<string>();
    for (const section of visibleSections) {
      anchors.add(section.kind.toLowerCase());
      const slug = (section.heading ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      if (slug) anchors.add(slug);
    }

    for (const section of visibleSections) {
      const visibleOnly: ContentSection = {
        ...section,
        components: section.components.filter((component) => component.is_visible),
      };
      for (const control of sectionControls(visibleOnly)) {
        const check = checkControl(control, { page, slugs, anchors });
        checks.push({
          ...check,
          location: `${pageLabel(page)} → ${section.heading?.trim() || section.kind}`,
        });
      }
    }
  }

  const broken = checks.filter((c) => c.status === "broken").length;
  const needsAttention = checks.filter((c) => c.status === "warn").length;
  const working = checks.filter((c) => c.status === "ok").length;
  const total = checks.length;

  // Weighted: a broken control costs a full point, a warning a third of one.
  const penalty = broken + needsAttention / 3;
  const score = total === 0 ? 100 : Math.max(0, Math.round(((total - penalty) / total) * 100));

  return {
    checks,
    total,
    working,
    needsAttention,
    broken,
    publishSafe: broken === 0,
    score,
  };
}

/** One-line summary for the publish preflight panel. */
export function interactionSummary(report: InteractionReport): string {
  if (report.total === 0) return "No clickable buttons or links found yet.";
  const parts = [`${report.total} interactions checked`, `${report.working} working`];
  if (report.needsAttention) parts.push(`${report.needsAttention} need attention`);
  if (report.broken) parts.push(`${report.broken} broken`);
  return parts.join(" · ");
}
