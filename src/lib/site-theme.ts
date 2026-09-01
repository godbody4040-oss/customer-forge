/**
 * Published-site theming (pure layer).
 *
 * Client websites are rendered with the same token-based design system as the
 * app, so a tenant's chosen brand colours are applied by overriding the CSS
 * variables on the site's outermost element — never by hardcoding colours in
 * components.
 *
 * This is what lets one client have a black-and-gold site, another a clean white
 * site and another a deep blue one, from the same components. The surface
 * colour decides whether the site renders in a light or dark scheme, so text
 * contrast stays readable either way.
 */

import type { CSSProperties } from "react";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const clean = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return HEX.test(trimmed) ? trimmed : null;
};

const expand = (hex: string) =>
  hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex.toLowerCase();

const channels = (hex: string): [number, number, number] => {
  const full = expand(hex);
  return [
    parseInt(full.slice(1, 3), 16) / 255,
    parseInt(full.slice(3, 5), 16) / 255,
    parseInt(full.slice(5, 7), 16) / 255,
  ];
};

const lin = (channel: number) =>
  channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Whether text on this colour should be dark. */
export const isLight = (hex: string) => luminance(hex) > 0.45;

/** "light" when the site's surface colour is pale — used for copy and UI tone. */
export function siteTone(secondaryColor: string | null | undefined): "light" | "dark" {
  const surface = clean(secondaryColor);
  return surface && isLight(surface) ? "light" : "dark";
}

const mix = (a: string, b: string, percent: number) =>
  `color-mix(in oklab, ${a} ${Math.round(percent)}%, ${b})`;

/**
 * CSS variable overrides for a tenant's website. Returns `undefined` when the
 * client has not chosen colours, so the default Revora dark/gold identity is
 * used untouched.
 */
export function siteThemeStyle(input: {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
}): CSSProperties | undefined {
  const primary = clean(input.primaryColor);
  const surface = clean(input.secondaryColor);
  const accent = clean(input.accentColor) ?? primary;
  if (!primary && !surface) return undefined;

  const background = surface ?? "#141416";
  const light = isLight(background);
  const ink = light ? "#101114" : "#f7f7f8";
  const onPrimary = primary && isLight(primary) ? "#101114" : "#ffffff";
  const onAccent = accent && isLight(accent) ? "#101114" : "#ffffff";
  const step = (percent: number) => mix(light ? "#000000" : "#ffffff", background, percent);

  const vars: Record<string, string> = {
    "--background": background,
    "--foreground": ink,
    "--card": step(light ? 3 : 5),
    "--card-foreground": ink,
    "--elevated": step(light ? 5 : 8),
    "--popover": step(light ? 4 : 7),
    "--popover-foreground": ink,
    "--secondary": step(light ? 5 : 8),
    "--secondary-foreground": ink,
    "--muted": step(light ? 5 : 8),
    "--muted-foreground": mix(ink, background, 62),
    "--border": step(light ? 12 : 14),
    "--input": step(light ? 12 : 14),
    "--sidebar": step(light ? 2 : 3),
  };

  if (primary) {
    vars["--primary"] = primary;
    vars["--primary-foreground"] = onPrimary;
    vars["--ring"] = primary;
    vars["--gold"] = primary;
    vars["--gold-deep"] = mix("#000000", primary, 18);
    vars["--chart-1"] = primary;
  }
  if (accent) {
    vars["--accent"] = accent;
    vars["--accent-foreground"] = onAccent;
    vars["--gold-soft"] = accent;
    vars["--chart-2"] = accent;
  }

  return vars as CSSProperties;
}
