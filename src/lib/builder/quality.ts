/**
 * REVORA WEBSITE QUALITY SCORE — the gate a site must pass before publishing.
 *
 * Every check reads real generated content. A P0 issue (an object printed as
 * text, a fake-looking phone number, template scaffolding, a fabricated claim,
 * a page with no way to convert) blocks publishing outright; advisory issues
 * lower the score without stopping a launch.
 */
import { hasTemplateLeak, isUsableEmail, isUsablePhone, safeText } from "./presentation";
import type { BusinessFacts } from "./facts";

export type QualitySeverity = "blocker" | "advice";

export type QualityIssue = {
  key: string;
  severity: QualitySeverity;
  /** Plain-language description for the owner. */
  detail: string;
  /** The concrete next step. */
  fix: string;
};

export type QualityInput = {
  facts: BusinessFacts;
  /** Raw stored values, so invalid ones can be reported instead of hidden. */
  raw: { phone?: unknown; email?: unknown; hours?: unknown };
  /** Every visitor-visible page. */
  pages: { slug: string; title: unknown; sections: number }[];
  /** Every visitor-visible text value across the site. */
  texts: unknown[];
  /** Navigation labels, in order. */
  navLabels: unknown[];
  /** Whether a visitor can convert: call, book or request a quote. */
  conversion: { hasPhone: boolean; hasBooking: boolean; hasQuote: boolean; hasContact: boolean };
  /** Reviews / gallery items the business actually supplied. */
  reviewCount: number;
  galleryCount: number;
  /** Sections that claim social proof or portfolio work. */
  showsReviews: boolean;
  showsGallery: boolean;
  /** Page titles and descriptions, for duplicate metadata detection. */
  metadata: { title: unknown; description: unknown }[];
};

export type QualityReport = {
  score: number;
  ready: boolean;
  issues: QualityIssue[];
  blockers: QualityIssue[];
};

const issue = (
  key: string,
  severity: QualitySeverity,
  detail: string,
  fix: string,
): QualityIssue => ({ key, severity, detail, fix });

/** Text that must never be visible on a published page. */
function textIssues(texts: unknown[]): QualityIssue[] {
  const found: QualityIssue[] = [];
  let objects = 0;
  let leaks = 0;
  for (const value of texts) {
    if (value && typeof value === "object") {
      objects += 1;
      continue;
    }
    if (typeof value === "string" && hasTemplateLeak(value)) leaks += 1;
  }
  if (objects) {
    found.push(
      issue(
        "raw_object_text",
        "blocker",
        `${objects} block${objects === 1 ? "" : "s"} would print stored data instead of words.`,
        "Revora rewrites these from your business details — rebuild the page to clear them.",
      ),
    );
  }
  if (leaks) {
    found.push(
      issue(
        "template_leak",
        "blocker",
        `${leaks} block${leaks === 1 ? " contains" : "s contain"} unfinished template text.`,
        "Replace the unfinished text with your own wording, or remove the block.",
      ),
    );
  }
  return found;
}

/** Contact details that are stored but unusable, so they can be corrected. */
function contactIssues(input: QualityInput): QualityIssue[] {
  const found: QualityIssue[] = [];
  const rawPhone = safeText(input.raw.phone);
  const rawEmail = safeText(input.raw.email);
  if (rawPhone && !isUsablePhone(input.raw.phone)) {
    found.push(
      issue(
        "invalid_phone",
        "blocker",
        `“${rawPhone}” isn't a phone number a customer can call, so it's hidden.`,
        "Add your full phone number, including area code.",
      ),
    );
  }
  if (rawEmail && !isUsableEmail(input.raw.email)) {
    found.push(
      issue(
        "invalid_email",
        "blocker",
        `“${rawEmail}” isn't a working email address, so it's hidden.`,
        "Add the email address where you want enquiries to arrive.",
      ),
    );
  }
  if (input.raw.hours && !input.facts.hours) {
    found.push(
      issue(
        "unreadable_hours",
        "advice",
        "Your opening hours aren't readable, so the hours block is hidden.",
        "Enter your hours as text, for example “Mon–Sat 8am–6pm”.",
      ),
    );
  }
  if (!input.facts.phone && !input.facts.email && !input.conversion.hasBooking) {
    found.push(
      issue(
        "no_contact_route",
        "blocker",
        "There is no valid way for a visitor to reach you.",
        "Add a phone number, an email address, or turn on online booking.",
      ),
    );
  }
  return found;
}

/** Social proof and portfolio must be real, never generated. */
function honestyIssues(input: QualityInput): QualityIssue[] {
  const found: QualityIssue[] = [];
  if (input.showsReviews && input.reviewCount === 0) {
    found.push(
      issue(
        "reviews_without_reviews",
        "blocker",
        "A reviews block is showing but you have no real reviews yet.",
        "Collect a review first — Revora hides the block until then.",
      ),
    );
  }
  if (input.showsGallery && input.galleryCount === 0) {
    found.push(
      issue(
        "gallery_without_photos",
        "blocker",
        "A work gallery is showing but no real photos were uploaded.",
        "Upload photos of your own work, or leave the gallery off.",
      ),
    );
  }
  return found;
}

/** Navigation, pages and conversion routes. */
function structureIssues(input: QualityInput): QualityIssue[] {
  const found: QualityIssue[] = [];
  const labels = input.navLabels.map((label) => safeText(label)).filter((v): v is string => !!v);
  if (labels.length !== input.navLabels.length) {
    found.push(
      issue(
        "nav_label_missing",
        "blocker",
        "A menu item has no readable name.",
        "Rename the page so the menu reads clearly.",
      ),
    );
  }
  const seen = new Set<string>();
  if (labels.some((label) => (seen.has(label.toLowerCase()) ? true : (seen.add(label.toLowerCase()), false)))) {
    found.push(
      issue("nav_duplicate", "advice", "The menu repeats the same link.", "Remove the duplicate page."),
    );
  }
  if (labels.length > 7) {
    found.push(
      issue(
        "nav_too_long",
        "advice",
        `${labels.length} menu items is more than most visitors scan.`,
        "Keep the menu to the pages that win work; the rest can live in the footer.",
      ),
    );
  }
  const empty = input.pages.filter((page) => page.sections === 0);
  if (empty.length) {
    found.push(
      issue(
        "empty_page",
        "blocker",
        `${empty.length} page${empty.length === 1 ? "" : "s"} would open blank.`,
        "Add content to the page, or remove it from the site.",
      ),
    );
  }
  const { hasPhone, hasBooking, hasQuote, hasContact } = input.conversion;
  if (!hasPhone && !hasBooking && !hasQuote && !hasContact) {
    found.push(
      issue(
        "no_conversion",
        "blocker",
        "No page gives a visitor an action to take.",
        "Turn on booking or quotes, or add your phone number.",
      ),
    );
  }
  const titles = input.metadata.map((meta) => safeText(meta.title)?.toLowerCase()).filter(Boolean);
  if (new Set(titles).size !== titles.length) {
    found.push(
      issue(
        "duplicate_metadata",
        "advice",
        "Two pages share the same search-result title.",
        "Give each page its own title so Google can tell them apart.",
      ),
    );
  }
  const missingDescription = input.metadata.filter((meta) => !safeText(meta.description)).length;
  if (missingDescription) {
    found.push(
      issue(
        "missing_description",
        "advice",
        `${missingDescription} page${missingDescription === 1 ? "" : "s"} have no search description.`,
        "Add a short description so search results read well.",
      ),
    );
  }
  return found;
}

/** Full audit. Blockers stop publishing; the score reflects everything found. */
export function auditWebsite(input: QualityInput): QualityReport {
  const issues = [
    ...textIssues(input.texts),
    ...contactIssues(input),
    ...honestyIssues(input),
    ...structureIssues(input),
  ];
  const blockers = issues.filter((item) => item.severity === "blocker");
  const advice = issues.filter((item) => item.severity === "advice");
  const score = Math.max(0, Math.min(100, 100 - blockers.length * 18 - advice.length * 4));
  return { score, ready: blockers.length === 0 && score >= 95, issues, blockers };
}
