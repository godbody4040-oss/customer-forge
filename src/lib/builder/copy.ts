/**
 * REVORA FREE-FIRST BUILDER — COPY ENGINE
 *
 * Purpose:
 * - Generate strong business copy without an external AI provider.
 * - Keep copy deterministic, varied, industry-aware, and conversion-focused.
 * - Provide the deterministic builder with the exact helpers it needs.
 *
 * Design goals:
 * - No network calls.
 * - No paid AI credits.
 * - No fabricated testimonials, reviews, awards, statistics, guarantees,
 * Deterministic, zero-cost copy generation.
 *
 * Rules:
 * - No external AI provider.
 * - No network calls.
 * - Never invent reviews, ratings, awards, licences, certifications,
 *   guarantees, prices, statistics, results, years, or customer claims.
 * - Use only facts supplied by the business/workspace.
 * - Keep output useful even when business information is incomplete.
 * - Keep the API intentionally small so deterministic.ts can consume it safely.
 */

import type { IndustryPlaybook } from "./industry";

/**
 * Facts consumed by the copy engine.
 *
 * This is intentionally independent from the database/profile shape.
 * deterministic.ts normalizes the source data before calling these functions.
 */
export type CopyFacts = {
  name: string;
  industry: string | null;
  tagline: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  serviceArea: string | null;
  phone: string | null;
  email: string | null;
  services: { name: string }[];
};

const MAX_HEADING = 70;
const MAX_SUBHEADING = 200;
const MAX_META_TITLE = 70;
const MAX_META_DESCRIPTION = 160;

const trim = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const clean = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return trim(value);
};

/**
 * Sentence case without damaging names or normal business capitalization.
 */
const tidy = (value: string): string => {
  const text = trim(value);
  if (!text) return "";

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
};

const limit = (value: string, max: number): string =>
  trim(value).slice(0, max).trim();

const nonEmpty = (value: string | null | undefined): string | null => {
  const text = clean(value);
  return text || null;
};

/**
 * Remove unsafe whitespace and obvious placeholder values.
 *
 * This does NOT attempt to decide whether a business claim is true.
 * It only prevents empty/default placeholders from becoming website copy.
 */
const usable = (value: unknown): string | null => {
  const text = clean(value);

  if (!text) return null;

  if (
    /^(?:n\/a|na|none|unknown|tbd|todo|test|testing|null|undefined)$/i.test(
      text,
    )
  ) {
    return null;
  }

  return text;
};

/**
 * The place words, when the workspace actually knows them.
 */
export function place(facts: CopyFacts): string | null {
  const serviceArea = usable(facts.serviceArea);
  if (serviceArea) return serviceArea;

  const city = usable(facts.city);
  const state = usable(facts.state);

  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;

  return null;
}

/**
 * The trade noun used in headings.
 */
const trade = (playbook: IndustryPlaybook): string =>
  clean(playbook.label).toLowerCase();

/**
 * First sentence of the owner's own description.
 *
 * The original description is preserved as much as possible.
 * If punctuation isn't present, the full description is used.
 */
export function firstSentence(text: string | null): string | null {
  const source = usable(text);
  if (!source) return null;

  const match = source.match(/^.*?[.!?](?:\s|$)/);

  if (match?.[0]) {
    const sentence = trim(match[0]);
    if (sentence.length > 8) return sentence;
  }

  return source;
}

/**
 * Creates a concise hero headline using only known facts.
 */
export function heroHeadline(
  facts: CopyFacts,
  playbook: IndustryPlaybook,
): string {
  const tagline = usable(facts.tagline);
  if (tagline) {
    return limit(tidy(tagline), MAX_HEADING);
  }

  const where = place(facts);

  if (where) {
    return limit(`${tidy(playbook.label)} in ${where}`, MAX_HEADING);
  }

  const name = usable(facts.name);

  if (name) {
    return limit(`${name} — ${trade(playbook)}`, MAX_HEADING);
  }

  return limit(tidy(playbook.label), MAX_HEADING);
}

/**
 * Creates supporting hero copy.
 *
 * Priority:
 * 1. Business's own description.
 * 2. Known services.
 * 3. Industry terminology.
 */
export function heroSubheadline(
  facts: CopyFacts,
  playbook: IndustryPlaybook,
): string {
  const ownDescription = firstSentence(facts.description);

  if (ownDescription) {
    return limit(ownDescription, MAX_SUBHEADING);
  }

  const where = place(facts);

  const services = Array.isArray(facts.services)
    ? facts.services
        .map((service) => clean(service?.name))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const terminology = playbook.terminology
    .map((item) => clean(item))
    .filter(Boolean)
    .slice(0, 3);

  const work = services.length
    ? services.join(", ")
    : terminology.join(", ");

  const next = nextStep(playbook);

  if (where && work) {
    return limit(`${tidy(work)} across ${where}. ${next}`, MAX_SUBHEADING);
  }

  if (where) {
    return limit(`${tidy(playbook.label)} serving ${where}. ${next}`, MAX_SUBHEADING);
  }

  if (work) {
    return limit(`${tidy(work)}. ${next}`, MAX_SUBHEADING);
  }

  return limit(next, MAX_SUBHEADING);
}

/**
 * The next-step sentence matched to the industry's preferred conversion.
 *
 * These are calls to action, not claims.
 */
export function nextStep(playbook: IndustryPlaybook): string {
  switch (playbook.action) {
    case "call":
      return "Call and speak to us today.";

    case "book":
      return "Book a time that suits you.";

    case "quote":
      return "Ask for a written quote.";

    case "consult":
      return "Request a consultation.";

    case "visit":
      return "Come and see us.";

    case "lead":
      return "Get in touch and we'll take it from there.";

    default:
      return "Get in touch and we'll take it from there.";
  }
}

/**
 * Where the primary CTA should point.
 *
 * Contact details come only from the business facts.
 */
export function ctaTarget(
  facts: CopyFacts,
): { url: string; label: string } | null {
  const phone = usable(facts.phone);

  if (phone) {
    const phoneNumber = phone.replace(/[^\d+]/g, "");

    if (phoneNumber) {
      return {
        url: `tel:${phoneNumber}`,
        label: "Call now",
      };
    }
  }

  const email = usable(facts.email);

  if (email) {
    return {
      url: `mailto:${email}`,
      label: "Email us",
    };
  }

  return {
    url: "/contact",
    label: "Get in touch",
  };
}

export type SectionCopy = {
  heading: string;
  subheading?: string;
  body?: string;
};

/**
 * Creates section copy from:
 * - known business facts
 * - the selected industry playbook
 * - the requested section kind
 *
 * Unknown section kinds receive a safe human-readable heading.
 */
export function sectionCopy(
  kind: string,
  facts: CopyFacts,
  playbook: IndustryPlaybook,
): SectionCopy {
  const normalizedKind = clean(kind)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const where = place(facts);

  const services = Array.isArray(facts.services)
    ? facts.services
        .map((service) => clean(service?.name))
        .filter(Boolean)
    : [];

  const firstService = services[0] ?? null;

  switch (normalizedKind) {
    case "hero":
      return {
        heading: heroHeadline(facts, playbook),
        subheading: heroSubheadline(facts, playbook),
      };

    case "intro":
      return {
        heading: usable(facts.name)
          ? `About ${clean(facts.name)}`
          : "About us",
        body: firstSentence(facts.description) ?? undefined,
      };

    case "services":
    case "service":
      return {
        heading: services.length
          ? "What we do"
          : `${tidy(playbook.label)} services`,
        subheading: where
          ? `Available across ${where}`
          : undefined,
        body: services.length
          ? services.slice(0, 8).join(" · ")
          : firstService ?? undefined,
      };

    case "process":
      return {
        heading: "How it works",
        subheading: firstService
          ? `${tidy(firstService)} from first contact to finished work`
          : "A straightforward process from first contact to the next step.",
      };

    case "benefits":
      return {
        heading: "Why work with us",
        subheading: services.length
          ? services.slice(0, 4).join(" · ")
          : undefined,
      };

    case "trust_bar":
      return {
        heading: "Why customers choose us",
      };

    case "area":
    case "areas":
    case "service_area":
      return {
        heading: "Areas we cover",
        subheading: where
          ? `Serving ${where}`
          : undefined,
      };

    case "faq":
      return {
        heading: "Common questions",
      };

    case "reviews":
    case "testimonials":
      /*
       * IMPORTANT:
       * Do not manufacture testimonials.
       *
       * The heading is safe because the actual review component can remain
       * empty until verified customer reviews are supplied.
       */
      return {
        heading: "What customers say",
      };

    case "gallery":
    case "portfolio":
    case "projects":
      return {
        heading: "Recent work",
      };

    case "pricing":
      return {
        heading: "Pricing",
      };

    case "quote":
      return {
        heading: "Request a quote",
        subheading: "Tell us what you need and we'll price it.",
      };

    case "booking":
    case "bookings":
      return {
        heading: "Book an appointment",
      };

    case "contact":
      return {
        heading: "Contact us",
        subheading: where
          ? `Serving ${where}`
          : undefined,
      };

    case "cta":
    case "sticky_cta":
      return {
        heading: nextStep(playbook),
        subheading: where
          ? `${tidy(playbook.label)} in ${where}`
          : undefined,
      };

    case "about":
      return {
        heading: usable(facts.name)
          ? `About ${clean(facts.name)}`
          : "About us",
        body: firstSentence(facts.description) ?? undefined,
      };

    case "features":
      return {
        heading: "What we offer",
        subheading: services.length
          ? services.slice(0, 4).join(" · ")
          : undefined,
      };

    case "team":
      return {
        heading: "Our team",
      };

    case "hours":
      return {
        heading: "Opening hours",
      };

    case "location":
      return {
        heading: "Find us",
        subheading: where
          ? where
          : undefined,
      };

    case "lead":
    case "lead_form":
      return {
        heading: "Let's get started",
        subheading: nextStep(playbook),
      };

    default: {
      const fallback = normalizedKind
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());

      return {
        heading: fallback || "Learn more",
      };
    }
  }
}

/**
 * Builds search metadata from business facts only.
 *
 * No fabricated location, price, review, rating, award, licence,
 * experience claim, or performance claim is introduced.
 */
export function pageSeo(
  pageTitle: string,
  facts: CopyFacts,
  playbook: IndustryPlaybook,
): {
  seo_title: string;
  seo_description: string;
} {
  const titleBase = usable(pageTitle) ?? tidy(playbook.label);
  const where = place(facts);
  const brand = usable(facts.name);

  const titleParts: string[] = [];

  if (where) {
    titleParts.push(`${titleBase} in ${where}`);
  } else {
    titleParts.push(titleBase);
  }

  if (brand) {
    titleParts.push(`| ${brand}`);
  }

  const seoTitle = limit(
    titleParts.join(" "),
    MAX_META_TITLE,
  );

  const services = Array.isArray(facts.services)
    ? facts.services
        .map((service) => clean(service?.name))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const work = services.length
    ? services.join(", ")
    : playbook.terminology
        .map((item) => clean(item))
        .filter(Boolean)
        .slice(0, 3)
        .join(", ");

  const descriptionParts: string[] = [];

  if (titleBase) {
    descriptionParts.push(titleBase);
  }

  if (where) {
    descriptionParts.push(`serving ${where}.`);
  } else {
    descriptionParts.push(".");
  }

  if (work) {
    descriptionParts.push(`${tidy(work)}.`);
  }

  descriptionParts.push(nextStep(playbook));

  const seoDescription = limit(
    descriptionParts.join(" "),
    MAX_META_DESCRIPTION,
  );

  return {
    seo_title: seoTitle,
    seo_description: seoDescription,
  };
}

/**
 * Returns the safest FAQ questions for the selected industry.
 *
 * Questions come directly from the industry playbook.
 * Answers are intentionally NOT generated here because the builder must not
 * invent business-specific policies, prices, guarantees, hours, credentials,
 * turnaround times, or service promises.
 */
export function faqQuestions(
  playbook: IndustryPlaybook,
): string[] {
  const questions = Array.isArray(playbook.faqSeeds)
    ? playbook.faqSeeds
        .map((question) => clean(question))
        .filter(Boolean)
    : [];

  return Array.from(new Set(questions)).slice(0, 5);
}

/**
 * Optional utility used by future builder upgrades.
 *
 * Returns a compact list of known services without duplicates.
 */
export function serviceNames(
  facts: CopyFacts,
): string[] {
  if (!Array.isArray(facts.services)) return [];

  return Array.from(
    new Set(
      facts.services
        .map((service) => clean(service?.name))
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

/**
 * Creates a compact business descriptor for future deterministic sections.
 */
export function businessDescriptor(
  facts: CopyFacts,
  playbook: IndustryPlaybook,
): string {
  const name = usable(facts.name);
  const where = place(facts);

  if (name && where) {
    return `${name} — ${playbook.label} in ${where}`;
  }

  if (name) {
    return `${name} — ${playbook.label}`;
  }

  if (where) {
    return `${playbook.label} in ${where}`;
  }

  return playbook.label;
}
