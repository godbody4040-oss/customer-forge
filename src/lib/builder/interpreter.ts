/**
 * REVORA MASTER BUILDER INTERPRETER
 * =================================
 *
 * Natural-language understanding layer for the Revora free-first builder.
 *
 * Design goals:
 * - Understand normal business-owner language.
 * - Handle typos and conversational phrasing through normalize.ts.
 * - Preserve multi-action requests.
 * - Distinguish targeted edits from true site-wide requests.
 * - Detect pages, sections, goals, style direction and constraints.
 * - Carry context from previous builder messages.
 * - Never invent business facts.
 * - Remain deterministic and dependency-light.
 * - Avoid destructive interpretations.
 *
 * IMPORTANT:
 * This file is an interpreter only.
 * It does not mutate the site.
 * It produces structured intent for the planner/execution layer.
 */

import {
  playbookFor,
  type IndustryPlaybook,
} from "./industry";

import { normalise } from "./normalize";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

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
  | "hierarchy"
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

export type BuilderGoal =
  | "launch"
  | "redesign"
  | "conversion"
  | "leads"
  | "booking"
  | "calls"
  | "seo"
  | "local_seo"
  | "trust"
  | "speed"
  | "mobile"
  | "visual";

export type BuilderConstraint =
  | "keep_facts"
  | "no_invention"
  | "mobile_first"
  | "fast"
  | "accessible"
  | "simple"
  | "free_engine";

export type BuilderOperation = {
  raw: string;
  verbs: BuilderVerb[];
  sectionKinds: string[];
  moods: StyleMood[];
  goals: BuilderGoal[];
  constraints: BuilderConstraint[];
};

export type BuilderIntent = {
  original: string;

  verbs: BuilderVerb[];

  sectionKinds: string[];

  operations: BuilderOperation[];

  pageHints: string[];

  newPages: string[];

  moods: StyleMood[];

  goals: BuilderGoal[];

  constraints: BuilderConstraint[];

  industry: IndustryPlaybook | null;

  wholeSite: boolean;

  everyPage: boolean;

  keepFacts: boolean;

  carried: string | null;

  locationHint: string | null;

  audienceHint: string | null;

  visualIntensity: 0 | 1 | 2 | 3;

  unrecognised: string[];
};

/* -------------------------------------------------------------------------- */
/* VOCABULARY                                                                 */
/* -------------------------------------------------------------------------- */

const SECTION_WORDS: Record<string, string[]> = {
  hero: [
    "hero",
    "banner",
    "header",
    "headline",
    "headline area",
    "main heading",
    "main title",
    "top section",
    "top area",
    "first screen",
    "above the fold",
  ],

  trust_bar: [
    "trust bar",
    "trust strip",
    "trust section",
    "badges",
    "credentials",
    "certifications",
    "licenses",
    "licensed",
    "insured",
    "awards",
    "logos",
  ],

  intro: [
    "intro",
    "introduction",
    "about",
    "about us",
    "who we are",
    "welcome",
    "our story",
    "team",
  ],

  services: [
    "services",
    "service list",
    "service section",
    "what we do",
    "offerings",
    "solutions",
    "treatments",
    "menu",
  ],

  pricing: [
    "pricing",
    "prices",
    "price list",
    "pricing section",
    "packages",
    "rates",
    "cost",
    "costs",
    "financing",
    "payment plans",
    "payment options",
  ],

  quote: [
    "quote",
    "quote form",
    "quote request",
    "estimate",
    "estimate form",
    "estimate request",
    "request a quote",
    "request an estimate",
  ],

  booking: [
    "booking",
    "book online",
    "book now",
    "appointment",
    "appointments",
    "calendar",
    "scheduler",
    "schedule",
  ],

  reviews: [
    "reviews",
    "review section",
    "testimonials",
    "ratings",
    "feedback",
    "what customers say",
    "social proof",
    "five star",
    "5 star",
  ],

  gallery: [
    "gallery",
    "photo gallery",
    "photos",
    "portfolio",
    "our work",
    "before and after",
    "images",
    "projects",
  ],

  faq: [
    "faq",
    "faqs",
    "frequently asked questions",
    "questions",
    "common questions",
    "q and a",
  ],

  guarantee: [
    "guarantee",
    "warranty",
    "promise",
    "guaranteed",
  ],

  offer: [
    "offer",
    "special offer",
    "promotion",
    "deal",
    "discount",
    "special",
    "sale",
  ],

  cta: [
    "cta",
    "call to action",
    "closing section",
    "final section",
    "final push",
  ],

  sticky_cta: [
    "sticky",
    "sticky button",
    "sticky bar",
    "floating button",
    "floating cta",
    "always visible button",
    "bottom bar",
  ],

  area: [
    "areas",
    "area served",
    "areas served",
    "service area",
    "service areas",
    "locations",
    "coverage",
    "where we work",
    "neighborhoods",
    "towns we serve",
    "cities we serve",
  ],

  contact: [
    "contact",
    "contact section",
    "contact details",
    "get in touch",
    "address",
    "contact information",
  ],

  process: [
    "process",
    "how it works",
    "steps",
    "our process",
    "what happens next",
  ],

  benefits: [
    "benefits",
    "why choose us",
    "why us",
    "reasons",
    "advantages",
  ],

  lead_magnet: [
    "lead magnet",
    "free guide",
    "free download",
    "download",
    "checklist",
    "ebook",
    "guide",
  ],
};

const MOOD_WORDS: Record<StyleMood, string[]> = {
  professional: [
    "professional",
    "credible",
    "trustworthy",
    "serious",
    "corporate",
    "legit",
    "polished",
    "established",
    "clean professional",
  ],

  premium: [
    "premium",
    "high end",
    "high-end",
    "luxury",
    "luxurious",
    "upmarket",
    "elegant",
    "sophisticated",
    "classy",
    "upscale",
    "refined",
    "expensive looking",
    "look expensive",
    "feel expensive",
  ],

  minimal: [
    "minimal",
    "minimalist",
    "clean",
    "simple",
    "uncluttered",
    "less busy",
    "tidy",
    "understated",
    "less clutter",
  ],

  bold: [
    "bold",
    "punchy",
    "loud",
    "striking",
    "aggressive",
    "stand out",
    "wow",
    "eye catching",
    "eye-catching",
    "attention grabbing",
    "attention-grabbing",
  ],

  friendly: [
    "friendly",
    "warm",
    "welcoming",
    "approachable",
    "human",
    "playful",
    "fun",
    "down to earth",
    "personal",
  ],

  modern: [
    "modern",
    "fresh",
    "up to date",
    "current",
    "sleek",
    "contemporary",
    "cutting edge",
    "cutting-edge",
    "futuristic",
    "technology",
    "tech",
  ],

  dark: [
    "dark",
    "dark mode",
    "black",
    "night",
    "black background",
    "dark theme",
  ],

  bright: [
    "bright",
    "light",
    "airy",
    "white",
    "colourful",
    "colorful",
    "vibrant",
    "light theme",
  ],
};

const VERB_WORDS: Record<BuilderVerb, string[]> = {
  build: [
    "build",
    "create",
    "make",
    "generate",
    "start",
    "launch",
  ],

  add: [
    "add",
    "put in",
    "include",
    "insert",
    "place",
    "give me",
    "i need",
    "i want",
  ],

  remove: [
    "remove",
    "delete",
    "get rid of",
    "take off",
    "take out",
    "drop",
    "eliminate",
  ],

  hide: [
    "hide",
    "turn off",
    "do not show",
    "don't show",
    "dont show",
    "disable",
  ],

  show: [
    "show",
    "turn on",
    "unhide",
    "enable",
    "bring back",
    "display",
  ],

  rewrite: [
    "rewrite",
    "reword",
    "rewrite the copy",
    "rewrite the text",
    "better words",
    "improve the copy",
    "improve the text",
    "change the wording",
    "make the copy better",
    "make it clearer",
    "make it stronger",
    "make it more persuasive",
  ],

  restyle: [
    "restyle",
    "redesign",
    "restyle the",
    "redesign the",
    "change the design",
    "change the style",
    "change the look",
    "style",
    "theme",
    "colors",
    "colours",
    "fonts",
    "branding",
    "vibe",
    "feel",
  ],

  resize: [
    "resize",
    "bigger",
    "larger",
    "smaller",
    "taller",
    "shorter",
    "full screen",
    "fullscreen",
  ],

  reorder: [
    "reorder",
    "move up",
    "move down",
    "put first",
    "put last",
    "move above",
    "move below",
    "rearrange",
    "change the order",
  ],

  seo: [
    "seo",
    "search engine",
    "google",
    "ranking",
    "rank",
    "keywords",
    "keyword",
    "metadata",
    "meta title",
    "meta description",
    "organic traffic",
    "search traffic",
    "found online",
  ],

  cta: [
    "cta",
    "call to action",
    "call button",
    "book button",
    "booking button",
    "quote button",
    "get more calls",
    "more leads",
    "more customers",
    "convert",
    "conversion",
  ],

  mobile: [
    "mobile",
    "phone",
    "responsive",
    "tablet",
    "small screen",
    "on my phone",
    "mobile friendly",
    "mobile-friendly",
  ],

  hierarchy: [
    "hierarchy",
    "visual hierarchy",
    "order of importance",
    "prioritise",
    "prioritize",
    "most important first",
    "better flow",
    "better structure",
    "make it easier to scan",
  ],

  fix: [
    "fix",
    "broken",
    "not working",
    "wrong",
    "error",
    "bug",
    "does not work",
    "doesn't work",
    "dont work",
    "won't work",
    "will not work",
  ],
};

const GOAL_WORDS: Record<BuilderGoal, string[]> = {
  launch: [
    "launch",
    "publish",
    "go live",
    "live",
    "ready to launch",
    "ready to publish",
  ],

  redesign: [
    "redesign",
    "refresh",
    "revamp",
    "modernize",
    "modernise",
    "make over",
    "overhaul",
    "start over",
  ],

  conversion: [
    "convert",
    "conversion",
    "sell",
    "sales",
    "turn visitors into customers",
    "turn visitors into leads",
    "more customers",
  ],

  leads: [
    "lead",
    "leads",
    "lead generation",
    "enquiry",
    "enquiries",
    "inquiry",
    "inquiries",
    "contact requests",
    "generate leads",
  ],

  booking: [
    "book",
    "booking",
    "appointment",
    "appointments",
    "schedule",
    "scheduler",
    "online booking",
  ],

  calls: [
    "call",
    "calls",
    "phone leads",
    "phone calls",
    "more phone calls",
  ],

  seo: [
    "seo",
    "google",
    "search",
    "ranking",
    "rank",
    "traffic",
    "organic traffic",
  ],

  local_seo: [
    "local seo",
    "near me",
    "nearby",
    "service area",
    "service areas",
    "local customers",
    "local search",
    "local ranking",
  ],

  trust: [
    "trust",
    "credibility",
    "proof",
    "reviews",
    "testimonials",
    "reassurance",
    "social proof",
  ],

  speed: [
    "fast",
    "faster",
    "performance",
    "speed",
    "lightweight",
    "quick loading",
    "quick-loading",
    "load faster",
  ],

  mobile: [
    "mobile",
    "phone",
    "responsive",
    "tablet",
    "mobile first",
    "mobile-first",
  ],

  visual: [
    "3d",
    "three dimensional",
    "three-dimensional",
    "animation",
    "animated",
    "motion",
    "floating",
    "parallax",
    "glass",
    "glassmorphism",
    "glow",
    "premium",
    "cinematic",
    "immersive",
    "depth",
    "visual",
    "wow",
  ],
};

const CONSTRAINT_WORDS: Record<
  BuilderConstraint,
  string[]
> = {
  keep_facts: [
    "keep my facts",
    "keep my information",
    "keep my business information",
    "keep my business details",
    "keep my details",
    "do not change my details",
    "don't change my details",
    "dont change my details",
    "use my real details",
    "keep the real information",
  ],

  no_invention: [
    "do not invent",
    "don't invent",
    "dont invent",
    "no fake",
    "no fake reviews",
    "real only",
    "only real",
    "do not make up",
    "don't make up",
    "dont make up",
    "never fabricate",
    "no fabrication",
  ],

  mobile_first: [
    "mobile first",
    "mobile-first",
    "phone first",
    "phone-first",
  ],

  fast: [
    "fast",
    "quick loading",
    "quick-loading",
    "lightweight",
    "performance",
    "load quickly",
  ],

  accessible: [
    "accessible",
    "accessibility",
    "easy to read",
    "readable",
    "keyboard accessible",
    "screen reader",
  ],

  simple: [
    "simple",
    "easy to use",
    "easy to edit",
    "not complicated",
    "simplify",
    "keep it simple",
  ],

  free_engine: [
    "free builder",
    "free engine",
    "free-first",
    "free first",
    "no paid ai",
    "no paid ai credits",
    "no credits",
    "without credits",
    "no ai credits",
  ],
};

const PAGE_WORDS = [
  "home",
  "home page",
  "homepage",
  "services",
  "service",
  "about",
  "about us",
  "contact",
  "pricing",
  "prices",
  "gallery",
  "portfolio",
  "blog",
  "faq",
  "menu",
  "reviews",
  "testimonials",
  "booking",
  "book",
  "quote",
  "estimate",
];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function clean(
  value: string,
): string {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function lower(
  value: string,
): string {
  return clean(value).toLowerCase();
}

function unique<T>(
  values: T[],
): T[] {
  return Array.from(
    new Set(values),
  );
}

function includesPhrase(
  text: string,
  phrase: string,
): boolean {
  const escaped = phrase
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return new RegExp(
    `(^|\\s)${escaped}(?=\\s|$|[,.!?;:])`,
    "i",
  ).test(text);
}

function matchWords<T extends string>(
  text: string,
  map: Record<T, string[]>,
): T[] {
  const normalized = lower(text);
  const hits: T[] = [];

  for (
    const [key, words] of Object.entries(map) as [
      T,
      string[],
    ][]
  ) {
    const matched = words.some(
      (word) =>
        normalized.includes(
          lower(word),
        ),
    );

    if (matched) {
      hits.push(key);
    }
  }

  return unique(hits);
}

/* -------------------------------------------------------------------------- */
/* CLAUSE PARSING                                                             */
/* -------------------------------------------------------------------------- */

function protectCompoundPhrases(
  text: string,
): string {
  return text
    .replace(
      /\bbefore and after\b/gi,
      "before__AND__after",
    )
    .replace(
      /\bterms and conditions\b/gi,
      "terms__AND__conditions",
    )
    .replace(
      /\brock and roll\b/gi,
      "rock__AND__roll",
    )
    .replace(
      /\band more\b/gi,
      "and__more",
    );
}

function restoreCompoundPhrases(
  text: string,
): string {
  return text
    .replace(
      /__AND__/g,
      "and",
    );
}

/**
 * Split a multi-action request without destroying common phrases.
 *
 * Example:
 * "remove reviews, add pricing, and make the hero premium"
 *
 * becomes three operations.
 */
function splitClauses(
  text: string,
): string[] {
  const protectedText =
    protectCompoundPhrases(text);

  const clauses =
    protectedText
      .split(
        /\s+(?:and then|then|also)\s+|[,;]\s*(?:and\s+)?|^\s*and\s+|\s+and\s+(?=(?:add|remove|delete|hide|show|make|build|create|rewrite|restyle|fix|move|put|change|improve|optimize|optimise|update|enable|disable)\b)/gi,
      )
      .map((part) =>
        restoreCompoundPhrases(
          clean(part),
        ),
      )
      .filter(Boolean);

  return clauses.length > 0
    ? clauses
    : [clean(text)];
}

/* -------------------------------------------------------------------------- */
/* PAGE EXTRACTION                                                            */
/* -------------------------------------------------------------------------- */

function readNewPages(
  text: string,
): string[] {
  const out: string[] = [];

  const patterns = [
    /(?:add|create|make|build|need|want)\s+(?:me\s+)?(?:a|an|another|new)?\s*([a-z0-9][a-z0-9 &'/-]{1,70}?)\s+page\b/gi,

    /\bpage\s+(?:for|about|on)\s+([a-z0-9][a-z0-9 &'/-]{1,70})/gi,
  ];

  for (
    const pattern of patterns
  ) {
    for (
      const match of text.matchAll(pattern)
    ) {
      let label =
        clean(match[1] ?? "");

      label =
        label
          .replace(
            /\b(new|another|the|my|a|an)\b/gi,
            "",
          )
          .replace(
            /\s+/g,
            " ",
          )
          .trim();

      if (
        label.length < 2 ||
        label.length > 70
      ) {
        continue;
      }

      const duplicate =
        out.some(
          (existing) =>
            lower(existing) ===
            lower(label),
        );

      if (!duplicate) {
        out.push(label);
      }
    }
  }

  return out.slice(0, 8);
}

/* -------------------------------------------------------------------------- */
/* LOCATION EXTRACTION                                                        */
/* -------------------------------------------------------------------------- */

const LOCATION_STOPWORDS =
  new Set([
    "i",
    "seo",
    "cta",
    "faq",
    "home",
    "homepage",
    "google",
    "booking",
    "hero",
    "services",
    "pricing",
    "contact",
  ]);

function readLocationHint(
  original: string,
): string | null {
  const patterns = [
    /\b(?:in|near|around|serving|serve|targeting|target)\s+([A-Z][a-zA-Z'-]*(?:\s+[A-Z][a-zA-Z'-]*){0,3}(?:,\s*[A-Z]{2})?)\b/g,

    /\b(?:located in|based in|located near|based near)\s+([A-Z][a-zA-Z'-]*(?:\s+[A-Z][a-zA-Z'-]*){0,3}(?:,\s*[A-Z]{2})?)\b/g,
  ];

  for (
    const pattern of patterns
  ) {
    for (
      const match of original.matchAll(
        pattern,
      )
    ) {
      const candidate =
        clean(match[1] ?? "");

      const first =
        lower(
          candidate.split(
            /[\s,]/,
          )[0] ?? "",
        );

      if (
        candidate &&
        !LOCATION_STOPWORDS.has(first)
      ) {
        return candidate;
      }
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* AUDIENCE EXTRACTION                                                        */
/* -------------------------------------------------------------------------- */

function readAudienceHint(
  original: string,
): string | null {
  const patterns = [
    /\bfor\s+(homeowners|business owners|families|parents|professionals|contractors|property managers|first[- ]time buyers|local businesses|small businesses)\b/i,

    /\btarget(?:ing)?\s+([a-z][a-z -]{2,60})/i,

    /\bideal customers?\s*(?:are|:)\s*([a-z][a-z -]{2,60})/i,

    /\bserving\s+([a-z][a-z -]{2,60})/i,
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      original.match(pattern);

    if (match?.[1]) {
      return clean(match[1]);
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* VISUAL INTENSITY                                                           */
/* -------------------------------------------------------------------------- */

function visualIntensity(
  text: string,
  moods: StyleMood[],
  goals: BuilderGoal[],
): 0 | 1 | 2 | 3 {
  let score = 0;

  if (
    moods.includes("premium") ||
    moods.includes("bold") ||
    moods.includes("modern")
  ) {
    score += 1;
  }

  if (
    goals.includes("visual")
  ) {
    score += 1;
  }

  const strongVisualSignals = [
    "3d",
    "three dimensional",
    "three-dimensional",
    "floating",
    "parallax",
    "glass",
    "glassmorphism",
    "glow",
    "animated",
    "animation",
    "motion",
    "depth",
    "cinematic",
    "immersive",
  ];

  const hasStrongSignal =
    strongVisualSignals.some(
      (signal) =>
        lower(text).includes(
          signal,
        ),
    );

  if (hasStrongSignal) {
    score += 2;
  }

  const restrainedSignals = [
    "subtle",
    "light motion",
    "tasteful",
    "restrained",
    "not too much",
    "not excessive",
    "keep it clean",
  ];

  const restrained =
    restrainedSignals.some(
      (signal) =>
        lower(text).includes(
          signal,
        ),
    );

  if (restrained) {
    score -= 1;
  }

  return Math.min(
    3,
    Math.max(0, score),
  ) as 0 | 1 | 2 | 3;
}

/* -------------------------------------------------------------------------- */
/* TARGET DETECTION                                                           */
/* -------------------------------------------------------------------------- */

function hasExplicitWholeSitePhrase(
  text: string,
): boolean {
  const phrases = [
    "whole site",
    "entire site",
    "whole website",
    "entire website",
    "my whole site",
    "my entire site",
    "all pages",
    "every page",
    "all of my pages",
    "across the site",
    "across my site",
    "across the entire site",
    "throughout the site",
    "sitewide",
    "site wide",
    "from scratch",
    "start over",
    "rebuild the site",
    "rebuild my website",
  ];

  const normalized =
    lower(text);

  return phrases.some(
    (phrase) =>
      normalized.includes(
        phrase,
      ),
  );
}

function hasExplicitWebsiteCreation(
  text: string,
): boolean {
  const phrases = [
    "build me a website",
    "build my website",
    "create my website",
    "create a website from scratch",
    "make me a website",
    "make my website from scratch",
    "start a new website",
    "new website from scratch",
  ];

  const normalized =
    lower(text);

  return phrases.some(
    (phrase) =>
      normalized.includes(
        phrase,
      ),
  );
}

function hasExplicitEveryPage(
  text: string,
): boolean {
  const phrases = [
    "every page",
    "all pages",
    "on every page",
    "across every page",
    "across all pages",
    "throughout every page",
    "throughout the site",
    "sitewide",
    "site wide",
  ];

  const normalized =
    lower(text);

  return phrases.some(
    (phrase) =>
      normalized.includes(
        phrase,
      ),
  );
}

/* -------------------------------------------------------------------------- */
/* PUBLIC INTERPRETER                                                         */
/* -------------------------------------------------------------------------- */

export function interpret(
  instruction: string,
  history: string[] = [],
): BuilderIntent {
  const safeInstruction =
    typeof instruction === "string"
      ? instruction
      : "";

  const normalised =
    normalise(
      safeInstruction,
      history,
    );

  const original =
    normalised.original;

  const text =
    normalised.text;

  const verbs =
    matchWords(
      text,
      VERB_WORDS,
    );

  const sectionKinds =
    matchWords(
      text,
      SECTION_WORDS,
    );

  const moods =
    matchWords(
      text,
      MOOD_WORDS,
    );

  const goals =
    matchWords(
      text,
      GOAL_WORDS,
    );

  const constraints =
    matchWords(
      text,
      CONSTRAINT_WORDS,
    );

  /* ---------------------------------------------------------------------- */
  /* OPERATION-LEVEL UNDERSTANDING                                          */
  /* ---------------------------------------------------------------------- */

  const rawClauses =
    splitClauses(text);

  const operations: BuilderOperation[] =
    rawClauses
      .map(
        (
          clause,
        ) => ({
          raw: clause,

          verbs:
            matchWords(
              clause,
              VERB_WORDS,
            ),

          sectionKinds:
            matchWords(
              clause,
              SECTION_WORDS,
            ),

          moods:
            matchWords(
              clause,
              MOOD_WORDS,
            ),

          goals:
            matchWords(
              clause,
              GOAL_WORDS,
            ),

          constraints:
            matchWords(
              clause,
              CONSTRAINT_WORDS,
            ),
        }),
      )
      .filter(
        (
          operation,
        ) =>
          operation.verbs.length >
            0 ||
          operation.sectionKinds
            .length > 0 ||
          operation.moods.length >
            0 ||
          operation.goals.length >
            0 ||
          operation.constraints
            .length > 0,
      );

  /* ---------------------------------------------------------------------- */
  /* PAGE DETECTION                                                         */
  /* ---------------------------------------------------------------------- */

  const pageHints =
    PAGE_WORDS.filter(
      (page) =>
        text.includes(
          lower(page),
        ),
    );

  const newPages =
    readNewPages(
      text,
    );

  /* ---------------------------------------------------------------------- */
  /* INDUSTRY DETECTION                                                     */
  /* ---------------------------------------------------------------------- */

  const matchedIndustry =
    playbookFor(
      original,
    );

  const industry =
    matchedIndustry.slug ===
    "local_business"
      ? null
      : matchedIndustry;

  /* ---------------------------------------------------------------------- */
  /* CONTEXT                                                                 */
  /* ---------------------------------------------------------------------- */

  const locationHint =
    readLocationHint(
      original,
    );

  const audienceHint =
    readAudienceHint(
      original,
    );

  /* ---------------------------------------------------------------------- */
  /* WHOLE-SITE SAFETY                                                       */
  /* ---------------------------------------------------------------------- */

  /**
   * CRITICAL SAFETY RULE:
   *
   * "Build a pricing page"
   *
   * must NOT become:
   *
   * "rebuild the entire website."
   *
   * Whole-site behavior requires an explicit whole-site signal or explicit
   * website creation request.
   */

  const explicitWholeSite =
    hasExplicitWholeSitePhrase(
      text,
    );

  const explicitWebsiteCreation =
    hasExplicitWebsiteCreation(
      text,
    );

  const wholeSite =
    explicitWholeSite ||
    explicitWebsiteCreation;

  const everyPage =
    hasExplicitEveryPage(
      text,
    );

  /* ---------------------------------------------------------------------- */
  /* FACT SAFETY                                                             */
  /* ---------------------------------------------------------------------- */

  const keepFacts =
    constraints.includes(
      "keep_facts",
    ) ||
    constraints.includes(
      "no_invention",
    );

  /* ---------------------------------------------------------------------- */
  /* MEANINGFUL INTENT                                                       */
  /* ---------------------------------------------------------------------- */

  const hasMeaningfulIntent =
    verbs.length > 0 ||
    sectionKinds.length > 0 ||
    moods.length > 0 ||
    goals.length > 0 ||
    newPages.length > 0 ||
    pageHints.length > 0 ||
    Boolean(locationHint) ||
    Boolean(audienceHint);

  const unrecognised: string[] =
    hasMeaningfulIntent
      ? []
      : [original];

  /* ---------------------------------------------------------------------- */
  /* CONTEXT FALLBACK                                                        */
  /* ---------------------------------------------------------------------- */

  /**
   * If the current message is very short and relies on carried context,
   * preserve that context instead of pretending the request is unknown.
   */
  if (
    !hasMeaningfulIntent &&
    normalised.carried
  ) {
    unrecognised.length = 0;
  }

  /* ---------------------------------------------------------------------- */
  /* RETURN                                                                  */
  /* ---------------------------------------------------------------------- */

  return {
    original,

    verbs,

    sectionKinds,

    operations,

    pageHints:

      unique(
        pageHints,
      ),

    newPages:

      unique(
        newPages,
      ),

    moods:

      unique(
        moods,
      ),

    goals:

      unique(
        goals,
      ),

    constraints:

      unique(
        constraints,
      ),

    industry,

    wholeSite,

    everyPage,

    keepFacts,

    carried:
      normalised.carried,

    locationHint,

    audienceHint,

    visualIntensity:
      visualIntensity(
        text,
        moods,
        goals,
      ),

    unrecognised,
  };
}

/* -------------------------------------------------------------------------- */
/* OPTIONAL DIAGNOSTIC HELPERS                                                */
/* -------------------------------------------------------------------------- */

/**
 * Useful for tests and debugging without exposing implementation details.
 */
export function interpreterSummary(
  intent: BuilderIntent,
): string {
  const parts: string[] = [];

  if (intent.verbs.length > 0) {
    parts.push(
      `verbs=${intent.verbs.join(",")}`,
    );
  }

  if (
    intent.sectionKinds.length > 0
  ) {
    parts.push(
      `sections=${intent.sectionKinds.join(",")}`,
    );
  }

  if (intent.pageHints.length > 0) {
    parts.push(
      `pages=${intent.pageHints.join(",")}`,
    );
  }

  if (intent.newPages.length > 0) {
    parts.push(
      `newPages=${intent.newPages.join(",")}`,
    );
  }

  if (intent.moods.length > 0) {
    parts.push(
      `moods=${intent.moods.join(",")}`,
    );
  }

  if (intent.goals.length > 0) {
    parts.push(
      `goals=${intent.goals.join(",")}`,
    );
  }

  if (intent.wholeSite) {
    parts.push(
      "wholeSite=true",
    );
  }

  if (intent.everyPage) {
    parts.push(
      "everyPage=true",
    );
  }

  if (intent.locationHint) {
    parts.push(
      `location=${intent.locationHint}`,
    );
  }

  if (intent.audienceHint) {
    parts.push(
      `audience=${intent.audienceHint}`,
    );
  }

  return parts.join(
    " | ",
  );
}