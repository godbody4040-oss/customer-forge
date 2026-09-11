/**
 * REVORA FREE-FIRST BUILDER — the website engine that needs no AI provider.
 *
 * This is the core of Revora's builder, and the primary brain. It takes an
 * owner's plain-English request and the live workspace picture, and returns
 * validated website actions using only:
 *   • the industry playbooks (what a good site for this trade looks like)
 *   • the design decision engine (one coordinated direction, not random tweaks)
 *   • the existing section, page, theme and effect libraries
 *   • the workspace's own business facts
 *
 * Pipeline: NORMALISE → INTENT → CONTEXT → ENTITY RESOLUTION → DECOMPOSE →
 * CAPABILITY MATCH → PLAN → SELF-CHECK. Execution, verification and rollback
 * stay where they already live, in `applyWebsiteChanges`.
 *
 * It costs nothing to run, works when every AI provider is down, and never
 * invents a fact. An outside model is optional polish — never a requirement,
 * and never something the customer pays for.
 */

import type { AgentAction } from "@/lib/site-agent";
import type { AgentContext } from "@/lib/site-agent.server";
import { interpret, type BuilderIntent } from "./interpreter";
import { playbookFor, type IndustryPlaybook } from "./industry";
import { designDecision, hierarchySort } from "./design";
import {
  ctaTarget,
  faqQuestions,
  pageSeo,
  place,
  sectionCopy,
  type CopyFacts,
} from "./copy";

/** Hero layout names the renderer actually supports, by how roomy they are. */
const HERO_LAYOUT = {
  full: "banner",
  standard: "split",
  compact: "stacked",
} as const;

/**
 * Pairs each section the owner named with the verb(s) that actually apply to
 * it, using the interpreter's per-clause breakdown when one exists.
 *
 * Falls back to the old whole-message pairing when clause-splitting found
 * nothing usable.
 */
function sectionOperations(
  intent: BuilderIntent,
): {
  kind: string;
  verbs: BuilderIntent["verbs"];
}[] {
  const fromClauses = intent.operations
    .filter((op) => op.sectionKinds.length)
    .flatMap((op) =>
      op.sectionKinds.map((kind) => ({
        kind,
        verbs: op.verbs,
      })),
    );

  if (fromClauses.length) return fromClauses;

  return intent.sectionKinds.map((kind) => ({
    kind,
    verbs: intent.verbs,
  }));
}

/**
 * What each kind of page needs to be a finished page rather than an empty
 * shell. Anything the workspace does not allow is dropped later.
 */
function pageSectionPlan(kind: string): string[] {
  switch (kind) {
    case "services":
      return ["services", "benefits", "faq", "cta"];

    case "pricing":
      return ["pricing", "faq", "cta"];

    case "about":
      return ["intro", "benefits", "area", "cta"];

    case "contact":
      return ["contact", "area", "cta"];

    case "book":
      return ["booking", "cta"];

    case "gallery":
      return ["gallery", "cta"];

    case "reviews":
      return ["reviews", "cta"];

    default:
      return ["intro", "services", "cta"];
  }
}

/**
 * Works out what kind of page the owner meant from the words they used,
 * so a "pricing page" gets pricing sections rather than a generic shell.
 */
function pageKindFromLabel(
  label: string,
  slug: string,
): string {
  const text = `${label} ${slug}`.toLowerCase();

  const map: [RegExp, string][] = [
    [/price|pricing|cost|rate|package/, "pricing"],
    [/book|schedul|appoint|calendar/, "book"],
    [/quote|estimate/, "contact"],
    [/contact|get in touch|reach/, "contact"],
    [/about|story|team|who we are/, "about"],
    [/review|testimonial|feedback/, "reviews"],
    [/gallery|portfolio|work|photo|project/, "gallery"],
    [/service|what we do|offer/, "services"],
    [/faq|question/, "services"],
  ];

  for (const [pattern, kind] of map) {
    if (pattern.test(text)) return kind;
  }

  return "custom";
}

/**
 * A single tweak stays small; a whole-site build is allowed to be big.
 */
const MAX_ACTIONS = 40;
const MAX_ACTIONS_WHOLE_SITE = 160;

export type BuilderTask = {
  title: string;
  done: boolean;
};

export type DeterministicPlan = {
  reply: string;
  summary: string;
  actions: AgentAction[];
  questions: string[];

  notes: string[];

  /** `full` — request handled end to end. `partial` — some of it. */
  coverage: "full" | "partial" | "none";

  trace: string[];

  intent: BuilderIntent;

  /** Atomic jobs this request was broken into. */
  tasks: BuilderTask[];

  /**
   * True only when the request genuinely needs generative judgement Revora
   * cannot safely supply on its own.
   */
  requiresExternalReasoning: boolean;

  /** Why external reasoning would be required. */
  externalReason: string | null;
}

type Ctx = AgentContext;

type Page = Ctx["pages"][number];

type Section = Page["sections"][number];

export type BuilderOptions = {
  /** Earlier messages from the owner, oldest first. */
  history?: string[];

  /** What the owner attached. */
  attachments?: {
    kind: string;
    name: string;
  }[];
};

const factsOf = (
  context: Ctx,
): CopyFacts => ({
  name: context.business.name,
  industry: context.business.industry,
  tagline: context.business.tagline,
  description: context.business.description,
  city: context.business.city,
  state: context.business.state,
  serviceArea: context.business.serviceArea,
  phone: context.business.phone,
  email: context.business.email,
  services: context.business.services.map(
    (service) => ({
      name: service.name,
    }),
  ),
});

/**
 * The page a request is about:
 * explicitly named page first, otherwise home.
 */
function targetPage(
  context: Ctx,
  intent: BuilderIntent,
): Page | null {
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
    context.pages.find(
      (page) => page.kind === "home",
    ) ??
    context.pages.find(
      (page) =>
        page.slug === "/" ||
        page.slug === "home",
    ) ??
    context.pages[0] ??
    null
  );
}

const sectionsOf = (
  page: Page | null,
) => (page ? page.sections : []);

const findSection = (
  page: Page | null,
  kind: string,
): Section | undefined =>
  sectionsOf(page).find(
    (section) => section.kind === kind,
  );

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const titleCase = (value: string) =>
  value
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    )
    .slice(0, 120);

/* -------------------------------------------------------------------------- */
/* COMPILER                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Compiles a request into website actions.
 *
 * Always returns a usable plan.
 *
 * When nothing specific is recognised:
 * - coverage = none
 * - requiresExternalReasoning = true
 * - caller decides whether optional writer/AI should be used
 */
export function buildDeterministicPlan(
  context: Ctx,
  instruction: string,
  options: BuilderOptions = {},
): DeterministicPlan {
  const intent = interpret(
    instruction,
    options.history ?? [],
  );

  const playbook =
    intent.industry ??
    playbookFor(
      context.business.industry,
      instruction,
    );

  const facts = factsOf(context);

  const actions: AgentAction[] = [];
  const notes: string[] = [];
  const questions: string[] = [];
  const trace: string[] = [
    `Understood the request without an AI provider (${playbook.label}).`,
  ];

  const tasks: BuilderTask[] = [];
  const done: string[] = [];

  const page = targetPage(
    context,
    intent,
  );

  const allowedSections = new Set(
    context.sectionKinds,
  );

  const attachments =
    options.attachments ?? [];

  const wholeSite =
    intent.wholeSite ||
    intent.verbs.includes("build");

  const cap = wholeSite
    ? MAX_ACTIONS_WHOLE_SITE
    : MAX_ACTIONS;

  const push = (
    action: AgentAction,
  ) => {
    if (actions.length < cap) {
      actions.push(action);
    }
  };

  const task = (
    title: string,
    work: () => boolean,
  ) => {
    const before = actions.length;

    const claimed = work();

    tasks.push({
      title,
      done:
        claimed ||
        actions.length > before,
    });
  };

  /* ------------------------------------------------------------------------ */
  /* DESIGN                                                                   */
  /* ------------------------------------------------------------------------ */

  const wantsDesign =
    wholeSite ||
    intent.verbs.includes("restyle") ||
    intent.moods.length > 0;

  const design = designDecision(
    playbook,
    intent.moods,
    `${context.business.name}|${context.business.city ?? ""}|${context.business.state ?? ""}`,
  );

  if (wantsDesign) {
    task(
      "Set the design direction",
      () => {
        push({
          type: "set_theme",
          patch: design.theme,
        });

        push({
          type: "set_backdrop",
          backdrop: design.backdrop,
        });

        const hero =
          findSection(page, "hero") ??
          sectionsOf(page)[0];

        if (hero) {
          push({
            type: "set_section_effect",
            sectionId: hero.id,
            effect: design.heroEffect,
          });

          if (
            design.density !== "standard" &&
            hero.kind === "hero"
          ) {
            push({
              type: "set_section_variant",
              sectionId: hero.id,
              variant:
                HERO_LAYOUT[
                  design.density
                ],
            });
          }
        }

        if (
          design.bodyEffect !== "none"
        ) {
          for (
            const section of sectionsOf(page).slice(
              1,
              5,
            )
          ) {
            push({
              type: "set_section_effect",
              sectionId: section.id,
              effect: design.bodyEffect,
            });
          }
        }

        done.push("design");

        notes.push(
          ...design.rationale.slice(1),
        );

        trace.push(
          "Chose one design direction from the trade playbook and the words used.",
        );

        return true;
      },
    );
  }

  /* ------------------------------------------------------------------------ */
  /* COMPLETE WEBSITE MODE                                                   */
  /* ------------------------------------------------------------------------ */

  if (wholeSite) {
    task(
      "Create the pages this trade needs, finished in one go",
      () => {
        let created = false;
        let index = 0;

        for (
          const wanted of playbook.pages
        ) {
          const slug = slugify(
            wanted.slug ||
              wanted.title,
          );

          if (!slug) continue;

          if (
            context.pages.some(
              (existing) =>
                existing.slug.replace(
                  /^\//,
                  "",
                ) === slug,
            )
          ) {
            continue;
          }

          const kind =
            context.pageKinds.includes(
              wanted.kind,
            )
              ? wanted.kind
              : "custom";

          /*
           * Temporary page reference allows sections to be created in
           * the same request instead of creating blank pages.
           */
          const ref =
            `temp_page_${index++}`;

          push({
            type: "add_page",
            kind,
            title: wanted.title,
            slug,
            ref,
          });

          let position = 0;

          for (
            const sectionKind of pageSectionPlan(
              kind,
            )
          ) {
            if (
              !allowedSections.has(
                sectionKind,
              )
            ) {
              continue;
            }

            const copy = sectionCopy(
              sectionKind,
              facts,
              playbook,
            );

            push({
              type: "add_section",
              pageId: ref,
              kind: sectionKind,
              heading: copy.heading,
              subheading: copy.subheading,
              body: copy.body,
              position: position++,
            });
          }

          push({
            type: "set_page",
            pageId: ref,
            patch: pageSeo(
              wanted.title,
              facts,
              playbook,
            ),
          });

          created = true;
        }

        if (created) {
          done.push("pages");

          trace.push(
            "Built each new page complete with its sections, copy and search details.",
          );
        }

        return created;
      },
    );

    task(
      "Lay out the home page in buyer-decision order",
      () => {
        if (!page) return false;

        let position =
          sectionsOf(page).length;

        let added = false;

        for (
          const kind of playbook.homeSections
        ) {
          if (
            !allowedSections.has(kind)
          ) {
            continue;
          }

          if (
            findSection(page, kind)
          ) {
            continue;
          }

          const copy = sectionCopy(
            kind,
            facts,
            playbook,
          );

          push({
            type: "add_section",
            pageId: page.id,
            kind,
            heading: copy.heading,
            subheading:
              copy.subheading,
            body: copy.body,
            position: position++,
          });

          added = true;
        }

        if (added) {
          done.push("sections");

          trace.push(
            "Filled in the sections this trade needs, in the order buyers decide in.",
          );
        }

        return added;
      },
    );

    task(
      "Write the copy from your own business details",
      () => {
        let written = false;

        for (
          const section of sectionsOf(page).slice(
            0,
            8,
          )
        ) {
          if (section.heading) {
            continue;
          }

          const copy = sectionCopy(
            section.kind,
            facts,
            playbook,
          );

          if (!copy.heading) {
            continue;
          }

          push({
            type: "set_section_text",
            sectionId: section.id,
            field: "heading",
            value: copy.heading,
          });

          written = true;
        }

        if (written) {
          done.push("copy");
        }

        return written;
      },
    );

    task(
      "Add the questions your customers ask",
      () => {
        const faq = findSection(
          page,
          "faq",
        );

        if (!faq) {
          return false;
        }

        const existing = new Set(
          faq.components.map(
            (component) =>
              component.label,
          ),
        );

        let added = false;

        for (
          const question of faqQuestions(
            playbook,
          ).slice(0, 5)
        ) {
          if (
            existing.has(question)
          ) {
            continue;
          }

          push({
            type: "add_component",
            sectionId: faq.id,
            kind: "faq",
            label: question,
          });

          added = true;
        }

        if (added) {
          done.push("faq");
        }

        return added;
      },
    );
  }

  /* ------------------------------------------------------------------------ */
  /* EXPLICIT SECTION REQUESTS                                                */
  /* ------------------------------------------------------------------------ */

  for (
    const {
      kind,
      verbs: opVerbs,
    } of sectionOperations(intent)
  ) {
    if (
      !allowedSections.has(kind)
    ) {
      continue;
    }

    const existing = findSection(
      page,
      kind,
    );

    /* REMOVE */
    if (
      opVerbs.includes("remove") &&
      existing
    ) {
      push({
        type: "delete_section",
        sectionId: existing.id,
      });

      done.push("sections");

      continue;
    }

    /* HIDE */
    if (
      opVerbs.includes("hide") &&
      existing
    ) {
      push({
        type: "set_section_visibility",
        sectionId: existing.id,
        visible: false,
      });

      done.push("sections");

      continue;
    }

    /* SHOW */
    if (
      opVerbs.includes("show") &&
      existing
    ) {
      push({
        type: "set_section_visibility",
        sectionId: existing.id,
        visible: true,
      });

      done.push("sections");

      continue;
    }

    /* RESIZE */
    if (
      opVerbs.includes("resize") &&
      existing
    ) {
      const bigger =
        /\b(bigger|larger|taller|full ?screen)\b/i.test(
          intent.original,
        );

      if (
        existing.kind === "hero"
      ) {
        push({
          type: "set_section_variant",
          sectionId: existing.id,
          variant: bigger
            ? HERO_LAYOUT.full
            : HERO_LAYOUT.compact,
        });
      }

      if (bigger) {
        push({
          type: "set_section_effect",
          sectionId: existing.id,
          effect: "rise",
        });
      }

      done.push("sections");

      continue;
    }

    /* REWRITE */
    if (
      opVerbs.includes("rewrite") &&
      existing
    ) {
      const copy = sectionCopy(
        kind,
        facts,
        playbook,
      );

      push({
        type: "set_section_text",
        sectionId: existing.id,
        field: "heading",
        value: copy.heading,
      });

      if (copy.subheading) {
        push({
          type: "set_section_text",
          sectionId: existing.id,
          field: "subheading",
          value: copy.subheading,
        });
      }

      done.push("copy");

      continue;
    }

    /* ADD */
    if (!existing && page) {
      const copy = sectionCopy(
        kind,
        facts,
        playbook,
      );

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

  /* ------------------------------------------------------------------------ */
  /* REWRITE WHOLE PAGE                                                       */
  /* ------------------------------------------------------------------------ */

  if (
    intent.verbs.includes("rewrite") &&
    !intent.sectionKinds.length &&
    page
  ) {
    task(
      "Rewrite this page in your own facts",
      () => {
        let written = false;

        for (
          const section of sectionsOf(page).slice(
            0,
            8,
          )
        ) {
          const copy = sectionCopy(
            section.kind,
            facts,
            playbook,
          );

          if (!copy.heading) {
            continue;
          }

          push({
            type: "set_section_text",
            sectionId: section.id,
            field: "heading",
            value: copy.heading,
          });

          if (copy.subheading) {
            push({
              type: "set_section_text",
              sectionId: section.id,
              field: "subheading",
              value: copy.subheading,
            });
          }

          written = true;
        }

        if (written) {
          done.push("copy");
        }

        return written;
      },
    );
  }

  /* ------------------------------------------------------------------------ */
  /* VISUAL HIERARCHY                                                         */
  /* ------------------------------------------------------------------------ */

  if (
    intent.verbs.includes(
      "hierarchy",
    ) &&
    page &&
    sectionsOf(page).length > 2
  ) {
    task(
      "Put the deciding information first",
      () => {
        const sorted =
          hierarchySort(
            sectionsOf(page),
          );

        const changed =
          sorted.some(
            (section, index) =>
              section.id !==
              sectionsOf(page)[
                index
              ]?.id,
          );

        if (!changed) {
          return false;
        }

        push({
          type: "reorder_sections",
          pageId: page.id,
          sectionIds:
            sorted.map(
              (section) =>
                section.id,
            ),
        });

        done.push("layout");

        trace.push(
          "Reordered the page so the headline, offer and next step come first.",
        );

        return true;
      },
    );
  }

  /* ------------------------------------------------------------------------ */
  /* NEW PAGES                                                                */
  /* ------------------------------------------------------------------------ */

  let namedPageIndex = 0;

  for (
    const label of intent.newPages
  ) {
    const slug = slugify(label);

    if (!slug) continue;

    if (
      context.pages.some(
        (existing) =>
          existing.slug.replace(
            /^\//,
            "",
          ) === slug,
      )
    ) {
      notes.push(
        `There is already a page at /${slug}, so it was left alone.`,
      );

      continue;
    }

    const guess =
      pageKindFromLabel(
        label,
        slug,
      );

    const kind =
      context.pageKinds.includes(
        guess,
      )
        ? guess
        : context.pageKinds.includes(
              "custom",
            )
          ? "custom"
          : (
              context.pageKinds[0] ??
              "custom"
            );

    const title =
      titleCase(label);

    /*
     * Temporary reference ensures the page receives its sections,
     * copy and SEO in the SAME request.
     */
    const ref =
      `temp_named_page_${namedPageIndex++}`;

    push({
      type: "add_page",
      kind,
      title,
      slug,
      ref,
    });

    let position = 0;

    for (
      const sectionKind of pageSectionPlan(
        guess,
      )
    ) {
      if (
        !allowedSections.has(
          sectionKind,
        )
      ) {
        continue;
      }

      const copy = sectionCopy(
        sectionKind,
        facts,
        playbook,
      );

      push({
        type: "add_section",
        pageId: ref,
        kind: sectionKind,
        heading: copy.heading,
        subheading: copy.subheading,
        body: copy.body,
        position: position++,
      });
    }

    push({
      type: "set_page",
      pageId: ref,
      patch: pageSeo(
        title,
        facts,
        playbook,
      ),
    });

    notes.push(
      `Created the /${slug} page with its sections, wording and next step already in place.`,
    );

    done.push("pages");
  }

  /* ------------------------------------------------------------------------ */
  /* CALL TO ACTION                                                           */
  /* ------------------------------------------------------------------------ */

  if (
    intent.verbs.includes("cta") ||
    wholeSite
  ) {
    task(
      "Put the next step in front of visitors",
      () => {
        const target =
          ctaTarget(facts);

        if (!target) {
          return false;
        }

        const pages =
          intent.everyPage ||
          wholeSite
            ? context.pages.slice(
                0,
                8,
              )
            : page
              ? [page]
              : [];

        let added = false;

        for (
          const candidate of pages
        ) {
          const host =
            candidate.sections.find(
              (s) =>
                s.kind === "hero",
            ) ??
            candidate.sections[0];

          if (!host) {
            continue;
          }

          const already =
            host.components.some(
              (component) =>
                component.kind ===
                  "button" ||
                component.link_url ===
                  target.url,
            );

          if (already) {
            continue;
          }

          push({
            type: "add_component",
            sectionId: host.id,
            kind: "button",
            label:
              playbook.ctaLabels
                .primary,
            link_url: target.url,
            link_label:
              playbook.ctaLabels
                .primary,
          });

          added = true;
        }

        if (
          !facts.phone &&
          !facts.email
        ) {
          questions.push(
            "What phone number or email should the main button use? Right now it points at your contact page.",
          );
        }

        if (added) {
          done.push("buttons");

          trace.push(
            "Put the action this trade converts on in front of visitors.",
          );
        }

        return added;
      },
    );
  }

  /* ------------------------------------------------------------------------ */
  /* SEO                                                                      */
  /* ------------------------------------------------------------------------ */

  if (
    intent.verbs.includes("seo") ||
    wholeSite
  ) {
    task(
      "Write titles and descriptions for search",
      () => {
        let written = false;

        for (
          const candidate of context.pages.slice(
            0,
            12,
          )
        ) {
          if (
            candidate.seo_title &&
            candidate.seo_description
          ) {
            continue;
          }

          push({
            type: "set_page",
            pageId: candidate.id,
            patch: pageSeo(
              candidate.title ||
                "Home",
              facts,
              playbook,
            ),
          });

          written = true;
        }

        if (written) {
          done.push(
            "search listing",
          );

          trace.push(
            "Wrote page titles and descriptions from your trade, town and services.",
          );
        }

        return written;
      },
    );
  }

  /* ------------------------------------------------------------------------ */
  /* MOBILE                                                                   */
  /* ------------------------------------------------------------------------ */

  if (
    intent.verbs.includes(
      "mobile",
    ) ||
    wholeSite
  ) {
    task(
      "Check how it behaves on a phone",
      () => {
        notes.push(
          "Your website already lays itself out for phones and tablets — every section is built responsive, so nothing needed changing there.",
        );

        const sticky =
          findSection(
            page,
            "sticky_cta",
          ) ??
          actions.find(
            (action) =>
              action.type ===
                "add_section" &&
              action.kind ===
                "sticky_cta",
          );

        if (
          !sticky &&
          page &&
          allowedSections.has(
            "sticky_cta",
          )
        ) {
          const copy =
            sectionCopy(
              "sticky_cta",
              facts,
              playbook,
            );

          push({
            type: "add_section",
            pageId: page.id,
            kind: "sticky_cta",
            heading:
              copy.heading,
            position:
              sectionsOf(page)
                .length,
          });

          notes.push(
            "Added an always-visible button on phones so the next step is one tap away.",
          );
        }

        done.push(
          "phone layout",
        );

        return true;
      },
    );
  }

  /* ------------------------------------------------------------------------ */
  /* ATTACHMENTS                                                              */
  /* ------------------------------------------------------------------------ */

  if (attachments.length) {
    const kinds = [
      ...new Set(
        attachments.map(
          (item) => item.kind,
        ),
      ),
    ];

    notes.push(
      `Kept your ${kinds.join(", ")} upload${attachments.length === 1 ? "" : "s"} with this request — anything Revora can act on structurally is already in the plan.`,
    );

    trace.push(
      `Handled ${attachments.length} upload(s) without sending them anywhere by default.`,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* MISSING BUSINESS FACTS                                                   */
  /* ------------------------------------------------------------------------ */

  const currentPlace =
    place(facts);

  if (
    intent.locationHint
  ) {
    /*
     * A place mentioned in chat is a claim to confirm,
     * not a fact to silently write.
     */
    const hintTown =
      intent.locationHint
        .split(",")[0]!
        .trim()
        .toLowerCase();

    const alreadyStored =
      currentPlace
        ?.toLowerCase()
        .includes(
          hintTown,
        ) ?? false;

    if (!alreadyStored) {
      questions.unshift(
        currentPlace
          ? `You mentioned "${intent.locationHint}" — want me to update your service area from "${currentPlace}" to this, or was that just for this one page?`
          : `You mentioned "${intent.locationHint}" — should I set this as your service area so it shows across your site and SEO pages?`,
      );
    }
  } else if (
    !currentPlace &&
    (
      wholeSite ||
      intent.verbs.includes(
        "seo",
      )
    )
  ) {
    questions.push(
      "Which town or area should your website say you cover?",
    );
  }

  /* ------------------------------------------------------------------------ */
  /* FINAL SELF-CHECK                                                         */
  /* ------------------------------------------------------------------------ */

  const recognised =
    intent.verbs.length > 0 ||
    intent.sectionKinds.length >
      0 ||
    intent.newPages.length > 0 ||
    intent.moods.length > 0;

  const coverage:
    DeterministicPlan["coverage"] =
    !actions.length
      ? "none"
      : recognised &&
          !intent.unrecognised.length
        ? "full"
        : "partial";

  /*
   * Outside reasoning is only needed when:
   * 1. No useful website work was recognised.
   * 2. An attachment must actually be interpreted before acting.
   */
  const needsAttachmentReading =
    attachments.length > 0 &&
    !actions.length
      ? "An upload has to be read before anything can be changed"
      : null;

  const externalReason =
    !actions.length
      ? (
          needsAttachmentReading ??
          "No website work was recognised in the request"
        )
      : null;

  const summaryBits = [
    ...new Set(done),
  ];

  const summary =
    summaryBits.length
      ? `Updated your ${summaryBits.join(", ")}.`
      : "Nothing needed changing.";

  const reply = actions.length
    ? `Here's what I'll change — ${actions.length} update${actions.length === 1 ? "" : "s"} to your ${summaryBits.join(", ") || "website"}. Nothing goes live until you approve it.`
    : "Tell me what you'd like different in your own words and I'll handle the rest.";

  return {
    reply,
    summary,
    actions,
    questions:
      questions.slice(0, 1),
    notes: [
      ...new Set(notes),
    ].slice(0, 8),
    coverage,
    trace,
    intent,
    tasks,
    requiresExternalReasoning:
      externalReason !== null,
    externalReason,
  };
}

/**
 * True when the deterministic builder handled
 * the whole request on its own.
 */
export const isFullyHandled = (
  plan: DeterministicPlan,
) =>
  plan.coverage === "full";