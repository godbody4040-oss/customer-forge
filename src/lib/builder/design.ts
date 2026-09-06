/**
 * REVORA DESIGN DECISION ENGINE — one coordinated direction, never random tweaks.
 *
 * A mood word like "premium" or "industrial" is turned into a set of decisions
 * that agree with each other: palette, typeface, background, motion, density
 * and which sections carry the eye. The trade's own playbook is the starting
 * point, so a roofer asking for "modern" and a dentist asking for "modern" do
 * not end up with the same site.
 *
 * Deterministic, dependency-free and free to run.
 */

import type { BackdropId, SectionEffectId } from "@/lib/site-effects";
import type { IndustryPlaybook } from "./industry";
import type { StyleMood } from "./interpreter";

export type DesignDecision = {
  theme: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    font_preference: string;
  };
  backdrop: BackdropId;
  /** Motion for the hero, chosen to match the mood, not sprinkled at random. */
  heroEffect: SectionEffectId;
  /** Motion for the supporting blocks. */
  bodyEffect: SectionEffectId;
  /** How tall and airy sections should sit. */
  density: "full" | "standard" | "compact";
  /** Plain-English record of the direction, shown to the owner. */
  rationale: string[];
};

type MoodRule = {
  theme?: Partial<DesignDecision["theme"]>;
  backdrop?: BackdropId;
  heroEffect?: SectionEffectId;
  bodyEffect?: SectionEffectId;
  density?: DesignDecision["density"];
  says: string;
};

/**
 * Each mood is a whole direction. Later moods layer over earlier ones, so
 * "premium but bright" lands somewhere sensible rather than fighting itself.
 */
const MOOD_RULES: Record<StyleMood, MoodRule> = {
  premium: {
    theme: { secondary_color: "#0b0b12", accent_color: "#d4af37", font_preference: "serif" },
    backdrop: "nebula",
    heroEffect: "gold_glow",
    bodyEffect: "rise",
    density: "full",
    says: "Restrained deep background, gold accent and a serif headline — expensive without shouting.",
  },
  professional: {
    theme: { font_preference: "sans" },
    backdrop: "none",
    heroEffect: "rise",
    bodyEffect: "none",
    density: "standard",
    says: "Clean background and a plain typeface so the words carry the credibility.",
  },
  minimal: {
    theme: { font_preference: "sans" },
    backdrop: "none",
    heroEffect: "none",
    bodyEffect: "none",
    density: "compact",
    says: "Nothing decorative — space and hierarchy do the work.",
  },
  bold: {
    theme: { accent_color: "#f97316" },
    backdrop: "gradient_mesh",
    heroEffect: "rise",
    bodyEffect: "rise",
    density: "full",
    says: "Bigger hero, warm accent and stronger buttons so the next step is unmissable.",
  },
  friendly: {
    theme: { font_preference: "sans", accent_color: "#22c55e" },
    backdrop: "aurora",
    heroEffect: "rise",
    bodyEffect: "none",
    density: "standard",
    says: "Softer light and rounder wording so it reads approachable.",
  },
  modern: {
    theme: { font_preference: "sans" },
    backdrop: "grid",
    heroEffect: "tilt_3d",
    bodyEffect: "rise",
    density: "standard",
    says: "Faint grid and light depth — current without being a trend.",
  },
  dark: {
    theme: { secondary_color: "#08080d" },
    backdrop: "stars",
    heroEffect: "glass",
    bodyEffect: "rise",
    density: "standard",
    says: "Dark surface with glass panels so photos and buttons pull focus.",
  },
  bright: {
    theme: { secondary_color: "#f8fafc" },
    backdrop: "spotlight",
    heroEffect: "rise",
    bodyEffect: "none",
    density: "standard",
    says: "Light, open surface with a soft spotlight on the top of the page.",
  },
};

/**
 * Builds one coordinated direction from the trade playbook plus any mood words
 * the owner used. With no mood words at all, the trade's own direction is used.
 */
export function designDecision(playbook: IndustryPlaybook, moods: StyleMood[]): DesignDecision {
  const decision: DesignDecision = {
    theme: {
      primary_color: playbook.visual.primary,
      secondary_color: playbook.visual.secondary,
      accent_color: playbook.visual.accent,
      font_preference: playbook.visual.font,
    },
    backdrop: playbook.visual.backdrop as BackdropId,
    heroEffect: "rise",
    bodyEffect: "none",
    density: "standard",
    rationale: [`Started from the direction that suits ${playbook.label.toLowerCase()}.`],
  };

  for (const mood of moods) {
    const rule = MOOD_RULES[mood];
    if (!rule) continue;
    Object.assign(decision.theme, rule.theme ?? {});
    if (rule.backdrop) decision.backdrop = rule.backdrop;
    if (rule.heroEffect) decision.heroEffect = rule.heroEffect;
    if (rule.bodyEffect) decision.bodyEffect = rule.bodyEffect;
    if (rule.density) decision.density = rule.density;
    decision.rationale.push(rule.says);
  }

  return decision;
}

/**
 * The order sections should sit in when the owner asks for the important things
 * to be easier to find. Only kinds already on the page are returned, so nothing
 * is invented and nothing is lost.
 */
export const HIERARCHY_ORDER = [
  "hero",
  "trust_bar",
  "offer",
  "intro",
  "services",
  "benefits",
  "pricing",
  "process",
  "gallery",
  "reviews",
  "guarantee",
  "area",
  "faq",
  "lead_magnet",
  "quote",
  "booking",
  "cta",
  "contact",
  "sticky_cta",
];

/** Sorts the page's own sections into buyer-decision order. */
export function hierarchySort<T extends { id: string; kind: string }>(sections: T[]): T[] {
  const rank = (kind: string) => {
    const index = HIERARCHY_ORDER.indexOf(kind);
    return index === -1 ? HIERARCHY_ORDER.length : index;
  };
  return [...sections].sort((left, right) => rank(left.kind) - rank(right.kind));
}
