/**
 * REVORA PER-BUSINESS COLOUR VARIATION.
 *
 * `industry.ts` gives every business in the same trade the exact same
 * `primary`/`accent` hex pair (by design — it's a sane brand-appropriate
 * starting point, not business-specific data). Left untouched, that means
 * every plumbing site that hasn't been manually recoloured renders with
 * identical brand colours, which is exactly the "two plumbing sites
 * shouldn't look identical" problem.
 *
 * This module nudges the *hue* of an industry's primary/accent colours by a
 * small, deterministic, per-business amount — same inputs always produce the
 * same output, so rebuilding a site never reshuffles a client's brand colour.
 * It deliberately:
 *  - only rotates hue, never saturation or lightness, so a "confident navy
 *    blue" industry stays a confident navy blue family, never drifts to
 *    something a business owner wouldn't recognise or approve of;
 *  - bounds the rotation to a narrow arc (±16°) — enough to be a genuinely
 *    different, still-on-brand colour, never a jarring hue flip (e.g. blue
 *    plumbing brand becoming green);
 *  - leaves `secondary` (which drives light/dark background choice in
 *    `site-theme.ts`) untouched, since shifting the base tone is a much
 *    bigger visual decision than a small brand-colour nudge;
 *  - verifies the shifted colour keeps the same light/dark classification
 *    (`isLight`) as the original, so text-contrast decisions made elsewhere
 *    (`onPrimary`/`onAccent` in `site-theme.ts`) never silently break — if a
 *    shift would flip that classification, it falls back to no shift for
 *    that colour rather than risk unreadable text.
 *
 * Pure, deterministic, zero network calls, zero cost — same spirit as
 * site-variation.ts, which this module intentionally does not modify.
 *
 * NOT wired into the generation pipeline by this change. Suggested
 * integration point: wherever a new site's `primaryColor`/`accentColor` are
 * first seeded from `IndustryPlaybook.visual` (before the owner customises
 * them), pass the result through `varyIndustryVisual()`.
 */
import { isLight } from "./site-theme";
import { variationSeed, type VariationFacts } from "./site-variation";

const MAX_HUE_SHIFT_DEGREES = 16;

const hash = (value: string) => {
  let out = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    out ^= value.charCodeAt(i);
    out = Math.imul(out, 16777619) >>> 0;
  }
  return out >>> 0;
};

const HEX = /^#(?:[0-9a-f]{6})$/i;

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    const c = v.toString(16).padStart(2, "0");
    return `#${c}${c}${c}`;
  }
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Deterministically rotates a colour's hue by up to `MAX_HUE_SHIFT_DEGREES`
 * in either direction, seeded by `seed` + `slot`. Falls back to the original
 * colour untouched if it's not a clean 6-digit hex, or if the shift would
 * flip whether the colour reads as light vs dark.
 */
export function varyHue(hex: string, seed: string, slot: string): string {
  if (!HEX.test(hex)) return hex;
  const [h, s, l] = hexToHsl(hex);
  if (s === 0) return hex; // grey — hue is meaningless, never invent one
  const bucket = hash(`${seed}::hue::${slot}`) % (MAX_HUE_SHIFT_DEGREES * 2 + 1);
  const shift = bucket - MAX_HUE_SHIFT_DEGREES;
  if (shift === 0) return hex;
  const shifted = hslToHex(h + shift, s, l);
  return isLight(shifted) === isLight(hex) ? shifted : hex;
}

export type IndustryVisual = {
  primary: string;
  secondary: string;
  accent: string;
  font: string;
  backdrop: string;
};

/**
 * Applies a small, deterministic, business-specific hue nudge to an industry
 * playbook's `primary` and `accent` colours. `secondary` (the background/tone
 * driver), `font` and `backdrop` pass through unchanged.
 */
export function varyIndustryVisual(
  visual: IndustryVisual,
  facts: VariationFacts | string,
): IndustryVisual {
  const seed = typeof facts === "string" ? facts.toLowerCase() : variationSeed(facts);
  return {
    ...visual,
    primary: varyHue(visual.primary, seed, "primary"),
    accent: varyHue(visual.accent, seed, "accent"),
  };
}
