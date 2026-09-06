/**
 * REVORA DETERMINISTIC CONTENT ENGINE — real copy, no model, no invention.
 *
 * Every sentence here is assembled from facts the workspace already holds:
 * business name, trade, town, service area, service names, contact details.
 * If a fact is missing, the sentence that needed it is simply not produced —
 * nothing is guessed, and no review, rating, award, licence, price, guarantee
 * or result is ever written.
 */

import type { IndustryPlaybook } from "./industry";

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

const trim = (value: string) => value.replace(/\s+/g, " ").trim();

/** Sentence case without shouting, safe for headings. */
const tidy = (value: string) => {
  const text = trim(value);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** The place words, when the workspace actually knows them. */
export function place(facts: CopyFacts): string | null {
  if (facts.serviceArea) return trim(facts.serviceArea);
  if (facts.city && facts.state) return `${trim(facts.city)}, ${trim(facts.state)}`;
  return facts.city ? trim(facts.city) : null;
}

/** The trade noun used in headings — the playbook label, lowercased. */
const trade = (playbook: IndustryPlaybook) => playbook.label.toLowerCase();

/** First sentence of the owner's own description, when they wrote one. */
export function firstSentence(text: string | null): string | null {
  if (!text) return null;
  const sentence = trim(text).split(/(?<=[.!?])\s/)[0] ?? "";
  return sentence.length > 8 ? sentence : trim(text) || null;
}

export function heroHeadline(facts: CopyFacts, playbook: IndustryPlaybook): string {
  const where = place(facts);
  if (facts.tagline) return tidy(facts.tagline).slice(0, 70);
  if (where) return tidy(`${playbook.label} in ${where}`).slice(0, 70);
  if (facts.name) return tidy(`${facts.name} — ${trade(playbook)}`).slice(0, 70);
  return tidy(playbook.label).slice(0, 70);
}

export function heroSubheadline(facts: CopyFacts, playbook: IndustryPlaybook): string {
  const own = firstSentence(facts.description);
  if (own) return own.slice(0, 200);
  const where = place(facts);
  const work = facts.services.length
    ? facts.services
        .slice(0, 3)
        .map((service) => service.name.toLowerCase())
        .join(", ")
    : playbook.terminology.slice(0, 3).join(", ");
  return tidy(
    where ? `${work} across ${where}. ${nextStep(playbook)}` : `${work}. ${nextStep(playbook)}`,
  ).slice(0, 200);
}

/** The next step sentence, matched to what this trade wants visitors to do. */
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
    default:
      return "Get in touch and we'll take it from there.";
  }
}

/** Where the primary button should point, using only contact details we hold. */
export function ctaTarget(facts: CopyFacts): { url: string; label: string } | null {
  if (facts.phone) return { url: `tel:${facts.phone.replace(/[^\d+]/g, "")}`, label: "Call now" };
  if (facts.email) return { url: `mailto:${facts.email}`, label: "Email us" };
  return { url: "/contact", label: "Get in touch" };
}

export type SectionCopy = {
  heading: string;
  subheading?: string | undefined;
  body?: string | undefined;
};

/**
 * Heading and supporting words for a section kind. Only trade-shaped structure
 * and the workspace's own facts — never a claim.
 */
export function sectionCopy(
  kind: string,
  facts: CopyFacts,
  playbook: IndustryPlaybook,
): SectionCopy {
  const where = place(facts);
  const list = facts.services.map((service) => service.name);

  switch (kind) {
    case "hero":
      return {
        heading: heroHeadline(facts, playbook),
        subheading: heroSubheadline(facts, playbook),
      };
    case "intro":
      return {
        heading: facts.name ? `About ${facts.name}` : "About us",
        body: firstSentence(facts.description) ?? undefined,
      };
    case "services":
      return {
        heading: list.length ? "What we do" : `${tidy(playbook.label)} services`,
        subheading: where ? `Available across ${where}` : undefined,
        body: list.length ? list.slice(0, 8).join(" · ") : undefined,
      };
    case "process":
      return {
        heading: "How it works",
        subheading: `${tidy(playbook.terminology[0] ?? "work")} from first contact to finished job`,
      };
    // Reassurance sections deliberately carry NO claims. Licences, insurance,
    // guarantees and ratings are facts Revora cannot verify, so the owner fills
    // them in themselves rather than the builder asserting them.
    case "benefits":
      return {
        heading: "Why work with us",
        subheading: list.length ? list.slice(0, 4).join(" · ") : undefined,
      };
    case "trust_bar":
      return { heading: "Why customers choose us" };
    case "area":
    case "areas":
      return {
        heading: where ? `Areas we cover` : "Areas we cover",
        subheading: where ? `Based in ${where}` : undefined,
      };
    case "faq":
      return { heading: "Common questions" };
    case "reviews":
      return { heading: "What customers say" };
    case "gallery":
      return { heading: "Recent work" };
    case "pricing":
      return { heading: "Pricing" };
    case "quote":
      return {
        heading: "Request a quote",
        subheading: "Tell us what you need and we'll price it.",
      };
    case "booking":
      return { heading: "Book an appointment" };
    case "contact":
      return {
        heading: "Contact us",
        subheading: where ? `Serving ${where}` : undefined,
      };
    case "cta":
    case "sticky_cta":
      return {
        heading: nextStep(playbook),
        subheading: where ? `${tidy(playbook.label)} in ${where}` : undefined,
      };
    default:
      return { heading: tidy(kind.replace(/_/g, " ")) };
  }
}

/** Page title/meta built from trade + place + business name only. */
export function pageSeo(
  pageTitle: string,
  facts: CopyFacts,
  playbook: IndustryPlaybook,
): { seo_title: string; seo_description: string } {
  const where = place(facts);
  const brand = facts.name ? ` | ${facts.name}` : "";
  const title = trim(
    where ? `${pageTitle} in ${where}${brand}` : `${pageTitle}${brand || ` — ${playbook.label}`}`,
  ).slice(0, 70);
  const description = trim(
    [
      pageTitle,
      where ? `in ${where}.` : ".",
      facts.services.length
        ? `${facts.services
            .slice(0, 3)
            .map((service) => service.name)
            .join(", ")}.`
        : `${playbook.terminology.slice(0, 3).join(", ")}.`,
      nextStep(playbook),
    ].join(" "),
  ).slice(0, 160);
  return { seo_title: title, seo_description: description };
}

/** FAQ seeds for a trade, phrased as questions only — answers stay the owner's. */
export function faqQuestions(playbook: IndustryPlaybook): string[] {
  return playbook.faqSeeds.slice(0, 3);
}
