/**
 * REVORA DESIGN FINGERPRINT — a real design-generation layer on top of the
 * existing site variation engine.
 *
 * The fingerprint decides typography, scale, rhythm, geometry, shadow, layout
 * composition and motion from the Business DNA plus the workspace id, so two
 * roofing companies in the same town still get visibly different websites.
 *
 * It also ships a similarity detector: given the fingerprints of other sites in
 * the estate, `tooSimilar()` reports overlap, and `distinctFingerprint()`
 * re-rolls the visual direction (never the business requirements) until the site
 * is meaningfully different.
 */

import type { BusinessDna } from "@/lib/business-dna";

const hash = (value: string) => {
  let out = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    out ^= value.charCodeAt(i);
    out = Math.imul(out, 16777619) >>> 0;
  }
  return out >>> 0;
};

const pick = <T>(list: readonly T[], seed: string, slot: string): T =>
  list[hash(`${seed}::${slot}`) % list.length]!;

export const FONT_PAIRS = [
  { heading: "Sora", body: "Manrope", mood: "modern technical" },
  { heading: "Instrument Serif", body: "Work Sans", mood: "editorial craft" },
  { heading: "Archivo Black", body: "Hind", mood: "loud and direct" },
  { heading: "Urbanist", body: "Epilogue", mood: "clean contemporary" },
  { heading: "Libre Baskerville", body: "IBM Plex Sans", mood: "established trade" },
  { heading: "Bebas Neue", body: "Barlow", mood: "industrial urgency" },
  { heading: "Space Grotesk", body: "DM Sans", mood: "precise and calm" },
  { heading: "Lora", body: "Nunito Sans", mood: "warm and personal" },
] as const;

const TYPE_SCALES = ["compact", "balanced", "dramatic", "editorial"] as const;
const DENSITIES = ["airy", "comfortable", "dense"] as const;
const RADII = ["square", "soft", "rounded", "pill"] as const;
const SHADOWS = ["flat", "edge", "lifted", "glow"] as const;
const BUTTONS = ["solid", "outline", "gradient", "underline"] as const;
const NAVS = ["inline", "centered", "split", "sidebar-drawer"] as const;
const HEROES = ["split", "stacked", "spotlight", "editorial", "banner", "photo-left"] as const;
const SERVICES = ["cards", "grid", "list", "columns", "accordion"] as const;
const PROOF = ["quotes", "cards", "strip", "portrait"] as const;
const PRICING = ["table", "cards", "range-band"] as const;
const GALLERY = ["mosaic", "carousel-grid", "before-after"] as const;
const BACKDROPS = ["plain", "grid-lines", "soft-glow", "starfield", "gradient-mesh", "paper"] as const;
const MOTION = ["none", "subtle-fade", "rise", "reveal-lines", "parallax-lite"] as const;
const ICONS = ["line", "duotone", "solid", "none"] as const;
const IMAGE_TREATMENTS = ["full-bleed", "framed", "duotone-tint", "rounded-inset"] as const;

export type DesignFingerprint = {
  /** Short support label, e.g. "F-3B". */
  id: string;
  fontHeading: string;
  fontBody: string;
  typeMood: string;
  typeScale: (typeof TYPE_SCALES)[number];
  density: (typeof DENSITIES)[number];
  radius: (typeof RADII)[number];
  shadow: (typeof SHADOWS)[number];
  button: (typeof BUTTONS)[number];
  nav: (typeof NAVS)[number];
  hero: (typeof HEROES)[number];
  services: (typeof SERVICES)[number];
  proof: (typeof PROOF)[number];
  pricing: (typeof PRICING)[number];
  gallery: (typeof GALLERY)[number];
  backdrop: (typeof BACKDROPS)[number];
  motion: (typeof MOTION)[number];
  icons: (typeof ICONS)[number];
  imageTreatment: (typeof IMAGE_TREATMENTS)[number];
  /** Order the optional home blocks appear in. */
  blockOrder: readonly string[];
};

const BLOCK_ORDERS = [
  ["process", "benefits", "pricing", "gallery", "reviews", "faq"],
  ["benefits", "gallery", "process", "reviews", "pricing", "faq"],
  ["pricing", "process", "gallery", "benefits", "faq", "reviews"],
  ["gallery", "benefits", "reviews", "process", "pricing", "faq"],
  ["process", "pricing", "reviews", "gallery", "benefits", "faq"],
] as const;

export type FingerprintSeedFacts = {
  organizationId?: string | null;
  dna: BusinessDna;
  /** Increment to deliberately re-roll the look. */
  revision?: number;
};

/** Personality steers the pool; the seed picks inside it. Deterministic. */
export function designFingerprint(facts: FingerprintSeedFacts): DesignFingerprint {
  const { dna } = facts;
  const seed = [
    facts.organizationId ?? "",
    dna.name,
    dna.industry ?? "",
    dna.serviceArea ?? dna.city ?? "",
    String(facts.revision ?? 0),
  ]
    .join("|")
    .toLowerCase();

  const urgent = dna.urgency === "emergency";
  const considered = dna.urgency === "planned";

  const fonts = urgent
    ? FONT_PAIRS.filter((f) => /direct|urgency|technical|contemporary/.test(f.mood))
    : considered
      ? FONT_PAIRS.filter((f) => /craft|established|personal|calm/.test(f.mood))
      : FONT_PAIRS;
  const font = pick(fonts.length ? fonts : FONT_PAIRS, seed, "font");

  const letters = "ABCDEF";
  const id = `F-${(hash(`${seed}::n`) % 9) + 1}${letters[hash(`${seed}::l`) % letters.length]}`;

  return {
    id,
    fontHeading: font.heading,
    fontBody: font.body,
    typeMood: font.mood,
    typeScale: urgent ? pick(["compact", "dramatic"] as const, seed, "scale") : pick(TYPE_SCALES, seed, "scale"),
    density: urgent ? "comfortable" : pick(DENSITIES, seed, "density"),
    radius: pick(RADII, seed, "radius"),
    shadow: pick(SHADOWS, seed, "shadow"),
    button: pick(BUTTONS, seed, "button"),
    nav: pick(NAVS, seed, "nav"),
    hero: urgent ? pick(["banner", "stacked", "split"] as const, seed, "hero") : pick(HEROES, seed, "hero"),
    services: pick(SERVICES, seed, "services"),
    proof: pick(PROOF, seed, "proof"),
    pricing: pick(PRICING, seed, "pricing"),
    gallery: pick(GALLERY, seed, "gallery"),
    backdrop: pick(BACKDROPS, seed, "backdrop"),
    motion: urgent ? pick(["none", "subtle-fade"] as const, seed, "motion") : pick(MOTION, seed, "motion"),
    icons: pick(ICONS, seed, "icons"),
    imageTreatment: pick(IMAGE_TREATMENTS, seed, "image"),
    blockOrder: pick(BLOCK_ORDERS, seed, "order"),
  };
}

/** Traits compared by the similarity detector, in weight order. */
const TRAITS: (keyof DesignFingerprint)[] = [
  "fontHeading",
  "hero",
  "services",
  "backdrop",
  "radius",
  "shadow",
  "button",
  "nav",
  "proof",
  "pricing",
  "gallery",
  "motion",
  "typeScale",
  "density",
  "imageTreatment",
  "icons",
];

/** 0–1 overlap between two fingerprints. */
export function similarity(a: DesignFingerprint, b: DesignFingerprint): number {
  const same = TRAITS.filter((trait) => a[trait] === b[trait]).length;
  return same / TRAITS.length;
}

export const SIMILARITY_LIMIT = 0.6;

export function tooSimilar(
  candidate: DesignFingerprint,
  others: DesignFingerprint[],
  limit = SIMILARITY_LIMIT,
): { similar: boolean; worst: number } {
  let worst = 0;
  for (const other of others) {
    if (other.id === candidate.id && others.length === 1) continue;
    worst = Math.max(worst, similarity(candidate, other));
  }
  return { similar: worst > limit, worst };
}

/**
 * Returns a fingerprint that is meaningfully different from the estate. Business
 * requirements are untouched — only the visual direction is re-rolled.
 */
export function distinctFingerprint(
  facts: FingerprintSeedFacts,
  others: DesignFingerprint[],
  attempts = 8,
): { fingerprint: DesignFingerprint; revision: number; worst: number } {
  let best: { fingerprint: DesignFingerprint; revision: number; worst: number } | null = null;
  for (let revision = facts.revision ?? 0; revision < (facts.revision ?? 0) + attempts; revision += 1) {
    const fingerprint = designFingerprint({ ...facts, revision });
    const { similar, worst } = tooSimilar(fingerprint, others);
    if (!best || worst < best.worst) best = { fingerprint, revision, worst };
    if (!similar) return { fingerprint, revision, worst };
  }
  return best!;
}

/** Plain-language description an owner can actually read. */
export function describeFingerprint(fp: DesignFingerprint): string {
  return [
    `${fp.fontHeading} headings with ${fp.fontBody} text (${fp.typeMood})`,
    `${fp.hero.replace("-", " ")} hero`,
    `services shown as a ${fp.services}`,
    `${fp.radius} corners, ${fp.shadow} depth`,
    fp.motion === "none" ? "no animation" : `${fp.motion.replace("-", " ")} motion`,
  ].join(" · ");
}
