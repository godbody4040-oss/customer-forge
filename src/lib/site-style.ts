/**
 * Safe, block-level visual styling for builder sections, items and buttons.
 *
 * Every value is validated against a closed allow-list (or a strict hex colour
 * / safe URL pattern) before it becomes CSS, so a client can style their site
 * freely without ever being able to inject markup, scripts or arbitrary CSS.
 * Styles live inside the existing `settings` JSONB column, which means they
 * persist, autosave, undo/redo and publish through the normal content path.
 */
import { safeLinkUrl } from "@/lib/website-content";

export const FONT_FAMILIES = ["inherit", "display", "sans", "serif", "mono"] as const;
export const TEXT_SIZES = ["sm", "base", "lg", "xl", "2xl"] as const;
export const FONT_WEIGHTS = ["normal", "medium", "semibold", "bold"] as const;
export const ALIGNMENTS = ["left", "center", "right"] as const;
export const LINE_HEIGHTS = ["tight", "normal", "relaxed"] as const;
export const SPACING = ["none", "sm", "md", "lg", "xl"] as const;
export const OBJECT_FITS = ["cover", "contain", "fill"] as const;
export const BUTTON_STYLES = ["solid", "outline", "ghost", "link"] as const;
export const BUTTON_SIZES = ["sm", "md", "lg"] as const;
export const LAYOUTS = ["stack", "two", "three", "grid"] as const;

export type BlockStyle = {
  font: (typeof FONT_FAMILIES)[number];
  size: (typeof TEXT_SIZES)[number];
  weight: (typeof FONT_WEIGHTS)[number];
  align: (typeof ALIGNMENTS)[number];
  lineHeight: (typeof LINE_HEIGHTS)[number];
  textColor: string | null;
  bgColor: string | null;
  bgImage: string | null;
  padding: (typeof SPACING)[number];
  objectFit: (typeof OBJECT_FITS)[number];
  buttonStyle: (typeof BUTTON_STYLES)[number];
  buttonSize: (typeof BUTTON_SIZES)[number];
  buttonTextColor: string | null;
  buttonBgColor: string | null;
  layout: (typeof LAYOUTS)[number];
};

export const DEFAULT_BLOCK_STYLE: BlockStyle = {
  font: "inherit",
  size: "base",
  weight: "normal",
  align: "left",
  lineHeight: "normal",
  textColor: null,
  bgColor: null,
  bgImage: null,
  padding: "md",
  objectFit: "cover",
  buttonStyle: "solid",
  buttonSize: "md",
  buttonTextColor: null,
  buttonBgColor: null,
  layout: "stack",
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Only strict 3/6-digit hex colours become CSS — nothing else is trusted. */
export function safeColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return HEX.test(trimmed) ? trimmed.toLowerCase() : null;
}

/** Background images must be safe http(s) URLs (or an internal path). */
export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = safeLinkUrl(value);
  if (!url) return null;
  if (/^(https?:\/\/|\/)/i.test(url)) return url;
  return null;
}

function pick<T extends readonly string[]>(
  allowed: T,
  value: unknown,
  fallback: T[number],
): T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;
}

/** Reads a validated style out of an arbitrary `settings` JSONB value. */
export function readBlockStyle(settings: unknown): BlockStyle {
  const raw =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? ((settings as Record<string, unknown>)["style"] as Record<string, unknown> | undefined)
      : undefined;
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    font: pick(FONT_FAMILIES, s["font"], DEFAULT_BLOCK_STYLE.font),
    size: pick(TEXT_SIZES, s["size"], DEFAULT_BLOCK_STYLE.size),
    weight: pick(FONT_WEIGHTS, s["weight"], DEFAULT_BLOCK_STYLE.weight),
    align: pick(ALIGNMENTS, s["align"], DEFAULT_BLOCK_STYLE.align),
    lineHeight: pick(LINE_HEIGHTS, s["lineHeight"], DEFAULT_BLOCK_STYLE.lineHeight),
    textColor: safeColor(s["textColor"]),
    bgColor: safeColor(s["bgColor"]),
    bgImage: safeImageUrl(s["bgImage"]),
    padding: pick(SPACING, s["padding"], DEFAULT_BLOCK_STYLE.padding),
    objectFit: pick(OBJECT_FITS, s["objectFit"], DEFAULT_BLOCK_STYLE.objectFit),
    buttonStyle: pick(BUTTON_STYLES, s["buttonStyle"], DEFAULT_BLOCK_STYLE.buttonStyle),
    buttonSize: pick(BUTTON_SIZES, s["buttonSize"], DEFAULT_BLOCK_STYLE.buttonSize),
    buttonTextColor: safeColor(s["buttonTextColor"]),
    buttonBgColor: safeColor(s["buttonBgColor"]),
    layout: pick(LAYOUTS, s["layout"], DEFAULT_BLOCK_STYLE.layout),
  };
}

/** Merges a partial style change back into `settings`, dropping unsafe values. */
export function writeBlockStyle(
  settings: unknown,
  patch: Partial<BlockStyle>,
): Record<string, unknown> {
  const base =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? { ...(settings as Record<string, unknown>) }
      : {};
  const merged = readBlockStyle({ style: { ...readBlockStyle(settings), ...patch } });
  base["style"] = merged;
  return base;
}

const SIZE_CLASS: Record<BlockStyle["size"], string> = {
  sm: "text-[12px]",
  base: "text-[14px]",
  lg: "text-[17px]",
  xl: "text-[21px]",
  "2xl": "text-[26px]",
};

const WEIGHT_CLASS: Record<BlockStyle["weight"], string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const ALIGN_CLASS: Record<BlockStyle["align"], string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const LEADING_CLASS: Record<BlockStyle["lineHeight"], string> = {
  tight: "leading-tight",
  normal: "leading-normal",
  relaxed: "leading-relaxed",
};

const FONT_CLASS: Record<BlockStyle["font"], string> = {
  inherit: "",
  display: "font-display",
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

const PAD_CLASS: Record<BlockStyle["padding"], string> = {
  none: "p-0",
  sm: "p-2",
  md: "p-4",
  lg: "p-6",
  xl: "p-10",
};

export const LAYOUT_CLASS: Record<BlockStyle["layout"], string> = {
  stack: "grid-cols-1",
  two: "sm:grid-cols-2",
  three: "sm:grid-cols-3",
  grid: "sm:grid-cols-2 lg:grid-cols-4",
};

/** Tailwind classes for the text-facing part of a style. */
export function textClasses(style: BlockStyle): string {
  return [
    FONT_CLASS[style.font],
    SIZE_CLASS[style.size],
    WEIGHT_CLASS[style.weight],
    ALIGN_CLASS[style.align],
    LEADING_CLASS[style.lineHeight],
  ]
    .filter(Boolean)
    .join(" ");
}

export function paddingClass(style: BlockStyle): string {
  return PAD_CLASS[style.padding];
}

/** Inline CSS for colours and background image — all values pre-validated. */
export function blockCss(style: BlockStyle): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (style.textColor) css.color = style.textColor;
  if (style.bgColor) css.backgroundColor = style.bgColor;
  if (style.bgImage) {
    css.backgroundImage = `url("${encodeURI(style.bgImage).replace(/"/g, "%22")}")`;
    css.backgroundSize = "cover";
    css.backgroundPosition = "center";
  }
  return css;
}

export function buttonCss(style: BlockStyle): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (style.buttonTextColor) css.color = style.buttonTextColor;
  if (style.buttonBgColor && style.buttonStyle === "solid")
    css.backgroundColor = style.buttonBgColor;
  if (style.buttonBgColor && style.buttonStyle === "outline")
    css.borderColor = style.buttonBgColor;
  return css;
}

export function buttonClasses(style: BlockStyle): string {
  const size =
    style.buttonSize === "sm"
      ? "px-3 py-1.5 text-[12px]"
      : style.buttonSize === "lg"
        ? "px-6 py-3 text-[15px]"
        : "px-4 py-2 text-[13px]";
  const look =
    style.buttonStyle === "outline"
      ? "border border-primary text-primary"
      : style.buttonStyle === "ghost"
        ? "text-primary hover:bg-primary/10"
        : style.buttonStyle === "link"
          ? "text-primary underline underline-offset-4"
          : "bg-primary text-primary-foreground";
  return `inline-flex items-center justify-center rounded-md font-medium ${size} ${look}`;
}
