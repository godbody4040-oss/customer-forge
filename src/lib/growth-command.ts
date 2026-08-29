/**
 * Revora AI Growth Command Center — audit engine.
 *
 * Browser-safe and deterministic. It combines the facts already stored for a
 * workspace (business profile, SEO fields, AI copy, services, media, reviews,
 * lead capture, publishing, domain and real traffic signals) into a single
 * REVORA GROWTH SCORE with categorised findings.
 *
 * Rules this file obeys:
 * - Nothing is invented. Every finding cites facts that exist in the workspace.
 * - Traffic-based findings only fire once there is enough traffic to be sure.
 * - Every finding carries a concrete next step: either a one-click auto fix the
 *   app can safely apply, or the exact screen that owns the change.
 */

export type GrowthCategoryKey = "foundation" | "conversion" | "seo" | "trust" | "systems" | "growth";

export const GROWTH_CATEGORIES: { key: GrowthCategoryKey; label: string; blurb: string }[] = [
  { key: "foundation", label: "Business foundation", blurb: "The facts every page reuses." },
  { key: "conversion", label: "Conversion engine", blurb: "How visitors turn into customers." },
  { key: "seo", label: "SEO & local search", blurb: "Getting found in your area." },
  { key: "trust", label: "Trust & proof", blurb: "Why a stranger believes you." },
  { key: "systems", label: "Connected systems", blurb: "Booking, quotes, CRM, analytics, domain." },
  { key: "growth", label: "Growth opportunities", blurb: "What to improve next, from real data." },
];

export type Severity = "critical" | "warning" | "opportunity" | "healthy";

/** Fixes Revora can apply itself, safely, with a version snapshot first. */
export type AutoFixKey = "generate_site" | "apply_cta" | "apply_meta" | "publish_site";

export type GrowthFinding = {
  key: string;
  category: GrowthCategoryKey;
  title: string;
  /** Plain-language evidence: what is true right now. */
  evidence: string;
  /** The change to make. */
  action: string;
  severity: Severity;
  /** Weight this finding contributes to the score. */
  points: number;
  max: number;
  autoFix?: AutoFixKey;
  to?: string;
};

export type GrowthAuditInput = {
  businessName: string | null;
  description: string | null;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  serviceArea: string | null;
  logoUrl: string | null;
  hoursSet: boolean;
  headline: string | null;
  metaDescription: string | null;
  primaryCtaLabel: string | null;
  hasCopy: boolean;
  copyFaqCount: number;
  copyHeadline: string | null;
  copyMetaDescription: string | null;
  copyPrimaryCta: string | null;
  servicesCount: number;
  pricedServicesCount: number;
  bookableCount: number;
  quoteFormCount: number;
  mediaCount: number;
  reviewCount: number;
  socialLinks: number;
  pagesCount: number;
  visibleSections: number;
  publishState: string | null;
  domainStatus: string | null;
  visitors: number;
  leads: number;
  bookings: number;
  callClicks: number;
};

/** Minimum visits before traffic-based advice is trustworthy. */
export const AUDIT_MIN_VISITS = 30;

const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;

function severityOf(points: number, max: number, weight: "critical" | "warning" | "opportunity"): Severity {
  if (points >= max) return "healthy";
  return weight;
}

export function growthAudit(input: GrowthAuditInput) {
  const f: GrowthFinding[] = [];
  const add = (
    finding: Omit<GrowthFinding, "severity"> & { weight: "critical" | "warning" | "opportunity" },
  ) => {
    const { weight, ...rest } = finding;
    f.push({ ...rest, severity: severityOf(rest.points, rest.max, weight) });
  };

  /* ------------------------------ foundation ------------------------------ */

  add({
    key: "identity",
    category: "foundation",
    title: "Business identity",
    evidence: text(input.description)
      ? `Your description and ${text(input.tagline) ? "tagline are" : "name are"} saved and reused on every page.`
      : "Revora has no business description to write pages from.",
    action: "Write two or three sentences describing what you do and who you do it for.",
    points: (text(input.description) ? 7 : 0) + (text(input.tagline) ? 3 : 0),
    max: 10,
    weight: "critical",
    to: "/app/website",
  });

  add({
    key: "contact",
    category: "foundation",
    title: "Contact paths",
    evidence: `${text(input.phone) ? "Phone saved" : "No phone number"} · ${text(input.email) ? "email saved" : "no email"} · ${input.hoursSet ? "hours set" : "hours missing"}.`,
    action: "Add your phone, email and opening hours — these power the call bar, forms and lead alerts.",
    points: (text(input.phone) ? 6 : 0) + (text(input.email) ? 3 : 0) + (input.hoursSet ? 2 : 0),
    max: 11,
    weight: "critical",
    to: "/app/website",
  });

  add({
    key: "services",
    category: "foundation",
    title: "Service catalogue",
    evidence: `${input.servicesCount} service${input.servicesCount === 1 ? "" : "s"} listed, ${input.pricedServicesCount} with a price.`,
    action: "List at least four services and publish a starting price on each — priced services convert best.",
    points: Math.min(input.servicesCount, 4) * 2 + (input.pricedServicesCount > 0 ? 3 : 0),
    max: 11,
    weight: "warning",
    to: "/app/services",
  });

  add({
    key: "structure",
    category: "foundation",
    title: "Website structure",
    evidence: input.pagesCount
      ? `${input.pagesCount} page${input.pagesCount === 1 ? "" : "s"} with ${input.visibleSections} visible section${input.visibleSections === 1 ? "" : "s"}.`
      : "No pages have been generated yet.",
    action: "Run the Revora build so pages, sections, CTAs and SEO content are generated from your information.",
    points: (input.pagesCount >= 4 ? 5 : input.pagesCount > 0 ? 2 : 0) + (input.visibleSections >= 8 ? 4 : input.visibleSections > 0 ? 2 : 0),
    max: 9,
    weight: "critical",
    autoFix: "generate_site",
    to: "/app/website",
  });

  /* ------------------------------ conversion ------------------------------ */

  const ctaSet = text(input.primaryCtaLabel);
  add({
    key: "cta",
    category: "conversion",
    title: "Primary call to action",
    evidence: ctaSet
      ? `Every page pushes visitors to “${input.primaryCtaLabel}”.`
      : text(input.copyPrimaryCta)
        ? `Revora drafted “${input.copyPrimaryCta}” but no primary button is set.`
        : "No primary button is set, so visitors have to guess what to do next.",
    action: "Set one primary action — call, text, book or request a quote — and repeat it down the page.",
    points: ctaSet ? 9 : 0,
    max: 9,
    weight: "critical",
    ...(text(input.copyPrimaryCta) && !ctaSet ? { autoFix: "apply_cta" as AutoFixKey } : {}),
    to: "/app/website",
  });

  add({
    key: "capture",
    category: "conversion",
    title: "Lead capture",
    evidence: `${input.quoteFormCount} quote form${input.quoteFormCount === 1 ? "" : "s"} live · ${input.bookableCount} bookable service${input.bookableCount === 1 ? "" : "s"}.`,
    action: "Turn on the instant quote calculator and make at least one service bookable so leads land in your CRM automatically.",
    points: (input.quoteFormCount > 0 ? 6 : 0) + (input.bookableCount > 0 ? 5 : 0),
    max: 11,
    weight: "critical",
    to: "/app/quotes",
  });

  add({
    key: "objections",
    category: "conversion",
    title: "Objection handling",
    evidence: input.copyFaqCount
      ? `${input.copyFaqCount} FAQ${input.copyFaqCount === 1 ? "" : "s"} answer common questions before the enquiry.`
      : "There are no FAQs answering price, timing or coverage questions.",
    action: "Publish at least four FAQs covering price, timing, coverage area and what happens after enquiry.",
    points: Math.min(input.copyFaqCount, 4) * 1.5,
    max: 6,
    weight: "opportunity",
    autoFix: "generate_site",
    to: "/app/website",
  });

  /* --------------------------------- seo --------------------------------- */

  add({
    key: "meta",
    category: "seo",
    title: "Search title & description",
    evidence: `${text(input.headline) ? "Headline set" : "No headline"} · ${text(input.metaDescription) ? "search description set" : "no search description"}.`,
    action: "Set the headline and search description Google shows for your business.",
    points: (text(input.headline) ? 5 : 0) + (text(input.metaDescription) ? 5 : 0),
    max: 10,
    weight: "warning",
    ...(text(input.copyMetaDescription) && !text(input.metaDescription)
      ? { autoFix: "apply_meta" as AutoFixKey }
      : {}),
    to: "/app/website",
  });

  add({
    key: "local",
    category: "seo",
    title: "Local search signals",
    evidence: `${text(input.city) ? `City: ${input.city}` : "No city set"} · ${text(input.serviceArea) ? "service area set" : "no service area"}.`,
    action: "Name your city and the towns you cover so Revora writes local pages and area copy.",
    points: (text(input.city) ? 5 : 0) + (text(input.serviceArea) ? 4 : 0),
    max: 9,
    weight: "warning",
    to: "/app/website",
  });

  add({
    key: "content",
    category: "seo",
    title: "AI-written content",
    evidence: input.hasCopy ? "Local SEO copy has been generated for this business." : "No generated copy yet.",
    action: "Run the Revora build to generate hero, service, area and about copy from your facts.",
    points: input.hasCopy ? 6 : 0,
    max: 6,
    weight: "warning",
    autoFix: "generate_site",
    to: "/app/website",
  });

  /* -------------------------------- trust -------------------------------- */

  add({
    key: "photos",
    category: "trust",
    title: "Real photos",
    evidence: `${input.mediaCount} photo${input.mediaCount === 1 ? "" : "s"} uploaded${text(input.logoUrl) ? " and a logo is set" : ", no logo"}.`,
    action: "Upload a logo and at least five photos of your own work — stock imagery loses trust.",
    points: Math.min(input.mediaCount, 5) * 1.4 + (text(input.logoUrl) ? 3 : 0),
    max: 10,
    weight: "warning",
    to: "/app/website",
  });

  add({
    key: "reviews",
    category: "trust",
    title: "Reviews & social proof",
    evidence: `${input.reviewCount} review${input.reviewCount === 1 ? "" : "s"} collected.`,
    action: "Send review requests to recent customers — Revora can ask automatically after each job.",
    points: Math.min(input.reviewCount, 5) * 1.6,
    max: 8,
    weight: "warning",
    to: "/app/reviews",
  });

  add({
    key: "social",
    category: "trust",
    title: "Social profiles",
    evidence: `${input.socialLinks} profile link${input.socialLinks === 1 ? "" : "s"} connected.`,
    action: "Link your Google Business Profile, Instagram or Facebook so visitors can verify you.",
    points: Math.min(input.socialLinks, 3),
    max: 3,
    weight: "opportunity",
    to: "/app/settings",
  });

  /* ------------------------------- systems ------------------------------- */

  const published = input.publishState === "published";
  add({
    key: "published",
    category: "systems",
    title: "Live website",
    evidence: published ? "Your website is published and reachable by customers." : `Publish state: ${input.publishState ?? "draft"}.`,
    action: "Publish the site so customers — and search engines — can reach it.",
    points: published ? 9 : 0,
    max: 9,
    weight: "critical",
    ...(published ? {} : { autoFix: "publish_site" as AutoFixKey }),
    to: "/app/launch",
  });

  const domainLive = input.domainStatus === "connected" || input.domainStatus === "ssl_active";
  add({
    key: "domain",
    category: "systems",
    title: "Custom domain",
    evidence: domainLive ? "Your own domain is connected." : `Domain status: ${input.domainStatus ?? "not connected"}.`,
    action: "Connect your own domain for credibility, or stay on the free address for now.",
    points: domainLive ? 4 : 0,
    max: 4,
    weight: "opportunity",
    to: "/app/domain",
  });

  add({
    key: "tracking",
    category: "systems",
    title: "Analytics & tracking",
    evidence: input.visitors
      ? `${input.visitors} visit${input.visitors === 1 ? "" : "s"} tracked in the last 30 days.`
      : "No visits tracked yet — nothing to measure.",
    action: "Share the live link and QR code so Revora can measure visits, calls, quotes and bookings.",
    points: input.visitors > 0 ? 4 : 0,
    max: 4,
    weight: "opportunity",
    to: "/app/campaigns",
  });

  /* -------------------------------- growth -------------------------------- */

  if (input.visitors >= AUDIT_MIN_VISITS) {
    const rate = input.leads / input.visitors;
    if (input.leads === 0) {
      add({
        key: "no-leads",
        category: "growth",
        title: "Traffic isn't converting",
        evidence: `${input.visitors} visits and no enquiries yet.`,
        action: "Move the quote block onto the first screen and repeat the main button after every second section.",
        points: 0,
        max: 6,
        weight: "critical",
        to: "/app/website",
      });
    } else if (rate < 0.02) {
      add({
        key: "low-rate",
        category: "growth",
        title: "Conversion below 2%",
        evidence: `${input.leads} enquiries from ${input.visitors} visits (${(rate * 100).toFixed(1)}%).`,
        action: "Lead with a price guide and shorten the form to four questions.",
        points: 2,
        max: 6,
        weight: "warning",
        to: "/app/quotes",
      });
    } else {
      add({
        key: "converting",
        category: "growth",
        title: "Conversion is healthy",
        evidence: `${input.leads} enquiries and ${input.bookings} booking${input.bookings === 1 ? "" : "s"} from ${input.visitors} visits (${(rate * 100).toFixed(1)}%).`,
        action: "Keep the layout and spend effort on getting more visits.",
        points: 6,
        max: 6,
        weight: "opportunity",
        to: "/app/analytics",
      });
    }

    if (input.callClicks >= 5 && input.bookings === 0) {
      add({
        key: "prefer-calls",
        category: "growth",
        title: "Customers prefer calling",
        evidence: `${input.callClicks} call taps and no online bookings.`,
        action: "Make the phone number the primary button and keep the form as backup.",
        points: 0,
        max: 3,
        weight: "warning",
        to: "/app/website",
      });
    }
  } else {
    add({
      key: "need-visits",
      category: "growth",
      title: "Not enough visits to optimise yet",
      evidence: `${input.visitors} visit${input.visitors === 1 ? "" : "s"} recorded — Revora waits for ${AUDIT_MIN_VISITS} before changing anything based on data.`,
      action: "Share your link, QR code and Google Business Profile to bring in the first visits.",
      points: 0,
      max: 6,
      weight: "opportunity",
      to: "/app/campaigns",
    });
  }

  const clamp = (finding: GrowthFinding) => Math.min(finding.points, finding.max);
  const earned = f.reduce((sum, x) => sum + clamp(x), 0);
  const total = f.reduce((sum, x) => sum + x.max, 0);
  const score = total ? Math.round((earned / total) * 100) : 0;

  const categories = GROWTH_CATEGORIES.map((cat) => {
    const rows = f.filter((x) => x.category === cat.key);
    const catEarned = rows.reduce((sum, x) => sum + clamp(x), 0);
    const catMax = rows.reduce((sum, x) => sum + x.max, 0);
    return {
      ...cat,
      earned: catEarned,
      max: catMax,
      score: catMax ? Math.round((catEarned / catMax) * 100) : 0,
      findings: rows,
    };
  });

  const severityRank: Record<Severity, number> = { critical: 0, warning: 1, opportunity: 2, healthy: 3 };
  const issues = f
    .filter((x) => x.severity !== "healthy")
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.max - b.points - (a.max - a.points));
  const wins = f.filter((x) => x.severity === "healthy");

  return { score, grade: grade(score), categories, findings: f, issues, wins };
}

export function grade(score: number) {
  if (score >= 90) return "Elite";
  if (score >= 75) return "Strong";
  if (score >= 55) return "Developing";
  if (score >= 35) return "Weak";
  return "Not ready";
}

/* ------------------------------- commands ------------------------------- */

export type GrowthCommand = {
  key: string;
  label: string;
  /** Categories this command works through, in order. */
  categories: GrowthCategoryKey[];
  intent: string;
};

/** Natural commands the client can run against their own system. */
export const GROWTH_COMMANDS: GrowthCommand[] = [
  {
    key: "upgrade-all",
    label: "Upgrade my entire website",
    categories: ["foundation", "conversion", "seo", "trust", "systems", "growth"],
    intent: "Everything that is missing or weak, worst first.",
  },
  {
    key: "more-leads",
    label: "Make my website generate more leads",
    categories: ["conversion", "growth"],
    intent: "Calls to action, forms, booking and conversion paths.",
  },
  {
    key: "fix-missing",
    label: "Fix everything that is missing",
    categories: ["foundation", "systems"],
    intent: "Business facts, structure, publishing and connected systems.",
  },
  {
    key: "improve-seo",
    label: "Improve my SEO",
    categories: ["seo"],
    intent: "Titles, descriptions, local signals and written content.",
  },
  {
    key: "trust",
    label: "Make this more trustworthy",
    categories: ["trust"],
    intent: "Photos, reviews and verifiable profiles.",
  },
  {
    key: "connect",
    label: "Connect everything",
    categories: ["systems", "conversion"],
    intent: "Domain, publishing, tracking, quotes, booking and CRM.",
  },
];

/** The findings a command is responsible for, worst first. */
export function commandPlan(command: GrowthCommand, audit: ReturnType<typeof growthAudit>) {
  return audit.issues.filter((finding) => command.categories.includes(finding.category));
}
