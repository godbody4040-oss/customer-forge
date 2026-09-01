/**
 * Revora per-business site variation.
 *
 * Every client runs the same generation engine, but no two clients should end
 * up with the same website. This module derives a stable, deterministic
 * variation from the business itself (workspace id + name + industry + town):
 * hero layout, section layouts, section headings, process wording and the
 * order optional blocks appear in.
 *
 * Rules:
 * - Deterministic: the same business always regenerates to the same variation,
 *   so rebuilding a site does not scramble a client's website.
 * - Fact-free: it only chooses wording patterns and layouts. It never invents
 *   reviews, claims, credentials, prices or locations.
 */

const hash = (value: string) => {
  let out = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    out ^= value.charCodeAt(i);
    out = Math.imul(out, 16777619) >>> 0;
  }
  return out >>> 0;
};

/** Stable pick from a list for this seed + slot. */
const pick = <T>(list: readonly T[], seed: string, slot: string): T =>
  list[hash(`${seed}::${slot}`) % list.length]!;

export type VariationFacts = {
  /** Workspace id — the strongest uniqueness signal we have. */
  organizationId?: string | null;
  businessName?: string | null;
  industry?: string | null;
  city?: string | null;
};

export function variationSeed(facts: VariationFacts): string {
  return [facts.organizationId ?? "", facts.businessName ?? "", facts.industry ?? "", facts.city ?? ""]
    .join("|")
    .toLowerCase();
}

const HERO_VARIANTS = ["split", "stacked", "spotlight", "editorial", "banner"] as const;
const SERVICE_VARIANTS = ["cards", "grid", "list", "columns"] as const;
const PROOF_VARIANTS = ["quotes", "cards", "strip"] as const;
const CTA_VARIANTS = ["band", "panel", "inline"] as const;

/** Optional blocks, ordered differently per business. */
const OPTIONAL_ORDERS = [
  ["process", "benefits", "pricing", "gallery", "reviews"],
  ["benefits", "process", "gallery", "pricing", "reviews"],
  ["pricing", "process", "benefits", "reviews", "gallery"],
  ["gallery", "benefits", "process", "pricing", "reviews"],
  ["process", "pricing", "gallery", "benefits", "reviews"],
] as const;

const HEADINGS = {
  services: [
    "What we do",
    "Our services",
    "How we can help",
    "Services we offer",
    "Pick the job you need",
  ],
  process: ["How it works", "What happens next", "The process", "From first call to finished job"],
  benefits: [
    "Why customers choose us",
    "What you get",
    "Why work with us",
    "What makes the difference",
  ],
  pricing: ["Starting prices", "What it costs", "Price guide", "Straight pricing"],
  gallery: ["Recent work", "See the work", "Our work", "Before and after"],
  reviews: ["What customers say", "In their words", "Customer reviews", "Straight from customers"],
  areas: ["Areas we cover", "Where we work", "Service areas", "Towns we serve"],
  faq: ["Questions we get asked", "Common questions", "Good to know", "Before you book"],
  quote: ["Get your price now", "Price your job", "Get an instant price", "See your price range"],
  booking: ["Or book a time", "Book a time that suits you", "Pick your slot", "Book it in"],
  cta: [
    "Ready to get started?",
    "Let's get it booked",
    "Shall we get started?",
    "Get your job on the calendar",
  ],
  contact: ["Get in touch", "Talk to us", "Contact us", "Reach the team"],
  intro: ["About {name}", "Who we are", "A bit about {name}", "Meet {name}"],
} as const;

export type HeadingSlot = keyof typeof HEADINGS;

const PROCESS_SETS = [
  [
    { label: "1. Tell us what you need", body: "Answer a few questions and get an instant price range." },
    { label: "2. We confirm the details", body: "We check the job, confirm the price and hold your slot." },
    { label: "3. We get it done", body: "You get a confirmation, a reminder and the work on the day." },
  ],
  [
    { label: "1. Send the details", body: "A short form tells us the job, the size and where you are." },
    { label: "2. Get your price", body: "You see a clear price range before anyone calls you." },
    { label: "3. Choose your time", body: "Pick a slot that works, then get a reminder before the day." },
  ],
  [
    { label: "1. Quick look at the job", body: "Tell us what needs doing — photos help but aren't required." },
    { label: "2. Straight answer", body: "We come back with the price and what's included, in writing." },
    { label: "3. Booked and done", body: "We turn up when we said, finish the job and follow up after." },
  ],
] as const;

const HEADLINE_PATTERNS = [
  ({ trade, area }: HeadlineFacts) => (area ? `${trade} in ${area}, done right` : `${trade}, done right`),
  ({ trade, area }: HeadlineFacts) =>
    area ? `${area}'s go-to team for ${trade.toLowerCase()}` : `Your go-to team for ${trade.toLowerCase()}`,
  ({ trade, area }: HeadlineFacts) =>
    area ? `Book ${trade.toLowerCase()} in ${area} without the phone tag` : `Book ${trade.toLowerCase()} without the phone tag`,
  ({ trade, area }: HeadlineFacts) =>
    area ? `${trade} across ${area} — priced up front` : `${trade} — priced up front`,
  ({ name, trade }: HeadlineFacts) => `${name}: ${trade.toLowerCase()} you can book today`,
  ({ trade, area }: HeadlineFacts) =>
    area ? `Straightforward ${trade.toLowerCase()} for ${area}` : `Straightforward ${trade.toLowerCase()}`,
] as const;

export type HeadlineFacts = { name: string; trade: string; area: string | null };

const SUBHEAD_PATTERNS = [
  ({ name, area }: HeadlineFacts) =>
    area
      ? `${name} serves ${area}. See services, get a straight answer on price, and lock in a time.`
      : `${name} makes it simple to see services, get pricing and lock in a time.`,
  ({ name, area }: HeadlineFacts) =>
    area
      ? `Tell ${name} what you need in ${area} and get your price range in minutes — no waiting on a callback.`
      : `Tell ${name} what you need and get your price range in minutes — no waiting on a callback.`,
  ({ name, area }: HeadlineFacts) =>
    area
      ? `Prices, availability and booking for ${area}, all in one place with ${name}.`
      : `Prices, availability and booking, all in one place with ${name}.`,
  ({ name }: HeadlineFacts) =>
    `See exactly what ${name} does, what it costs and when we can fit you in.`,
] as const;

export type SiteVariation = {
  /** Short, stable label — useful for support ("this site is on layout C2"). */
  id: string;
  heroVariant: string;
  serviceVariant: string;
  proofVariant: string;
  ctaVariant: string;
  /** Order optional home blocks should appear in. */
  optionalOrder: readonly string[];
  processSteps: readonly { label: string; body: string }[];
  /** Heading wording for a given slot, unique to this business. */
  heading: (slot: HeadingSlot, replacements?: Record<string, string>) => string;
  headline: (facts: HeadlineFacts) => string;
  subheadline: (facts: HeadlineFacts) => string;
};

/** Derives this business's website variation. Same business → same result. */
export function siteVariation(facts: VariationFacts | string): SiteVariation {
  const seed = typeof facts === "string" ? facts.toLowerCase() : variationSeed(facts);
  const letters = "ABCDE";
  const id = `${letters[hash(`${seed}::id`) % letters.length]}${(hash(`${seed}::n`) % 9) + 1}`;

  return {
    id,
    heroVariant: pick(HERO_VARIANTS, seed, "hero"),
    serviceVariant: pick(SERVICE_VARIANTS, seed, "services"),
    proofVariant: pick(PROOF_VARIANTS, seed, "proof"),
    ctaVariant: pick(CTA_VARIANTS, seed, "cta"),
    optionalOrder: pick(OPTIONAL_ORDERS, seed, "order"),
    processSteps: pick(PROCESS_SETS, seed, "process"),
    heading: (slot, replacements) => {
      const list = HEADINGS[slot] as readonly string[];
      let out: string = pick(list, seed, `heading:${slot}`);
      for (const [key, value] of Object.entries(replacements ?? {})) {
        out = out.replaceAll(`{${key}}`, value);
      }
      return out;
    },
    headline: (f) => pick(HEADLINE_PATTERNS, seed, "headline")(f),
    subheadline: (f) => pick(SUBHEAD_PATTERNS, seed, "subheadline")(f),
  };
}
