/**
 * REVORA LANGUAGE NORMALISER — plain speech in, comparable words out.
 *
 * The interpreter reads meaning, not exact spelling. This module does the
 * unglamorous work first: it collapses whitespace, expands contractions and
 * abbreviations, repairs the typos owners actually make, rewrites idioms into
 * plain requests, and resolves "it" / "that" / "this" using what the owner was
 * just talking about.
 *
 * Pure functions. No model, no network, no cost.
 */

/** Contractions and abbreviations, longest first so overlaps resolve safely. */
const REWRITES: [RegExp, string][] = [
  // conversational padding that hides the actual request
  [/\bcan you (?:please )?/g, ""],
  [/\bcould you (?:please )?/g, ""],
  [/\bi(?:'| a)?m thinking (?:we|you) (?:should|could)\b/g, ""],
  [/\bi(?:'|)d like (?:you )?to\b/g, ""],
  [/\bi want you to\b/g, ""],
  [/\bplease\b/g, ""],
  [/\blet(?:'|)s\b/g, ""],
  [/\bwould be (?:good|great|nice)\b/g, ""],
  // contractions
  [/\bdon(?:'|)t\b/g, "do not"],
  [/\bdoesn(?:'|)t\b/g, "does not"],
  [/\bcan(?:'|)t\b/g, "cannot"],
  [/\bit(?:'|)s\b/g, "it is"],
  [/\bthat(?:'|)s\b/g, "that is"],
  [/\bi(?:'|)ve\b/g, "i have"],
  // abbreviations owners type
  [/\bhomepage\b/g, "home page"],
  [/\bhp\b/g, "home page"],
  [/\bpg\b/g, "page"],
  [/\bcta\b/g, "call to action"],
  [/\bfaqs?\b/g, "faq"],
  [/\bseo\b/g, "seo"],
  [/\bhvac\b/g, "hvac"],
  [/\bac\b/g, "hvac"],
  [/\bа\/c\b/g, "hvac"],
  [/\bmob\b/g, "mobile"],
  [/\bpics?\b/g, "photos"],
  [/\bimgs?\b/g, "images"],
  [/\binfo\b/g, "information"],
  [/\bnum(?:ber)?\b/g, "number"],
  [/\bbiz\b/g, "business"],
  [/\btestimonials?\b/g, "reviews"],
  [/\bcopy(?:writing)?\b/g, "text"],
  [/\bpop\b/g, "stand out"],
];

/** Typos seen in real owner messages, mapped to the intended word. */
const TYPOS: Record<string, string> = {
  webiste: "website",
  websight: "website",
  wesbite: "website",
  wbsite: "website",
  sevices: "services",
  servcies: "services",
  serivces: "services",
  bookign: "booking",
  bookinng: "booking",
  contct: "contact",
  cotnact: "contact",
  gallry: "gallery",
  galery: "gallery",
  proffesional: "professional",
  profesional: "professional",
  premuim: "premium",
  premim: "premium",
  moblie: "mobile",
  mobil: "mobile",
  colour: "color",
  colours: "colors",
  plumbling: "plumbing",
  plumming: "plumbing",
  roofin: "roofing",
  rooffing: "roofing",
  electricain: "electrician",
  electical: "electrical",
  lanscaping: "landscaping",
  hearder: "header",
  heder: "header",
  buton: "button",
  buttton: "button",
  bigge: "bigger",
  darkr: "darker",
};

/**
 * Idioms and figurative design language, rewritten into words the interpreter
 * already understands. This is what lets "make the top part hit harder" work.
 */
const IDIOMS: [RegExp, string][] = [
  [/\btop (?:part|bit|section|area)\b/g, "hero"],
  [/\bthe top\b/g, "hero"],
  [/\bfirst thing (?:people|visitors|they) see\b/g, "hero"],
  [/\babove the fold\b/g, "hero"],
  [/\bhit(?:s)? harder\b/g, "bolder stronger call to action"],
  [/\bmore punch\b/g, "bolder"],
  [/\bpack a punch\b/g, "bolder"],
  [/\blook expensive\b/g, "premium"],
  [/\bfeel expensive\b/g, "premium"],
  [/\bhigh class\b/g, "premium"],
  [/\btop notch\b/g, "premium"],
  [/\bcheap looking\b/g, "premium"],
  [/\bimportant (?:stuff|things|information|info)\b/g, "hierarchy"],
  [/\beasier to find\b/g, "hierarchy"],
  [/\bwhere people (?:see|look) (?:it )?first\b/g, "hierarchy"],
  [/\bstand(?:s)? out\b/g, "bolder call to action"],
  [/\bthroughout (?:the|my) (?:site|website)\b/g, "on every page"],
  [/\bevery page\b/g, "on every page"],
  [/\ball (?:the )?pages\b/g, "on every page"],
  [/\bsound(?:s)? more professional\b/g, "rewrite professional"],
  [/\bsell better\b/g, "rewrite"],
  [/\bfrom scratch\b/g, "build a website"],
  [/\bstart over\b/g, "build a website"],
  [/\bredesign (?:the |my )?(?:whole |entire )?(?:site|website)\b/g, "build a website restyle"],
  [/\bkeep my business (?:information|details|info)\b/g, "keep business facts"],
];

/** Words that only make sense against something mentioned earlier. */
const PRONOUNS = /\b(it|that|this|those|these|them|the same)\b/;

const collapse = (value: string) => value.replace(/\s+/g, " ").trim();

/** Fixes typos word by word, leaving anything it does not know untouched. */
function fixTypos(text: string): string {
  return text.replace(/[a-z]+/g, (word) => TYPOS[word] ?? word);
}

export type Normalised = {
  /** Lower-case, de-padded, typo-fixed, idiom-expanded text for matching. */
  text: string;
  /** The owner's words, whitespace-collapsed. Never used as a claim. */
  original: string;
  /** Subject carried over from an earlier message, when "it" was used. */
  carried: string | null;
};

/**
 * Normalises one request. `history` is the recent conversation, oldest first;
 * only the owner's own earlier messages are used, and only to resolve pronouns.
 */
export function normalise(instruction: string, history: string[] = []): Normalised {
  const original = collapse(instruction);
  let text = fixTypos(collapse(original.toLowerCase()));

  for (const [pattern, replacement] of REWRITES) text = text.replace(pattern, replacement);
  for (const [pattern, replacement] of IDIOMS) text = text.replace(pattern, replacement);
  text = collapse(text);

  // CONTEXT MEMORY. "Now make it darker" only means something next to the
  // message before it, so the earlier subject is appended rather than guessed.
  let carried: string | null = null;
  if (PRONOUNS.test(text)) {
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const previous = normaliseSubjectOnly(history[index] ?? "");
      if (previous) {
        carried = previous;
        text = collapse(`${text} ${previous}`);
        break;
      }
    }
  }

  return { text, original, carried };
}

/** The nouns worth carrying forward as "it" — sections, pages and design. */
const SUBJECT_WORDS = [
  "hero",
  "services",
  "pricing",
  "reviews",
  "gallery",
  "faq",
  "contact",
  "booking",
  "quote",
  "process",
  "benefits",
  "area",
  "offer",
  "guarantee",
  "home page",
  "about",
  "button",
  "design",
  "colors",
  "font",
];

/** Extracts the subject of an earlier message, if it named one. */
export function normaliseSubjectOnly(previous: string): string | null {
  let text = fixTypos(collapse(previous.toLowerCase()));
  for (const [pattern, replacement] of IDIOMS) text = text.replace(pattern, replacement);
  const found = SUBJECT_WORDS.filter((word) => text.includes(word));
  return found.length ? found.slice(0, 3).join(" ") : null;
}
