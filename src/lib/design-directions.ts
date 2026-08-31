/**
 * Client-specific design directions (pure layer).
 *
 * Two clients in the same trade should never end up with the same-looking
 * website. This module derives a set of complete visual identities — palette,
 * type, backdrop, section motion and overall styling attitude — and ranks them
 * for the specific business, so the builder can offer real choices instead of
 * one template.
 *
 * Everything returned is expressed as validated agent actions (theme colours,
 * allowlisted backdrops, allowlisted section effects), so applying a direction
 * is snapshotted and reversible like any other builder change.
 */

import type { AgentAction } from "@/lib/site-agent";
import type { BackdropId, SectionEffectId } from "@/lib/site-effects";
import type { ContentPage } from "@/lib/website-content";

export type DesignDirection = {
  id: string;
  name: string;
  /** One line the owner understands. */
  mood: string;
  /** Who it suits. */
  bestFor: string;
  primary: string;
  secondary: string;
  accent: string;
  font: string;
  fontNote: string;
  backdrop: BackdropId;
  heroEffect: SectionEffectId;
  ctaEffect: SectionEffectId;
  formEffect: SectionEffectId;
  bodyEffect: SectionEffectId;
  /** Industry words this direction is written for. */
  affinity: string[];
};

export const DESIGN_DIRECTIONS: DesignDirection[] = [
  {
    id: "luxury-gold",
    name: "Luxury gold",
    mood: "Deep black, warm gold, generous space. Feels expensive before a word is read.",
    bestFor: "High-ticket work where trust and price sit together",
    primary: "#d4a544",
    secondary: "#0b0b0d",
    accent: "#f2d69b",
    font: "Playfair Display",
    fontNote: "Editorial serif headings, quiet body text",
    backdrop: "spotlight",
    heroEffect: "float_3d",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["roof", "remodel", "landscap", "interior", "design", "law", "dental", "med", "real estate"],
  },
  {
    id: "modern-clean",
    name: "Modern clean",
    mood: "Cool blues, crisp edges, everything easy to scan on a phone.",
    bestFor: "Straightforward services where speed and clarity win the job",
    primary: "#3b82f6",
    secondary: "#0f172a",
    accent: "#93c5fd",
    font: "Inter",
    fontNote: "Neutral, highly readable at every size",
    backdrop: "grid",
    heroEffect: "rise",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["clean", "plumb", "hvac", "it", "tech", "account", "insur", "moving"],
  },
  {
    id: "bold-trade",
    name: "Bold trade",
    mood: "Heavy headlines, high-contrast red and steel. Looks like it gets the job done.",
    bestFor: "Emergency and hard-graft trades competing on speed",
    primary: "#e0402c",
    secondary: "#141416",
    accent: "#ffb703",
    font: "Archivo Black",
    fontNote: "Big impact headings, tight body copy",
    backdrop: "gradient_mesh",
    heroEffect: "tilt_3d",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["tow", "emergency", "restoration", "demolition", "concrete", "weld", "auto", "mechanic", "pest"],
  },
  {
    id: "minimal-quiet",
    name: "Minimal quiet",
    mood: "Almost no decoration. Words, space and one clear button.",
    bestFor: "Professional services where calm equals competence",
    primary: "#6b7f6e",
    secondary: "#121513",
    accent: "#cfe0d3",
    font: "Manrope",
    fontNote: "Soft geometric sans, wide spacing",
    backdrop: "none",
    heroEffect: "rise",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["consult", "coach", "therap", "wellness", "yoga", "book keep", "financ"],
  },
  {
    id: "futuristic",
    name: "Futuristic",
    mood: "Aurora light, glass panels, subtle 3D depth. Looks years ahead of the competition.",
    bestFor: "Businesses selling new technology or premium installs",
    primary: "#8b5cf6",
    secondary: "#0a0a13",
    accent: "#22d3ee",
    font: "Space Grotesk",
    fontNote: "Technical sans with character",
    backdrop: "aurora",
    heroEffect: "float_3d",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "parallax_slow",
    affinity: ["solar", "smart", "security", "ev", "energy", "automation", "audio", "camera", "network"],
  },
  {
    id: "night-sky",
    name: "Night sky",
    mood: "Starfield behind deep navy, gold accents. Memorable without shouting.",
    bestFor: "Anyone who wants to be remembered after one visit",
    primary: "#c9a227",
    secondary: "#080c18",
    accent: "#8ea8d8",
    font: "Sora",
    fontNote: "Modern sans, confident headings",
    backdrop: "stars",
    heroEffect: "float_3d",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["event", "photo", "wedding", "entertain", "music", "bar", "restaur"],
  },
  {
    id: "corporate-steel",
    name: "Corporate steel",
    mood: "Navy, graphite and structure. Reads as established and safe to hire.",
    bestFor: "Commercial contracts and bigger buyers",
    primary: "#2563a5",
    secondary: "#101418",
    accent: "#9db4cc",
    font: "IBM Plex Sans",
    fontNote: "Institutional, dependable",
    backdrop: "grid",
    heroEffect: "rise",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["commercial", "industrial", "facilit", "janitor", "logistic", "construct", "engineer"],
  },
  {
    id: "warm-craft",
    name: "Warm craft",
    mood: "Terracotta and clay tones, handmade feel, friendly wording.",
    bestFor: "Family businesses where people hire the person",
    primary: "#c2703d",
    secondary: "#17110d",
    accent: "#f0c9a6",
    font: "Lora",
    fontNote: "Warm serif headings, easy body text",
    backdrop: "nebula",
    heroEffect: "tilt_3d",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["bake", "florist", "salon", "groom", "child", "care", "farm", "carpent", "furniture"],
  },
  {
    id: "editorial",
    name: "Editorial",
    mood: "Magazine layout energy: big type, strong photography, lots of air.",
    bestFor: "Businesses with great photos of their own work",
    primary: "#e8e3d9",
    secondary: "#0d0d0d",
    accent: "#c9a227",
    font: "Instrument Serif",
    fontNote: "Display serif headlines, plain body",
    backdrop: "spotlight",
    heroEffect: "parallax_slow",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["architect", "stage", "paint", "tile", "stone", "pool", "garden", "photo"],
  },
  {
    id: "fresh-green",
    name: "Fresh green",
    mood: "Living greens and daylight. Feels clean, outdoor and healthy.",
    bestFor: "Outdoor, eco and cleaning work",
    primary: "#3f9d5a",
    secondary: "#0c1410",
    accent: "#bdf0c8",
    font: "Figtree",
    fontNote: "Friendly rounded sans",
    backdrop: "gradient_mesh",
    heroEffect: "rise",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["lawn", "tree", "garden", "eco", "green", "solar", "clean", "wash", "septic"],
  },
  {
    id: "pure-white",
    name: "Pure white",
    mood: "Bright white space, black type, one strong colour. Reads instantly on any phone.",
    bestFor: "Anyone who wants to look clean, modern and easy to trust",
    primary: "#111827",
    secondary: "#ffffff",
    accent: "#2563eb",
    font: "Inter",
    fontNote: "Neutral, highly readable at every size",
    backdrop: "none",
    heroEffect: "rise",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["clean", "dental", "med", "law", "account", "consult", "real estate", "insur"],
  },
  {
    id: "coastal-blue",
    name: "Coastal blue",
    mood: "Daylight blues on white. Calm, dependable, easy on the eye.",
    bestFor: "Home services where reassurance closes the job",
    primary: "#1d4ed8",
    secondary: "#f6f9ff",
    accent: "#0ea5e9",
    font: "Figtree",
    fontNote: "Friendly rounded sans",
    backdrop: "gradient_mesh",
    heroEffect: "rise",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["plumb", "pool", "wash", "clean", "hvac", "water", "roof", "window"],
  },
  {
    id: "deep-navy",
    name: "Deep navy",
    mood: "Rich navy with a bright signal blue. Serious money, modern edges.",
    bestFor: "Commercial buyers and bigger contracts",
    primary: "#38bdf8",
    secondary: "#0b1220",
    accent: "#7dd3fc",
    font: "IBM Plex Sans",
    fontNote: "Institutional, dependable",
    backdrop: "grid",
    heroEffect: "float_3d",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["commercial", "security", "it", "tech", "engineer", "logistic", "finance"],
  },
  {
    id: "soft-sand",
    name: "Soft sand",
    mood: "Warm off-white, clay accents, unhurried. Feels handmade and local.",
    bestFor: "Family businesses and care work",
    primary: "#a3541f",
    secondary: "#fbf7f1",
    accent: "#d99b5b",
    font: "Lora",
    fontNote: "Warm serif headings, easy body text",
    backdrop: "none",
    heroEffect: "rise",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["care", "child", "salon", "groom", "bake", "florist", "interior", "furniture"],
  },
  {
    id: "signal-orange",
    name: "Signal orange",
    mood: "White page, hot orange buttons. Impossible to miss the next step.",
    bestFor: "Fast-response trades that live on phone calls",
    primary: "#ea580c",
    secondary: "#fffdfa",
    accent: "#f59e0b",
    font: "Archivo Black",
    fontNote: "Big impact headings, tight body copy",
    backdrop: "none",
    heroEffect: "tilt_3d",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["tow", "emergency", "lock", "garage", "auto", "mechanic", "pest", "moving"],
  },
  {
    id: "clinic-teal",
    name: "Clinic teal",
    mood: "Clean white with clinical teal. Hygienic, precise, calm.",
    bestFor: "Health, dental and anything where cleanliness sells",
    primary: "#0f766e",
    secondary: "#f5fbfa",
    accent: "#14b8a6",
    font: "Manrope",
    fontNote: "Soft geometric sans, wide spacing",
    backdrop: "none",
    heroEffect: "rise",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["dental", "med", "clinic", "therap", "wellness", "clean", "sanit", "vet"],
  },
  {
    id: "slate-mono",
    name: "Slate mono",
    mood: "Grey-on-white, almost no colour, all structure. Quietly expensive.",
    bestFor: "Design-led and professional services",
    primary: "#0f172a",
    secondary: "#f4f5f7",
    accent: "#64748b",
    font: "Space Grotesk",
    fontNote: "Technical sans with character",
    backdrop: "none",
    heroEffect: "parallax_slow",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["architect", "design", "consult", "photo", "stone", "tile", "carpent"],
  },
  {
    id: "orchard-green",
    name: "Orchard green",
    mood: "White daylight with deep garden green. Outdoor, healthy, well-kept.",
    bestFor: "Lawn, tree, garden and eco work",
    primary: "#166534",
    secondary: "#f7fbf5",
    accent: "#4ade80",
    font: "Figtree",
    fontNote: "Friendly rounded sans",
    backdrop: "gradient_mesh",
    heroEffect: "rise",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "rise",
    affinity: ["lawn", "tree", "garden", "landscap", "eco", "green", "farm", "septic"],
  },
  {
    id: "violet-studio",
    name: "Violet studio",
    mood: "Soft white with electric violet. Creative, current, memorable.",
    bestFor: "Businesses that want to look nothing like their competitors",
    primary: "#6d28d9",
    secondary: "#faf8ff",
    accent: "#a855f7",
    font: "Sora",
    fontNote: "Modern sans, confident headings",
    backdrop: "aurora",
    heroEffect: "float_3d",
    ctaEffect: "gold_glow",
    formEffect: "glass",
    bodyEffect: "parallax_slow",
    affinity: ["event", "photo", "music", "brand", "market", "salon", "studio", "wedding"],
  },
];


const hash = (value: string) => {
  let out = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    out ^= value.charCodeAt(i);
    out = Math.imul(out, 16777619) >>> 0;
  }
  return out;
};

/**
 * Ranks directions for this specific business. Industry words come first, then
 * a stable per-business seed decides the rest — so two identical trades in the
 * same town still get offered different identities.
 */
export function recommendDirections(input: {
  businessName: string | null;
  industry: string | null;
  services: { name: string }[];
  city: string | null;
  currentFont?: string | null;
  count?: number;
}): DesignDirection[] {
  const words = [input.industry ?? "", ...input.services.map((service) => service.name)]
    .join(" ")
    .toLowerCase();
  const seed = hash(`${input.businessName ?? ""}|${input.industry ?? ""}|${input.city ?? ""}`);

  const scored = DESIGN_DIRECTIONS.map((direction, index) => {
    const matches = direction.affinity.filter((word) => words.includes(word)).length;
    const jitter = (hash(`${direction.id}:${seed}`) % 100) / 100;
    const current = input.currentFont && direction.font.toLowerCase() === input.currentFont.toLowerCase() ? 0.4 : 0;
    return { direction, score: matches * 2 + jitter + current, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, input.count ?? 4).map((entry) => entry.direction);
}

/** The exact, reversible changes that installing a direction makes. */
export function directionActions(direction: DesignDirection, pages: ContentPage[]): AgentAction[] {
  const actions: AgentAction[] = [
    {
      type: "set_theme",
      patch: {
        primary_color: direction.primary,
        secondary_color: direction.secondary,
        accent_color: direction.accent,
        font_preference: direction.font,
      },
    },
    { type: "set_backdrop", backdrop: direction.backdrop },
  ];

  const sections = pages
    .filter((page) => page.is_visible)
    .flatMap((page) => page.sections.filter((section) => section.is_visible))
    .slice(0, 40);

  for (const section of sections) {
    const effect =
      section.kind === "hero"
        ? direction.heroEffect
        : section.kind === "cta" || section.kind === "sticky_cta" || section.kind === "offer"
          ? direction.ctaEffect
          : section.kind === "quote" || section.kind === "booking" || section.kind === "contact"
            ? direction.formEffect
            : direction.bodyEffect;
    actions.push({ type: "set_section_effect", sectionId: section.id, effect });
  }

  return actions;
}

/** Plain-language preview of what a direction changes. */
export function directionPreview(direction: DesignDirection, sectionCount: number): string[] {
  return [
    `Brand colours → ${direction.primary} with ${direction.accent}`,
    `Headings → ${direction.font} (${direction.fontNote})`,
    `Background → ${direction.backdrop === "none" ? "clean, no animation" : direction.backdrop.replace(/_/g, " ")}`,
    `Motion → ${sectionCount} section${sectionCount === 1 ? "" : "s"} restyled (hero ${direction.heroEffect.replace(/_/g, " ")}, buttons ${direction.ctaEffect.replace(/_/g, " ")})`,
  ];
}
