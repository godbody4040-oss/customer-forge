/**
 * REVORA INTENT TRANSLATOR — "tell me what you want in your own words".
 *
 * The owner should never have to learn Revora's vocabulary. This module takes
 * any sentence, note or brief and turns it into a builder brief the existing
 * site agent already understands: which pages and sections are involved, what
 * copy, design, SEO, images, calls to action and functionality the request
 * implies, and what must be left alone.
 *
 * Three rules:
 * - It NEVER rejects a request. Anything readable becomes a brief.
 * - It asks at most ONE question, and only when the work genuinely cannot start
 *   without a fact only the owner has.
 * - It adds nothing about approval, preview or rollback — those systems stay
 *   exactly as they are and run after this translation.
 *
 * Pure and deterministic, so the same words always translate the same way.
 */

/** The parts of the site a request touches, in the owner's language. */
export type IntentArea =
  | "pages"
  | "sections"
  | "copy"
  | "design"
  | "seo"
  | "images"
  | "cta"
  | "functionality";

export type TranslatedIntent = {
  /** The owner's words, cleaned up but never rewritten. */
  original: string;
  /** The brief handed to the website assistant. */
  brief: string;
  /** What Revora worked out the request involves. */
  areas: IntentArea[];
  /** One line the owner reads back before the plan is generated. */
  restated: string;
  /** The single question to ask, or null when Revora can just get on with it. */
  question: string | null;
};

type Signal = { area: IntentArea; patterns: RegExp[]; brief: string };

/**
 * Signals are additive hints, never gates: a request that matches nothing still
 * produces a full brief. They exist so that "make my plumbing page better"
 * quietly becomes copy + CTA + SEO work without the owner naming any of it.
 */
const SIGNALS: Signal[] = [
  {
    area: "pages",
    patterns: [
      /\bpage\b/i,
      /\bpages\b/i,
      /\bservice\b/i,
      /\bservices\b/i,
      /\babout\b/i,
      /\bcontact\b/i,
      /\bpricing\b/i,
      /\bmenu\b/i,
      /\bnavigation\b/i,
      /\bsite ?map\b/i,
    ],
    brief:
      "Create or update whichever pages this needs, give each one a clear web address, and keep the menu order sensible.",
  },
  {
    area: "sections",
    patterns: [
      /\bsection\b/i,
      /\bblock\b/i,
      /\bhero\b/i,
      /\bfaq\b/i,
      /\breview/i,
      /\btestimonial/i,
      /\bgallery\b/i,
      /\bmove\b/i,
      /\breorder\b/i,
      /\bremove\b/i,
      /\bhide\b/i,
      /\badd\b/i,
      /\blayout\b/i,
      /\btop\b/i,
    ],
    brief:
      "Add, reorder, restyle or hide sections as needed so the page reads in the order a buyer decides in.",
  },
  {
    area: "copy",
    patterns: [
      /\b(copy|words|wording|text|headline|title|describe|description|rewrite|write|shorter|longer|simpler|clearer|tone|sell|explain)\b/i,
    ],
    brief:
      "Rewrite the headlines, sub-headlines and body text involved in plain, specific, benefit-first language with one obvious next step. Use only facts already in the workspace.",
  },
  {
    area: "design",
    patterns: [
      /\b(design|look|style|colour|color|font|theme|premium|luxur|modern|clean|dark|light|brand|glow|glass|3d|animated|background|stars|aurora|nebula|wow|expensive|professional)\b/i,
    ],
    brief:
      "Adjust colours, fonts and visual treatment to match the feel being asked for, keeping the site fast and readable.",
  },
  {
    area: "seo",
    patterns: [
      /\b(seo|google|search|rank|keyword|found|find me|traffic|sitemap|schema|meta)\b/i,
    ],
    brief:
      "Write a unique search title and description for every page involved, keep pages indexable, and use the words real customers search for.",
  },
  {
    area: "images",
    patterns: [/\b(photo|photos|image|images|picture|gallery|logo|video|visual)\b/i],
    brief:
      "Place the workspace's existing photos where they support the claim being made; never invent imagery that isn't there.",
  },
  {
    area: "cta",
    patterns: [
      /\b(button|call to action|cta|call now|phone|book|booking|quote|enquir|inquir|contact form|lead|sign ?up|convert|conversion|customers|enquiries|sales)\b/i,
    ],
    brief:
      "Make one primary action obvious on every page involved — call, book, or get a price — and repeat it at the end of the page.",
  },
  {
    area: "functionality",
    patterns: [
      /\b(form|calculator|estimate|chat|map|hours|opening|availability|reminder|follow[- ]?up|automation|review request|integration|payment|checkout)\b/i,
    ],
    brief:
      "Wire up the capture or functionality this needs using the blocks the workspace already supports, so enquiries land somewhere the owner can act on.",
  },
];

/** Requests that genuinely cannot start without one fact from the owner. */
const BLOCKERS: { patterns: RegExp[]; question: string }[] = [
  {
    patterns: [/\b(add|show|list|publish|put)\b[^.]*\b(review|testimonial)s?\b/i],
    question:
      "What reviews would you like shown? Paste them (or the review link) and Revora will lay them out — it won't write reviews you didn't get.",
  },
  {
    patterns: [/\b(price|prices|pricing|cost|rate|rates|fee)\b/i],
    question:
      "What prices should Revora show? Give a number or a starting-from figure for each service and it will build the pricing out.",
  },
  {
    patterns: [/\b(award|certification|licence|license|insured|insurance|guarantee|warranty)\b/i],
    question:
      "What exactly can Revora claim here? Send the wording of the licence, insurance or guarantee and it will use it word for word.",
  },
];

const AREA_LABEL: Record<IntentArea, string> = {
  pages: "pages",
  sections: "sections",
  copy: "copy",
  design: "design",
  seo: "search visibility",
  images: "photos",
  cta: "buttons and enquiries",
  functionality: "functionality",
};

/** Everything a request implies by default, whether or not the owner said it. */
const BASELINE = [
  "Work out for yourself which pages, sections, copy, design, search text, photos, buttons and functionality this request needs — the owner is not expected to name any of them.",
  "Do the whole job in one plan. Never refuse a request for not matching a known command, and never ask the owner to reword it in Revora's language.",
  "Ask at most one question, and only when a fact you cannot know is the only thing blocking the work. Otherwise proceed and note any assumptions.",
  "Use only facts already in the workspace. Never invent reviews, prices, awards, licences or guarantees.",
];

/** Turns any sentence into a builder brief. Never rejects, never throws. */
export function translateIntent(input: string): TranslatedIntent {
  const original = String(input ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!original) {
    return {
      original: "",
      brief: "",
      areas: [],
      restated: "Tell Revora what you want in your own words — it'll handle the rest.",
      question: null,
    };
  }

  const matched = SIGNALS.filter((signal) => signal.patterns.some((p) => p.test(original)));
  const areas = matched.map((signal) => signal.area);
  // Nothing recognised is still a real request: treat it as page work on copy
  // and conversion, which is what almost every plain-language ask comes down to.
  const guidance = (matched.length ? matched : SIGNALS.filter((s) => s.area === "copy" || s.area === "cta")).map(
    (signal) => signal.brief,
  );

  const blocker = BLOCKERS.find((entry) => entry.patterns.some((p) => p.test(original)))?.question;

  const brief = [
    `The owner asked, in their own words: "${original}"`,
    "",
    "Translate that into concrete website changes:",
    ...guidance.map((line) => `- ${line}`),
    "",
    ...BASELINE.map((line) => `- ${line}`),
  ].join("\n");

  const effective = areas.length ? areas : (["copy", "cta"] as IntentArea[]);
  const restated = `Revora will handle ${listWords(effective.map((area) => AREA_LABEL[area]))} for this.`;

  return { original, brief, areas, restated, question: blocker ?? null };
}

function listWords(items: string[]) {
  const unique = [...new Set(items)];
  if (unique.length <= 1) return unique[0] ?? "the change";
  return `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`;
}
