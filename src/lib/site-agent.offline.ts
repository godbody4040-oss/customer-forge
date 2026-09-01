/**
 * Revora's built-in planner — the assistant without any AI credits.
 *
 * The builder must never stop working because a workspace has run out of AI
 * credits. When the model is unavailable this rule-based planner reads the
 * owner's request, matches it against Revora's own catalogue of sections,
 * pages, backdrops and section effects, and returns a real plan in exactly the
 * shape the AI would have produced. It never invents facts, reviews or prices —
 * it only arranges things Revora already knows how to build.
 */
import { BACKDROPS, SECTION_EFFECTS } from "@/lib/site-effects";
import { SECTION_LIBRARY, PAGE_LIBRARY } from "@/lib/website-content";

type OfflineContext = {
  pages: {
    id: string;
    slug: string;
    title: string;
    kind: string;
    sections: { id: string; kind: string; is_visible: boolean; heading: string | null }[];
  }[];
};

type RawPlan = {
  reply: string;
  summary: string;
  actions: Record<string, unknown>[];
  questions: string[];
  notes: string[];
};

/** Words an owner uses for each backdrop, mapped to the real effect id. */
const BACKDROP_WORDS: Record<string, string> = {
  star: "stars",
  stars: "stars",
  starfield: "stars",
  space: "stars",
  night: "stars",
  aurora: "aurora",
  northern: "aurora",
  nebula: "nebula",
  cloud: "nebula",
  grid: "grid",
  tech: "grid",
  spotlight: "spotlight",
  beam: "spotlight",
  mesh: "gradient_mesh",
  gradient: "gradient_mesh",
  clean: "none",
  plain: "none",
};

/** Words an owner uses for each section effect. */
const EFFECT_WORDS: Record<string, string> = {
  "3d": "float_3d",
  float: "float_3d",
  floating: "float_3d",
  tilt: "tilt_3d",
  depth: "tilt_3d",
  glass: "glass",
  frosted: "glass",
  glow: "gold_glow",
  halo: "gold_glow",
  rise: "rise",
  fade: "rise",
  parallax: "parallax_slow",
  shine: "shine",
  sheen: "shine",
  standard: "none",
};

const SECTION_SYNONYMS: Record<string, string> = {
  review: "reviews",
  reviews: "reviews",
  testimonial: "reviews",
  testimonials: "reviews",
  faq: "faq",
  question: "faq",
  questions: "faq",
  price: "pricing",
  prices: "pricing",
  pricing: "pricing",
  quote: "quote",
  book: "booking",
  booking: "booking",
  gallery: "gallery",
  photo: "gallery",
  photos: "gallery",
  guarantee: "guarantee",
  offer: "offer",
  process: "process",
  steps: "process",
  benefit: "benefits",
  benefits: "benefits",
  trust: "trust_bar",
  stat: "stats",
  stats: "stats",
  number: "stats",
  contact: "contact",
  area: "area",
  areas: "areas",
  cta: "cta",
  sticky: "sticky_cta",
  intro: "intro",
  service: "services",
  services: "services",
};

const has = (text: string, ...words: string[]) => words.some((word) => text.includes(word));

/** Builds a plan for `instruction` using only Revora's own catalogue. */
export function planWithoutAi(
  instruction: string,
  context: OfflineContext,
  reason: string,
): RawPlan {
  const text = instruction.toLowerCase();
  const words = text.split(/[^a-z0-9]+/).filter(Boolean);
  const actions: Record<string, unknown>[] = [];
  const done: string[] = [];

  const home = context.pages.find((page) => page.kind === "home") ?? context.pages[0];
  const allSections = context.pages.flatMap((page) => page.sections);
  const removing = has(text, "remove", "hide", "delete", "take off", "get rid");

  // 1. Whole-site backdrop, e.g. "put stars in the background".
  const backdropId = words.map((word) => BACKDROP_WORDS[word]).find(Boolean);
  if (backdropId && BACKDROPS.some((b) => b.id === backdropId)) {
    actions.push({ type: "set_backdrop", backdrop: removing ? "none" : backdropId });
    done.push(
      `set the site backdrop to ${BACKDROPS.find((b) => b.id === backdropId)?.label ?? backdropId}`,
    );
  }

  // 2. Section motion, e.g. "make the hero float in 3d".
  const effectId = words.map((word) => EFFECT_WORDS[word]).find(Boolean);
  if (effectId && SECTION_EFFECTS.some((e) => e.id === effectId)) {
    const named = allSections.find(
      (section) => text.includes(section.kind.replace(/_/g, " ")) || text.includes(section.kind),
    );
    const target =
      named ?? allSections.find((section) => section.kind === "hero") ?? allSections[0];
    if (target) {
      actions.push({
        type: "set_section_effect",
        sectionId: target.id,
        effect: removing ? "none" : effectId,
      });
      done.push(
        `applied ${SECTION_EFFECTS.find((e) => e.id === effectId)?.label ?? effectId} to your ${target.kind.replace(/_/g, " ")} section`,
      );
    }
  }

  // 3. Add or show/hide a section the owner named.
  const wantedKinds = new Set<string>();
  for (const word of words) {
    const kind = SECTION_SYNONYMS[word];
    if (kind && SECTION_LIBRARY.some((s) => s.kind === kind)) wantedKinds.add(kind);
  }
  for (const kind of wantedKinds) {
    const existing = allSections.find((section) => section.kind === kind);
    if (removing) {
      if (existing?.is_visible) {
        actions.push({ type: "set_section_visibility", sectionId: existing.id, visible: false });
        done.push(`hid your ${kind.replace(/_/g, " ")} section`);
      }
      continue;
    }
    if (existing && !existing.is_visible) {
      actions.push({ type: "set_section_visibility", sectionId: existing.id, visible: true });
      done.push(`turned your ${kind.replace(/_/g, " ")} section back on`);
    } else if (!existing && home) {
      actions.push({ type: "add_section", pageId: home.id, kind });
      done.push(
        `added a ${SECTION_LIBRARY.find((s) => s.kind === kind)?.label ?? kind} section to ${home.title}`,
      );
    }
  }

  // 4. A whole new page, e.g. "add an about page".
  if (has(text, "page")) {
    for (const page of PAGE_LIBRARY) {
      if (
        !text.includes(page.kind) ||
        context.pages.some((existing) => existing.kind === page.kind)
      )
        continue;
      actions.push({ type: "add_page", kind: page.kind, title: page.label, slug: page.kind });
      done.push(`added a ${page.label} page`);
      break;
    }
  }

  const built = done.length > 0;
  return {
    reply: built
      ? `Done — I ${done.join(", ")}. Review the steps below and apply them.`
      : "I can build this straight away, but I need it in Revora's own terms: name a section (reviews, pricing, FAQ, gallery, booking), a background (starfield, aurora, nebula, tech grid, spotlight, gradient mesh) or a motion effect (3D float, 3D tilt, frosted glass, gold glow, rise, parallax, shine). Effect Studio and Upgrade Studio below do the same job with buttons.",
    summary: built
      ? `${done.length} change${done.length === 1 ? "" : "s"} planned by Revora's built-in builder.`
      : "",
    actions,
    questions: built ? [] : ["Which section, background or effect do you want changed?"],
    notes: [
      `Built by Revora's own engine, included in your subscription (${reason}).`,
      "It arranges what Revora already knows how to build and never invents reviews, awards or prices.",
    ],
  };
}
