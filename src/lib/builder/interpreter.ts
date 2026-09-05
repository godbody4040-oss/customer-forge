/**
 * REVORA SEMANTIC COMMAND INTERPRETER — plain words in, structured work out.
 *
 * The owner types "make it look more high end and put a call button at the top".
 * This module turns that into a structured request the deterministic builder can
 * execute: which verbs, which parts of the site, which mood, which page.
 *
 * No model, no network, no cost. It never rejects a request: anything it cannot
 * place is returned in `unrecognised` so the caller can decide what to do with
 * the leftovers (Revora hands them to the optional writer, or explains plainly).
 */

import { playbookFor, type IndustryPlaybook } from "./industry";

export type BuilderVerb =
  | "build"
  | "add"
  | "remove"
  | "hide"
  | "show"
  | "rewrite"
  | "restyle"
  | "resize"
  | "reorder"
  | "seo"
  | "cta"
  | "mobile"
  | "fix";

export type StyleMood =
  | "professional"
  | "premium"
  | "minimal"
  | "bold"
  | "friendly"
  | "modern"
  | "dark"
  | "bright";

export type BuilderIntent = {
  /** The owner's words, whitespace-collapsed. Never used as a claim. */
  original: string;
  verbs: BuilderVerb[];
  /** Section kinds the request points at, in the order they were mentioned. */
  sectionKinds: string[];
  /** Pages the request points at, by slug-ish word ("home", "services"...). */
  pageHints: string[];
  /** New pages the owner asked for, as free text ("plumbing services"). */
  newPages: string[];
  moods: StyleMood[];
  /** Industry inferred from the words alone, if any. */
  industry: IndustryPlaybook | null;
  /** Whole-site build/refresh request rather than a single tweak. */
  wholeSite: boolean;
  /** Things this interpreter could not place. */
  unrecognised: string[];
};

const SECTION_WORDS: Record<string, string[]> = {
  hero: ["hero", "banner", "top of the page", "header image", "headline area", "first screen"],
  trust_bar: ["trust bar", "trust strip", "badges", "credentials strip", "logos"],
  intro: ["intro", "introduction", "about us section", "who we are", "welcome"],
  services: ["services", "service list", "what we do", "offerings", "treatments", "menu"],
  pricing: ["pricing", "prices", "price list", "packages", "rates", "cost"],
  quote: ["quote form", "quote request", "estimate form", "request a quote"],
  booking: ["booking", "book online", "appointment", "calendar", "scheduler"],
  reviews: ["reviews", "testimonials", "ratings", "feedback", "what customers say"],
  gallery: ["gallery", "photos", "portfolio", "our work", "before and after", "images"],
  faq: ["faq", "faqs", "questions", "common questions", "q and a"],
  guarantee: ["guarantee", "warranty", "promise"],
  offer: ["offer", "promotion", "deal", "discount", "special"],
  cta: ["cta", "call to action", "closing section", "final push"],
  sticky_cta: ["sticky", "floating button", "sticky bar", "always visible button"],
  area: ["areas", "area served", "service area", "locations", "coverage", "where we work"],
  contact: ["contact", "contact details", "get in touch", "phone number section", "address"],
  process: ["process", "how it works", "steps", "what happens next"],
  benefits: ["benefits", "why choose us", "why us", "reasons"],
  lead_magnet: ["lead magnet", "free guide", "download", "checklist"],
};

const MOOD_WORDS: Record<StyleMood, string[]> = {
  professional: ["professional", "credible", "trustworthy", "serious", "corporate", "legit"],
  premium: ["premium", "high end", "high-end", "luxury", "luxurious", "upmarket", "expensive"],
  minimal: ["minimal", "clean", "simple", "uncluttered", "less busy", "tidy"],
  bold: ["bold", "punchy", "loud", "striking", "aggressive", "stand out", "wow"],
  friendly: ["friendly", "warm", "welcoming", "approachable", "human"],
  modern: ["modern", "fresh", "up to date", "current", "sleek", "contemporary"],
  dark: ["dark", "dark mode", "black", "night"],
  bright: ["bright", "light", "airy", "white", "colourful", "colorful"],
};

const VERB_WORDS: Record<BuilderVerb, string[]> = {
  build: [
    "build me",
    "build a",
    "create a website",
    "make me a",
    "set up a site",
    "new website",
    "whole website",
    "full website",
    "start from scratch",
  ],
  add: ["add", "put", "include", "insert", "create", "i need a", "i want a", "can you add"],
  remove: ["remove", "delete", "get rid of", "take off", "take out", "drop"],
  hide: ["hide", "turn off", "don't show", "dont show", "disable"],
  show: ["show", "turn on", "unhide", "enable", "bring back"],
  rewrite: [
    "rewrite",
    "reword",
    "better words",
    "improve the copy",
    "improve the text",
    "change the text",
    "change the wording",
    "sounds bad",
    "sell better",
    "more persuasive",
    "clearer",
  ],
  restyle: [
    "look",
    "style",
    "design",
    "colours",
    "colors",
    "theme",
    "font",
    "brand",
    "feel",
    "vibe",
    "restyle",
    "redesign",
  ],
  resize: ["bigger", "larger", "smaller", "taller", "shorter", "full screen", "fullscreen"],
  reorder: ["reorder", "move up", "move down", "put first", "put last", "order of", "rearrange"],
  seo: [
    "seo",
    "google",
    "search",
    "rank",
    "ranking",
    "meta",
    "page title",
    "found online",
    "keywords",
  ],
  cta: [
    "call button",
    "book button",
    "booking button",
    "quote button",
    "call to action",
    "cta",
    "get more calls",
    "more leads",
    "more enquiries",
    "more inquiries",
    "convert",
  ],
  mobile: ["mobile", "phone", "responsive", "tablet", "small screen", "on my phone"],
  fix: ["fix", "broken", "not working", "wrong", "error", "typo"],
};

const PAGE_WORDS = [
  "home",
  "homepage",
  "services",
  "about",
  "contact",
  "pricing",
  "gallery",
  "blog",
  "faq",
  "menu",
  "reviews",
  "booking",
];

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const lower = (value: string) => clean(value).toLowerCase();

/** Detects "add a plumbing services page", "make a page for gutter cleaning". */
function readNewPages(text: string): string[] {
  const out: string[] = [];
  const patterns = [
    /(?:add|create|make|build|need|want)\s+(?:me\s+)?(?:a|an|another)?\s*([a-z0-9 &'-]{2,60}?)\s+page/g,
    /\bpage\s+(?:for|about|on)\s+([a-z0-9 &'-]{2,60})/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const label = clean(match[1] ?? "")
        .replace(/\b(new|another|the|my|a|an)\b/g, "")
        .trim();
      if (label.length > 1 && !out.includes(label)) out.push(label);
    }
  }
  return out.slice(0, 6);
}

/**
 * Reads an owner's sentence. Always returns something usable — an empty verb
 * list simply means "nothing specific recognised", never "request refused".
 */
export function interpret(instruction: string): BuilderIntent {
  const original = clean(instruction);
  const text = lower(original);

  const verbs: BuilderVerb[] = [];
  for (const [verb, words] of Object.entries(VERB_WORDS) as [BuilderVerb, string[]][])
    if (words.some((word) => text.includes(word))) verbs.push(verb);

  const sectionKinds: string[] = [];
  for (const [kind, words] of Object.entries(SECTION_WORDS))
    if (words.some((word) => text.includes(word))) sectionKinds.push(kind);

  const moods: StyleMood[] = [];
  for (const [mood, words] of Object.entries(MOOD_WORDS) as [StyleMood, string[]][])
    if (words.some((word) => text.includes(word))) moods.push(mood);

  const pageHints = PAGE_WORDS.filter((page) => new RegExp(`\\b${page}\\b`).test(text));
  const newPages = readNewPages(text);
  const matchedIndustry = playbookFor(original);
  const industry = matchedIndustry.slug === "local_business" ? null : matchedIndustry;

  const wholeSite =
    verbs.includes("build") ||
    /\b(whole|entire|full|everything|all of it|the site|my site|my website)\b/.test(text);

  const unrecognised: string[] = [];
  if (!verbs.length && !sectionKinds.length && !moods.length && !newPages.length)
    unrecognised.push(original);

  return {
    original,
    verbs,
    sectionKinds,
    pageHints,
    newPages,
    moods,
    industry,
    wholeSite,
    unrecognised,
  };
}
