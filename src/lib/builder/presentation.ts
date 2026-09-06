/**
 * REVORA PRESENTATION LAYER — nothing unsafe ever reaches a visitor.
 *
 * Every visitor-facing string on a generated website passes through here first.
 * The rules are deliberate and boring:
 *
 *  - an object is NEVER stringified (that is where `[object Object]` came from);
 *    a known display field is used, otherwise the value is dropped
 *  - `undefined`, `null`, `NaN`, empty strings and template leftovers become
 *    "missing", so the caller can omit the block instead of rendering junk
 *  - contact details are validated before they can become a `tel:`/`mailto:`
 *    link, and formatted for humans when they are valid
 *  - places are title-cased ("new york" -> "New York") without inventing data
 *
 * Pure functions. No model, no network, no cost.
 */

/** Display fields we can safely lift off an object without guessing meaning. */
const DISPLAY_KEYS = ["label", "title", "name", "text", "value", "summary", "display"] as const;

/** Strings that are template scaffolding or debug output, never real copy. */
const LEAK_PATTERNS: RegExp[] = [
  /\[object\s+\w+\]/i,
  /\bundefined\b/,
  /\bnull\b/,
  /\bNaN\b/,
  /\bTODO\b/,
  /\bFIXME\b/,
  /\blorem ipsum\b/i,
  /\bplaceholder\b/i,
  /\byour (?:business|company|guarantee|logo|text|headline|tagline) here\b/i,
  /\b(?:add|write|insert|enter) your\b/i,
  /\b123 main st/i,
  /\b555-01\d\d\b/,
  /\b(?:test|sample|example)@(?:test|example)\.(?:com|test)\b/i,
  /\bexample\.com\b/i,
  /\{\{[^}]*\}\}/,
  /\$\{[^}]*\}/,
  /<%[^%]*%>/,
];

/** True when a piece of copy contains template scaffolding or debug output. */
export function hasTemplateLeak(value: unknown): boolean {
  const text = typeof value === "string" ? value : "";
  if (!text.trim()) return false;
  return LEAK_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * The single entry point for text. Returns a clean string, or `null` when there
 * is nothing safe to show. Objects are inspected, never stringified.
 */
export function safeText(value: unknown, depth = 0): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const clean = value.replace(/\s+/g, " ").trim();
    if (!clean) return null;
    return hasTemplateLeak(clean) ? null : clean;
  }
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean") return null;
  if (depth > 2) return null;
  if (Array.isArray(value)) {
    const parts = value.map((item) => safeText(item, depth + 1)).filter((v): v is string => !!v);
    return parts.length ? parts.join(", ") : null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of DISPLAY_KEYS) {
      const candidate = safeText(record[key], depth + 1);
      if (candidate) return candidate;
    }
    return null;
  }
  return null;
}

/** Multi-line copy: keeps intentional line breaks, drops leaked scaffolding. */
export function safeParagraph(value: unknown): string | null {
  if (typeof value !== "string") return safeText(value);
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !hasTemplateLeak(line));
  return lines.length ? lines.join("\n") : null;
}

/* ------------------------------------------------------------------ phone */

const digitsOf = (value: string) => value.replace(/\D/g, "");

/**
 * A phone number is only usable when it has a plausible number of digits and is
 * not an obvious filler value. `96226620` (8 digits, no country context) and
 * `555-0100` style numbers never become clickable.
 */
export function isUsablePhone(value: unknown): boolean {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return false;
  if (/^[a-z\s]+$/i.test(raw)) return false;
  const digits = digitsOf(raw);
  if (raw.startsWith("+")) return digits.length >= 11 && digits.length <= 15;
  if (digits.length === 11 && digits.startsWith("1")) return true;
  if (digits.length !== 10) return false;
  // Reserved fictional ranges (555-01xx) and repeated digits are not real.
  if (/^\d{3}555\d{4}$/.test(digits)) return false;
  if (/^(\d)\1{9}$/.test(digits)) return false;
  return true;
}

/** Human-readable phone, or `null` when the stored value isn't usable. */
export function phoneDisplay(value: unknown): string | null {
  if (!isUsablePhone(value)) return null;
  const raw = String(value).trim();
  const digits = digitsOf(raw);
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (!raw.startsWith("+") && national.length === 10) {
    return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }
  if (raw.startsWith("+")) return `+${digits}`;
  return raw;
}

/** `tel:` target, or `null` — an unusable number must never become a link. */
export function phoneLink(value: unknown): string | null {
  if (!isUsablePhone(value)) return null;
  const raw = String(value).trim();
  const digits = digitsOf(raw);
  return `tel:${raw.startsWith("+") ? "+" : ""}${digits}`;
}

/* ------------------------------------------------------------------ email */

const EMAIL = /^[^\s@<>"'`]+@[^\s@<>"'`.]+(?:\.[^\s@<>"'`.]+)+$/;

/** True only for a syntactically valid, non-placeholder address. */
export function isUsableEmail(value: unknown): boolean {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || !EMAIL.test(raw)) return false;
  if (hasTemplateLeak(raw)) return false;
  return /\.[a-z]{2,}$/i.test(raw);
}

/** The address to show, or `null`. Gibberish like `uauauauuwwuu` is dropped. */
export function emailDisplay(value: unknown): string | null {
  return isUsableEmail(value) ? String(value).trim().toLowerCase() : null;
}

/** `mailto:` target, or `null` when the stored value isn't a real address. */
export function emailLink(value: unknown): string | null {
  const email = emailDisplay(value);
  return email ? `mailto:${email}` : null;
}

/* ------------------------------------------------------------------ places */

const SMALL_WORDS = new Set(["and", "of", "the", "de", "la"]);
const US_STATE_CODES = new Set([
  "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in","ia","ks","ky","la","me",
  "md","ma","mi","mn","ms","mo","mt","ne","nv","nh","nj","nm","ny","nc","nd","oh","ok","or","pa",
  "ri","sc","sd","tn","tx","ut","vt","va","wa","wv","wi","wy","dc",
]);

const titleWord = (word: string, index: number): string => {
  const lower = word.toLowerCase();
  if (index > 0 && SMALL_WORDS.has(lower)) return lower;
  if (US_STATE_CODES.has(lower) && word.length === 2) return lower.toUpperCase();
  return lower.replace(/(^|[-'’])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
};

/**
 * Cleans a city / state / service-area string: `new york` -> `New York`,
 * `Raleigh, nc` -> `Raleigh, NC`. Never invents or removes a location.
 */
export function placeDisplay(value: unknown): string | null {
  const text = safeText(value);
  if (!text) return null;
  return text
    .split(",")
    .map((part) =>
      part
        .trim()
        .split(/\s+/)
        .map((word, index) => titleWord(word, index))
        .join(" "),
    )
    .filter(Boolean)
    .join(", ");
}

/** A single formatted postal address line, or `null` when nothing is known. */
export function addressDisplay(parts: {
  address?: unknown;
  city?: unknown;
  state?: unknown;
  zip?: unknown;
}): string | null {
  const street = safeText(parts.address);
  const city = placeDisplay(parts.city);
  const state = placeDisplay(parts.state);
  const zip = safeText(parts.zip);
  const tail = [city, [state, zip].filter(Boolean).join(" ").trim() || null]
    .filter(Boolean)
    .join(", ");
  const line = [street, tail].filter(Boolean).join(", ");
  return line || null;
}

/* ------------------------------------------------------------------- hours */

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABEL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const dayKey = (key: string): string | null => {
  const lower = key.trim().toLowerCase().slice(0, 3);
  return DAY_ORDER.includes(lower as (typeof DAY_ORDER)[number]) ? lower : null;
};

/**
 * Business hours are stored as JSON: sometimes a free-text `{ summary }`,
 * sometimes a day map. Returns readable lines, or `null` when there is nothing
 * real to show — so the caller hides the block instead of printing an object.
 */
export function hoursDisplay(value: unknown): string | null {
  if (typeof value === "string") return safeText(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return safeText(value);
  const record = value as Record<string, unknown>;

  const days = Object.entries(record)
    .map(([key, hours]) => ({ key: dayKey(key), hours: safeText(hours) }))
    .filter((entry): entry is { key: string; hours: string } => !!entry.key && !!entry.hours)
    .sort((a, b) => DAY_ORDER.indexOf(a.key as never) - DAY_ORDER.indexOf(b.key as never));

  if (days.length) {
    return days.map((day) => `${DAY_LABEL[day.key]}: ${day.hours}`).join("\n");
  }

  const summary = safeText(record["summary"] ?? record["text"] ?? record["label"]);
  if (!summary) return null;
  // "24" on its own is not readable business hours; "24 hours" is.
  if (/^\d{1,2}$/.test(summary)) return null;
  return summary;
}

/* ------------------------------------------------------------------- links */

/** An outbound URL only when it is a real absolute http(s) address. */
export function externalUrl(value: unknown): string | null {
  const text = safeText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Positive whole counts only — never `0 years` or `NaN years`. */
export function yearsDisplay(value: unknown): string | null {
  const years = typeof value === "number" ? value : Number(safeText(value) ?? "");
  if (!Number.isFinite(years) || years < 1) return null;
  const whole = Math.floor(years);
  // A stored calendar year (2022) is not a duration — never claim "2022 years".
  if (whole > 150) return null;
  return `${whole} year${whole === 1 ? "" : "s"}`;
}
