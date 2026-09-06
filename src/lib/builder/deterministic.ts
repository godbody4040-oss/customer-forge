/**
 * REVORA FREE-FIRST BUILDER — the website engine that needs no AI provider.
 *
 * This is the core of Revora's builder. It takes an owner's plain-English
 * request and the live workspace picture, and returns validated website actions
 * using only:
 *   • the industry playbooks (what a good site for this trade looks like)
 *   • the existing section, page, theme and effect libraries
 *   • the workspace's own business facts
 *
 * It costs nothing to run, works when every AI provider is down, and never
 * invents a fact. A language model is optional polish on top — never a
 * requirement, and never something the customer pays for.
 */

import type { AgentAction } from "@/lib/site-agent";
import type { AgentContext } from "@/lib/site-agent.server";
import { interpret, type BuilderIntent, type StyleMood } from "./interpreter";
import { playbookFor, type IndustryPlaybook } from "./industry";
import { ctaTarget, pageSeo, place, sectionCopy, type CopyFacts } from "./copy";

const MAX_ACTIONS = 40;

export type DeterministicPlan = {
  reply: string;
  summary: string;
  actions: AgentAction[];
  questions: string[];
  notes: string[];
  /** `full` — the request was handled end to end. `partial` — some of it. */
  coverage: "full" | "partial" | "none";
  trace: string[];
  intent: BuilderIntent;
};

type Ctx = AgentContext;
type Page = Ctx["pages"][number];
type Section = Page["sections"][number];

const factsOf = (context: Ctx): CopyFacts => ({
  name: context.business.name,
  industry: context.business.industry,
  tagline: context.business.tagline,
  description: context.business.description,
  city: context.business.city,
  state: context.business.state,
  serviceArea: context.business.serviceArea,
  phone: context.business.phone,
  email: context.business.email,
  services: context.business.services.map((service) => ({ name: service.name })),
});

/** The page a request is about: an explicitly named page, else the home page. */
function targetPage(context: Ctx, intent: BuilderIntent): Page | null {
  for (const hint of intent.pageHints) {
    const match = context.pages.find(
      (page) =>
        page.slug === hint ||
        page.slug === `/${hint}` ||
        page.kind === hint ||
        page.title.toLowerCase() === hint,
    );
    if (match) return match;
  }
  return (
    context.pages.find((page) => page.kind === "home") ??
    context.pages.find((page) => page.slug === "/" || page.slug === "home") ??
    context.pages[0] ??
    null
  );
}

const sectionsOf = (page: Page | null) => (page ? page.sections : []);

const findSection = (page: Page | null, kind: string): Section | undefined =>
  sectionsOf(page).find((section) => section.kind === kind);

/* --------------------------------- design --------------------------------- */

/** Mood → design tokens, layered over the trade's own palette. */
function themeForMood(playbook: IndustryPlaybook, moods: StyleMood[]) {
  const patch: Record<string, string> = {
    primary_color: playbook.visual.primary,
    secondary_color: playbook.visual.secondary,
    accent_color: playbook.visual.accent,
    font_preference: playbook.visual.font,
  };
  let backdrop = playbook.visual.backdrop;

  for (const mood of moods) {
    if (mood === "premium") {
      patch["secondary_color"] = "#0b0b12";
      patch["accent_color"] = "#d4af37";
      patch["font_preference"] = "serif";
      backdrop = "nebula";
    }
    if (mood === "professional") {
      patch["font_preference"] = "sans";
      backdrop = "none";
    }
    if (mood === "minimal") backdrop = "none";
    if (mood === "bold") {
      backdrop = "gradient_mesh";
      patch["accent_color"] = "#f97316";
    }
    if (mood === "modern") backdrop = "grid";
    if (mood === "dark") patch["secondary_color"] = "#08080d";
    if (mood === "bright") patch["secondary_color"] = "#f8fafc";
    if (mood === "friendly") patch["font_preference"] = "sans";
  }
  return { patch, backdrop };
}

/* -------------------------------- compiler -------------------------------- */

/**
 * Compiles a request into website actions. Always returns a usable plan: when
 * nothing specific is recognised, `coverage` is `none` and the caller decides
 * whether to ask the optional writer or reply plainly.
 */
export function buildDeterministicPlan(context: Ctx, instruction: string): DeterministicPlan {
  const intent = interpret(instruction);
  const playbook = intent.industry ?? playbookFor(context.business.industry, instruction);
  const facts = factsOf(context);
  const actions: AgentAction[] = [];
  const notes: string[] = [];
  const questions: string[] = [];
  const trace: string[] = [`Understood the request without an AI provider (${playbook.label}).`];
  const done: string[] = [];
  const page = targetPage(context, intent);
  const allowedSections = new Set(context.sectionKinds);

  const push = (action: AgentAction) => {
    if (actions.length < MAX_ACTIONS) actions.push(action);
  };

  /* --- whole-site build or refresh: design + missing sections + SEO --- */
  const wantsDesign =
    intent.wholeSite || intent.verbs.includes("restyle") || intent.moods.length > 0;

  if (wantsDesign) {
    const { patch, backdrop } = themeForMood(playbook, intent.moods);
    push({ type: "set_theme", patch });
    push({ type: "set_backdrop", backdrop: backdrop as never });
    const hero = findSection(page, "hero");
    if (hero && intent.moods.includes("premium"))
      push({ type: "set_section_effect", sectionId: hero.id, effect: "gold_glow" as never });
    done.push("design");
    trace.push("Applied a design direction from the trade playbook and the words used.");
  }

  /* --- add the sections this trade needs that the page is missing --- */
  if (intent.wholeSite || intent.verbs.includes("build")) {
    let position = sectionsOf(page).length;
    for (const kind of playbook.homeSections) {
      if (!allowedSections.has(kind)) continue;
      if (findSection(page, kind)) continue;
      if (!page) break;
      const copy = sectionCopy(kind, facts, playbook);
      push({
        type: "add_section",
        pageId: page.id,
        kind,
        heading: copy.heading,
        subheading: copy.subheading,
        body: copy.body,
        position: position++,
      });
    }
    done.push("sections");
    trace.push("Filled in the sections this trade needs, in the order buyers decide in.");
  }

  /* --- explicit section requests --- */
  for (const kind of intent.sectionKinds) {
    if (!allowedSections.has(kind)) continue;
    const existing = findSection(page, kind);

    if (intent.verbs.includes("remove") && existing) {
      push({ type: "delete_section", sectionId: existing.id });
      done.push("sections");
      continue;
    }
    if (intent.verbs.includes("hide") && existing) {
      push({ type: "set_section_visibility", sectionId: existing.id, visible: false });
      done.push("sections");
      continue;
    }
    if (intent.verbs.includes("show") && existing) {
      push({ type: "set_section_visibility", sectionId: existing.id, visible: true });
      done.push("sections");
      continue;
    }
    if (intent.verbs.includes("resize") && existing) {
      const bigger = /\b(bigger|larger|taller|full ?screen)\b/i.test(intent.original);
      push({
        type: "set_section_variant",
        sectionId: existing.id,
        variant: bigger ? "full" : "compact",
      });
      if (bigger)
        push({ type: "set_section_effect", sectionId: existing.id, effect: "rise" as never });
      done.push("sections");
      continue;
    }
    if (intent.verbs.includes("rewrite") && existing) {
      const copy = sectionCopy(kind, facts, playbook);
      push({
        type: "set_section_text",
        sectionId: existing.id,
        field: "heading",
        value: copy.heading,
      });
      if (copy.subheading)
        push({
          type: "set_section_text",
          sectionId: existing.id,
          field: "subheading",
          value: copy.subheading,
        });
      done.push("copy");
      continue;
    }
    if (!existing && page) {
      const copy = sectionCopy(kind, facts, playbook);
      push({
        type: "add_section",
        pageId: page.id,
        kind,
        heading: copy.heading,
        subheading: copy.subheading,
        body: copy.body,
        position: sectionsOf(page).length,
      });
      done.push("sections");
    }
  }

  /* --- new pages --- */
  for (const label of intent.newPages) {
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    if (!slug) continue;
    if (context.pages.some((existing) => existing.slug.replace(/^\//, "") === slug)) {
      notes.push(`There is already a page at /${slug}, so it was left alone.`);
      continue;
    }
    const kind = context.pageKinds.includes("services")
      ? "services"
      : (context.pageKinds[0] ?? "custom");
    push({
      type: "add_page",
      kind,
      title: label.replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 120),
      slug,
    });
    notes.push(
      `Created the /${slug} page. Ask for its sections next and Revora will fill it in — new pages have no id until they exist.`,
    );
    done.push("pages");
  }

  /* --- calls to action --- */
  if (intent.verbs.includes("cta") || intent.wholeSite) {
    const hero = findSection(page, "hero") ?? sectionsOf(page)[0];
    const target = ctaTarget(facts);
    if (hero && target) {
      const already = hero.components.some(
        (component) => component.link_url === target.url || component.kind === "button",
      );
      if (!already)
        push({
          type: "add_component",
          sectionId: hero.id,
          kind: "button",
          label: playbook.ctaLabels.primary,
          link_url: target.url,
          link_label: playbook.ctaLabels.primary,
        });
      if (!facts.phone && !facts.email)
        questions.push(
          "What phone number or email should the main button use? Right now it points at your contact page.",
        );
      done.push("cta");
      trace.push("Put the action this trade converts on in front of visitors.");
    }
  }

  /* --- SEO --- */
  if (intent.verbs.includes("seo") || intent.wholeSite) {
    for (const candidate of context.pages.slice(0, 8)) {
      if (candidate.seo_title && candidate.seo_description) continue;
      const seo = pageSeo(candidate.title || "Home", facts, playbook);
      push({ type: "set_page", pageId: candidate.id, patch: seo });
    }
    done.push("seo");
    trace.push("Wrote page titles and descriptions from your trade, town and services.");
  }

  /* --- mobile --- */
  if (intent.verbs.includes("mobile")) {
    notes.push(
      "Your website already lays itself out for phones and tablets — every section is built responsive, so nothing needed changing there.",
    );
    const sticky = findSection(page, "sticky_cta");
    if (!sticky && page && allowedSections.has("sticky_cta")) {
      const copy = sectionCopy("sticky_cta", facts, playbook);
      push({
        type: "add_section",
        pageId: page.id,
        kind: "sticky_cta",
        heading: copy.heading,
        position: sectionsOf(page).length,
      });
      notes.push("Added an always-visible button on phones so the next step is one tap away.");
    }
    done.push("mobile");
  }

  /* --- missing facts we must not invent --- */
  if (!place(facts) && (intent.wholeSite || intent.verbs.includes("seo")))
    questions.push("Which town or area should your website say you cover?");

  const recognised =
    intent.verbs.length > 0 || intent.sectionKinds.length > 0 || intent.newPages.length > 0;
  const coverage: DeterministicPlan["coverage"] = !actions.length
    ? "none"
    : recognised && !intent.unrecognised.length
      ? "full"
      : "partial";

  const summaryBits = [...new Set(done)];
  const summary = summaryBits.length
    ? `Updated your ${summaryBits.join(", ")}.`
    : "Nothing needed changing.";

  const reply = actions.length
    ? `Here's what I'll change — ${actions.length} update${actions.length === 1 ? "" : "s"} to your ${summaryBits.join(", ") || "website"}. Nothing goes live until you approve it.`
    : "I couldn't find anything to change from that on its own — tell me what you'd like different and I'll do it.";

  return {
    reply,
    summary,
    actions,
    questions: questions.slice(0, 1),
    notes,
    coverage,
    trace,
    intent,
  };
}

/** True when the deterministic builder handled the whole request on its own. */
export const isFullyHandled = (plan: DeterministicPlan) => plan.coverage === "full";
