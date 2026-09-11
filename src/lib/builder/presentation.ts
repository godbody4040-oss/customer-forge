/**
 * REVORA PRESENTATION INTELLIGENCE ENGINE
 *
 * Single safety/presentation boundary for generated website content.
 *
 * Goals:
 * - Never render `[object Object]`, null, undefined, NaN, or template debris.
 * - Never turn fake/invalid contact data into clickable links.
 * - Never invent business facts.
 * - Preserve intentional multiline copy.
 * - Normalize places, hours, URLs, counts, and common display values.
 * - Stay deterministic, synchronous, dependency-free, and free-first.
 *
 * This file is intentionally framework-agnostic.
 */

const DISPLAY_KEYS = [
  "label",
  "title",
  "name",
  "text",
  "value",
  "summary",
  "display",
  "description",
  "content",
] as const;

const LEAK_PATTERNS: RegExp[] = [
  /\[object\s+\w+\]/i,
  /\bundefined\b/i,
  /\bnull\b/i,
  /\bNaN\b/i,
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /\blorem ipsum\b/i,
  /\bplaceholder\b/i,
  /\byour\s+(?:business|company|guarantee|logo|text|headline|tagline)\s+here\b/i,
  /\b(?:add|write|insert|enter)\s+your\b/i,
  /\b123\s+main\s+st\b/i,
  /\b555[-.\s]?01\d\d\b/i,
  /\b(?:test|sample|example)@(test|example)\.(com|test)\b/i,
  /\bexample\.com\b/i,
  /\{\{[^}]*\}\}/,
  /\$\{[^}]*\}/,
  /<%[^%]*%>/,
];

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function hasTemplateLeak(value: unknown): boolean {
  if (typeof value !== "string") return false;

  const text = value.trim();

  if (!text) return false;

  return LEAK_PATTERNS.some((pattern) => pattern.test(text));
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(CONTROL_CHARACTERS, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

/**
 * Converts a safe primitive/object display value into visitor-facing text.
 *
 * Objects are inspected through an allow-list of display fields.
 * They are NEVER stringified.
 */
export function safeText(value: unknown, depth = 0): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const clean = normalizeWhitespace(value);

    if (!clean || hasTemplateLeak(clean)) return null;

    return clean;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (typeof value === "bigint") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return null;
  }

  if (depth > 2) return null;

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => safeText(item, depth + 1))
      .filter((item): item is string => Boolean(item));

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

/**
 * Multiline visitor copy.
 *
 * Unlike safeText(), intentional line breaks are retained.
 */
export function safeParagraph(value: unknown): string | null {
  if (typeof value !== "string") {
    return safeText(value);
  }

  const lines = value
    .replace(CONTROL_CHARACTERS, "")
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line && !hasTemplateLeak(line));

  return lines.length ? lines.join("\n") : null;
}

/**
 * Safely converts a list of values into display labels.
 *
 * Useful for services, benefits, navigation items, etc.
 */
export function safeList(
  value: unknown,
  options: {
    maxItems?: number;
    separator?: string;
  } = {},
): string[] {
  const maxItems = Math.max(1, Math.min(options.maxItems ?? 100, 1000));

  const source = Array.isArray(value) ? value : [value];

  const result: string[] = [];

  for (const item of source) {
    const text = safeText(item);

    if (!text) continue;

    if (!result.includes(text)) {
      result.push(text);
    }

    if (result.length >= maxItems) break;
  }

  return result;
}

export function joinSafe(
  values: unknown[],
  separator = ", ",
): string | null {
  const items = values
    .map((value) => safeText(value))
    .filter((value): value is string => Boolean(value));

  return items.length ? items.join(separator) : null;
}

/* ------------------------------------------------------------------ phone */

const digitsOf = (value: string): string => value.replace(/\D/g, "");

function isRepeatedDigits(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

function isObviousFakePhone(digits: string): boolean {
  if (isRepeatedDigits(digits)) return true;

  /*
   * NANP fictional/reserved 555-01xx range.
   */
  if (/^\d{3}55501\d{2}$/.test(digits)) return true;

  /*
   * Common zero filler values.
   */
  if (/^0+$/.test(digits)) return true;

  return false;
}

/**
 * True when a stored phone number is plausible enough to expose publicly.
 *
 * This validates shape, not ownership or existence.
 */
export function isUsablePhone(value: unknown): boolean {
  const raw = typeof value === "string" ? value.trim() : "";

  if (!raw) return false;

  if (/^[a-z\s]+$/i.test(raw)) return false;

  if (hasTemplateLeak(raw)) return false;

  const digits = digitsOf(raw);

  if (isObviousFakePhone(digits)) return false;

  /*
   * International E.164-style numbers.
   */
  if (raw.startsWith("+")) {
    return digits.length >= 11 && digits.length <= 15;
  }

  /*
   * North American 11-digit representation.
   */
  if (digits.length === 11 && digits.startsWith("1")) {
    return true;
  }

  /*
   * North American 10-digit representation.
   */
  if (digits.length === 10) {
    const areaCode = digits.slice(0, 3);

    /*
     * NANP area codes cannot begin with 0 or 1.
     */
    if (/^[01]/.test(areaCode)) return false;

    return true;
  }

  return false;
}

export function phoneDisplay(value: unknown): string | null {
  if (!isUsablePhone(value)) return null;

  const raw = String(value).trim();
  const digits = digitsOf(raw);

  if (raw.startsWith("+")) {
    return `+${digits}`;
  }

  const national =
    digits.length === 11 && digits.startsWith("1")
      ? digits.slice(1)
      : digits;

  if (national.length === 10) {
    return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }

  return raw;
}

export function phoneLink(value: unknown): string | null {
  if (!isUsablePhone(value)) return null;

  const raw = String(value).trim();
  const digits = digitsOf(raw);

  return `tel:${raw.startsWith("+") ? "+" : ""}${digits}`;
}

/* ------------------------------------------------------------------ email */

const EMAIL =
  /^[^\\s@<>\"'`]+@[^\\s@<>\"'`.]+(?:\\.[^\\s@<>\"'`.]+)+$/;

const DISALLOWED_EMAIL_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "test.test",
  "localhost",
]);

export function isUsableEmail(value: unknown): boolean {
  const raw = typeof value === "string" ? value.trim() : "";

  if (!raw) return false;

  if (hasTemplateLeak(raw)) return false;

  if (!EMAIL.test(raw)) return false;

  const parts = raw.toLowerCase().split("@");

  if (parts.length !== 2) return false;

  const domain = parts[1];

  if (DISALLOWED_EMAIL_DOMAINS.has(domain)) return false;

  if (!/\.[a-z]{2,}$/i.test(domain)) return false;

  return true;
}

export function emailDisplay(value: unknown): string | null {
  if (!isUsableEmail(value)) return null;

  return String(value).trim().toLowerCase();
}

export function emailLink(value: unknown): string | null {
  const email = emailDisplay(value);

  return email ? `mailto:${email}` : null;
}

/* ------------------------------------------------------------------ places */

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "de",
  "for",
  "in",
  "la",
  "of",
  "on",
  "or",
  "the",
  "to",
  "via",
]);

const US_STATE_CODES = new Set([
  "al",
  "ak",
  "az",
  "ar",
  "ca",
  "co",
  "ct",
  "de",
  "fl",
  "ga",
  "hi",
  "id",
  "il",
  "in",
  "ia",
  "ks",
  "ky",
  "la",
  "me",
  "md",
  "ma",
  "mi",
  "mn",
  "ms",
  "mo",
  "mt",
  "ne",
  "nv",
  "nh",
  "nj",
  "nm",
  "ny",
  "nc",
  "nd",
  "oh",
  "ok",
  "or",
  "pa",
  "ri",
  "sc",
  "sd",
  "tn",
  "tx",
  "ut",
  "vt",
  "va",
  "wa",
  "wv",
  "wi",
  "wy",
  "dc",
]);

const titleWord = (word: string, index: number): string => {
  const lower = word.toLowerCase();

  if (US_STATE_CODES.has(lower) && word.length === 2) {
    return lower.toUpperCase();
  }

  if (index > 0 && SMALL_WORDS.has(lower)) {
    return lower;
  }

  return lower.replace(
    /(^|[-'’])([a-z])/g,
    (_match, separator: string, character: string) =>
      `${separator}${character.toUpperCase()}`,
  );
};

export function placeDisplay(value: unknown): string | null {
  const text = safeText(value);

  if (!text) return null;

  return text
    .split(",")
    .map((part) =>
      part
        .trim()
        .split(/\s+/)
        .map(titleWord)
        .join(" "),
    )
    .filter(Boolean)
    .join(", ");
}

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

  const region = [state, zip].filter(Boolean).join(" ").trim();

  const locality = [city, region]
    .filter(Boolean)
    .join(", ")
    .trim();

  const result = [street, locality]
    .filter(Boolean)
    .join(", ")
    .trim();

  return result || null;
}

/* ------------------------------------------------------------------- hours */

const DAY_ORDER = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

const DAY_LABEL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function dayKey(key: string): string | null {
  const normalized = key.trim().toLowerCase();

  const aliases: Record<string, string> = {
    mon: "mon",
    monday: "mon",
    tue: "tue",
    tues: "tue",
    tuesday: "tue",
    wed: "wed",
    weds: "wed",
    wednesday: "wed",
    thu: "thu",
    thur: "thu",
    thurs: "thu",
    thursday: "thu",
    fri: "fri",
    friday: "fri",
    sat: "sat",
    saturday: "sat",
    sun: "sun",
    sunday: "sun",
  };

  return aliases[normalized] ?? null;
}

function hoursEntry(value: unknown): string | null {
  if (typeof value === "string") {
    return safeText(value);
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return safeText(value);
  }

  const record = value as Record<string, unknown>;

  return (
    safeText(record.hours) ??
    safeText(record.open) ??
    safeText(record.time) ??
    safeText(record.value) ??
    safeText(record.label) ??
    safeText(record.text)
  );
}

export function hoursDisplay(value: unknown): string | null {
  if (typeof value === "string") {
    return safeText(value);
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return safeText(value);
  }

  const record = value as Record<string, unknown>;

  const entries = Object.entries(record)
    .map(([key, rawHours]) => ({
      key: dayKey(key),
      hours: hoursEntry(rawHours),
    }))
    .filter(
      (
        entry,
      ): entry is {
        key: string;
        hours: string;
      } => Boolean(entry.key && entry.hours),
    )
    .sort(
      (a, b) =>
        DAY_ORDER.indexOf(a.key as (typeof DAY_ORDER)[number]) -
        DAY_ORDER.indexOf(b.key as (typeof DAY_ORDER)[number]),
    );

  if (entries.length) {
    return entries
      .map(
        (entry) =>
          `${DAY_LABEL[entry.key]}: ${entry.hours}`,
      )
      .join("\n");
  }

  const summary =
    safeText(record.summary) ??
    safeText(record.text) ??
    safeText(record.label) ??
    safeText(record.description);

  if (!summary) return null;

  /*
   * A bare number such as "24" is almost certainly malformed data.
   */
  if (/^\d{1,2}$/.test(summary)) {
    return null;
  }

  return summary;
}

/* ------------------------------------------------------------------- links */

function hasDangerousProtocol(value: string): boolean {
  return /^(?:javascript|data|vbscript|file|blob):/i.test(value);
}

/**
 * Returns only absolute HTTP(S) URLs.
 */
export function externalUrl(value: unknown): string | null {
  const text = safeText(value);

  if (!text) return null;

  if (hasDangerousProtocol(text)) return null;

  try {
    const url = new URL(text);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Normalizes an internal site path.
 *
 * Only local paths are accepted.
 */
export function internalPath(value: unknown): string | null {
  const text = safeText(value);

  if (!text) return null;

  if (!text.startsWith("/")) return null;

  if (text.startsWith("//")) return null;

  if (hasDangerousProtocol(text)) return null;

  return text;
}

/**
 * Safe CTA destination.
 *
 * Supports:
 * - internal paths
 * - http(s) URLs
 * - tel:
 * - mailto:
 */
export function actionTarget(value: unknown): string | null {
  const text = safeText(value);

  if (!text) return null;

  const local = internalPath(text);

  if (local) return local;

  const external = externalUrl(text);

  if (external) return external;

  const phone = phoneLink(text);

  if (phone) return phone;

  const email = emailLink(text);

  if (email) return email;

  return null;
}

/* ------------------------------------------------------------------- counts */

export function positiveCount(value: unknown): number | null {
  const number =
    typeof value === "number"
      ? value
      : Number(safeText(value) ?? "");

  if (!Number.isFinite(number)) return null;

  if (number <= 0) return null;

  return Math.floor(number);
}

export function yearsDisplay(value: unknown): string | null {
  const years = positiveCount(value);

  if (!years) return null;

  /*
   * A calendar year such as 2022 must never become "2022 years".
   */
  if (years > 150) return null;

  return `${years} year${years === 1 ? "" : "s"}`;
}

export function countDisplay(
  value: unknown,
  singular: string,
  plural = `${singular}s`,
): string | null {
  const count = positiveCount(value);

  if (count === null) return null;

  return `${count} ${count === 1 ? singular : plural}`;
}

/* ------------------------------------------------------------------ ratings */

export function ratingDisplay(
  value: unknown,
  options: {
    min?: number;
    max?: number;
    decimals?: number;
  } = {},
): string | null {
  const number =
    typeof value === "number"
      ? value
      : Number(safeText(value) ?? "");

  if (!Number.isFinite(number)) return null;

  const min = options.min ?? 0;
  const max = options.max ?? 5;

  if (number < min || number > max) return null;

  const decimals = Math.max(
    0,
    Math.min(2, Math.floor(options.decimals ?? 1)),
  );

  return number.toFixed(decimals);
}

/* -------------------------------------------------------------------- dates */

/**
 * Converts a valid date-like value into a readable date without inventing
 * timezone-sensitive business facts.
 */
export function dateDisplay(
  value: unknown,
  locale = "en-US",
): string | null {
  const text = safeText(value);

  if (!text) return null;

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return null;

  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------- media */

/**
 * Safe image URL.
 *
 * Data URLs and arbitrary executable protocols are rejected.
 */
export function imageUrl(value: unknown): string | null {
  return externalUrl(value);
}

/**
 * Safe image alt text.
 *
 * Decorative images should explicitly pass an empty string elsewhere rather
 * than having this helper invent an accessibility label.
 */
export function imageAlt(value: unknown): string | null {
  return safeText(value);
}

/* ------------------------------------------------------------------- labels */

/**
 * Creates a readable fallback label from known text only.
 *
 * This function intentionally does NOT generate marketing claims.
 */
export function readableLabel(
  value: unknown,
  fallback: string | null = null,
): string | null {
  return safeText(value) ?? safeText(fallback);
}

/**
 * Prevents accidental rendering of raw IDs as visitor-facing labels.
 */
export function displayId(
  value: unknown,
  fallback: string | null = null,
): string | null {
  const text = safeText(value);

  if (!text) return safeText(fallback);

  /*
   * UUIDs and long machine identifiers are not useful visitor copy.
   */
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      text,
    )
  ) {
    return safeText(fallback);
  }

  if (/^[A-Za-z0-9_-]{24,}$/.test(text)) {
    return safeText(fallback);
  }

  return text;
}

/* ------------------------------------------------------------------ generic */

export interface PresentationContact {
  phone: string | null;
  phoneLink: string | null;
  email: string | null;
  emailLink: string | null;
}

export interface PresentationLocation {
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  fullAddress: string | null;
}

export interface PresentationResult {
  text: string | null;
  paragraph: string | null;
  contact: PresentationContact;
  location: PresentationLocation;
  url: string | null;
}

/**
 * Central normalization helper for generated business content.
 *
 * It is intentionally conservative: unknown values become null instead of
 * being guessed.
 */
export function presentBusinessValue(input: {
  text?: unknown;
  paragraph?: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  city?: unknown;
  state?: unknown;
  zip?: unknown;
  url?: unknown;
}): PresentationResult {
  const phone = phoneDisplay(input.phone);
  const email = emailDisplay(input.email);

  const city = placeDisplay(input.city);
  const state = placeDisplay(input.state);
  const zip = safeText(input.zip);

  return {
    text: safeText(input.text),
    paragraph: safeParagraph(input.paragraph),
    contact: {
      phone,
      phoneLink: phone ? phoneLink(input.phone) : null,
      email,
      emailLink: email ? emailLink(input.email) : null,
    },
    location: {
      address: safeText(input.address),
      city,
      state,
      zip,
      fullAddress: addressDisplay({
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
      }),
    },
    url: externalUrl(input.url),
  };
}

/**
 * Final visitor-facing guard.
 *
 * Use immediately before rendering generated copy.
 */
export function visitorText(
  value: unknown,
  fallback: unknown = null,
): string | null {
  return safeText(value) ?? safeText(fallback);
}

/**
 * Returns true when a value is safe to render as ordinary visitor-facing text.
 */
export function isPresentableText(value: unknown): boolean {
  return safeText(value) !== null;
}

/**
 * Returns true when a value should be hidden rather than rendered.
 */
export function shouldHideValue(value: unknown): boolean {
  return safeText(value) === null;
}