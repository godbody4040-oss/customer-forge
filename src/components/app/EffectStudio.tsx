
/**
 * Sensible default effect per section type, so a new site doesn't need every
 * section hand-tuned. Conversion-critical blocks (cta, sticky cta, the
 * current-offer banner) earn the eye-catching gold treatments; forms get a
 * soft frosted-glass lift; the hero, trust bar and legal pages stay plain —
 * the hero is already above the fold so an entrance animation is wasted on
 * it, and legal/utility content shouldn't draw the eye. Everything else
 * defaults to a gentle scroll-reveal, which is safe and premium-feeling
 * without needing a per-section decision.
 */
const RECOMMENDED_SECTION_EFFECT: Record<string, SectionEffectId> = {
  hero: "none",
  trust_bar: "none",
  policy: "none",
  custom: "none",
  offer: "gold_glow",
  cta: "gold_glow",
  sticky_cta: "gold_glow",
  quote: "glass",
  booking: "glass",
};

export function recommendedSectionEffect(kind: string): SectionEffectId {
  return RECOMMENDED_SECTION_EFFECT[kind] ?? "rise";
}
