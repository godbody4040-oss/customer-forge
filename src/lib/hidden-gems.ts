/**
 * Revora Hidden Gems (pure layer).
 *
 * The proactive brain behind the website builder. The client should never have
 * to know what to ask for: this module reads their live pages and business
 * facts and answers four questions for them —
 *
 *  1. "What could my website do that I didn't know about?"  → suggestGems()
 *  2. "What am I missing right now?"                        → findGaps()
 *  3. "What should I do next?"                              → thinkAhead()
 *  4. "Surprise me."                                        → surpriseIdeas()
 *
 * Honesty rules encoded here (no unsupported claims):
 * - path "install"  → the builder writes it onto the site right now, using
 *                     validated agent actions only.
 * - path "system"   → the capability already exists elsewhere in Revora
 *                     (CRM, automations, reviews, analytics…) and we link to it.
 * - path "ask"      → the website assistant plans it with the client first,
 *                     because it needs their words, prices or files.
 * Nothing here deletes, hides or downgrades anything.
 */

import type { AgentAction } from "@/lib/site-agent";
import type { ContentPage } from "@/lib/website-content";
import type { StudioFacts } from "@/lib/upgrade-studio";

export type GemFacts = StudioFacts & { industry: string | null };

export type GemCategory =
  "Convert" | "Capture" | "Trust" | "Retain" | "Get found" | "Sell" | "Experience" | "Measure";

export type GemPath = "install" | "system" | "ask";

export type HiddenGem = {
  id: string;
  name: string;
  category: GemCategory;
  /** Why it makes the client money, in plain words. */
  why: string;
  /** Exactly what appears on the site / in the system. */
  preview: string[];
  path: GemPath;
  /** Ordering weight — bigger first. */
  impact: number;
  /** Where the capability already lives, for path "system". */
  route?: string;
  routeLabel?: string;
  /** What the assistant is asked to plan, for path "ask". */
  prompt?: string;
  /** Real changes written now, for path "install". */
  actions?: AgentAction[];
};

const blank = (value: unknown) => !(typeof value === "string" && value.trim().length > 0);

const visiblePages = (pages: ContentPage[]) => pages.filter((page) => page.is_visible);
const hasKind = (pages: ContentPage[], kind: string) =>
  pages.some((page) =>
    page.sections.some((section) => section.kind === kind && section.is_visible),
  );
const hasPage = (pages: ContentPage[], kind: string) => pages.some((page) => page.kind === kind);

const areaOf = (facts: GemFacts) => {
  const parts = [facts.city, facts.state].filter(Boolean);
  if (parts.length) return parts.join(", ");
  return facts.serviceArea?.split(/[,\n]/)[0]?.trim() ?? "";
};

const nameOf = (facts: GemFacts) => facts.businessName?.trim() || "your business";

const serviceNames = (facts: GemFacts) => facts.services.map((s) => s.name.trim()).filter(Boolean);

/* ------------------------------- hidden gems ------------------------------ */

/**
 * Everything this specific site could gain, filtered to what it does not
 * already have. Ordered so the money-makers surface first.
 */
export function suggestGems(pages: ContentPage[], facts: GemFacts): HiddenGem[] {
  const out: HiddenGem[] = [];
  const home = pages.find((page) => page.kind === "home") ?? pages[0];
  const area = areaOf(facts);
  const inArea = area ? ` in ${area}` : "";
  const name = nameOf(facts);
  const services = serviceNames(facts);
  const first = services[0] ?? "the work you do";
  const push = (gem: HiddenGem) => out.push(gem);

  /* ---- Capture ---- */
  if (home && !hasKind(pages, "quote")) {
    push({
      id: "gem-instant-quote",
      name: "Instant quote form",
      category: "Capture",
      why: "Most visitors will not phone. A short form on the page turns a browser into a named lead with a budget.",
      preview: [
        `${home.title} → new quote block, wired to your CRM`,
        "Every submission lands in Leads with its source",
      ],
      path: "install",
      impact: 14,
      actions: [
        {
          type: "add_section",
          pageId: home.id,
          kind: "quote",
          heading: `Get your free quote${inArea}`,
          subheading: `Tell ${name} what you need and get a price range back the same day.`,
          body: services.length
            ? `Popular right now: ${services.slice(0, 3).join(", ")}.`
            : undefined,
        },
      ],
    });
  }

  if (home && !hasKind(pages, "booking")) {
    push({
      id: "gem-online-booking",
      name: "Online booking",
      category: "Capture",
      why: "People book at 9pm when you are asleep. A booking block captures the job while they are still deciding.",
      preview: [
        `${home.title} → new booking block`,
        "Bookings appear on your calendar automatically",
      ],
      path: "install",
      impact: 13,
      actions: [
        {
          type: "add_section",
          pageId: home.id,
          kind: "booking",
          heading: "Book your visit online",
          subheading: `Pick a time that suits you — ${name} confirms by text or email.`,
        },
      ],
    });
  }

  if (home && !hasKind(pages, "lead_magnet")) {
    push({
      id: "gem-lead-magnet",
      name: "Lead magnet (free guide / checklist)",
      category: "Capture",
      why: "Visitors who are not ready today will still swap an email for something useful — then your follow-ups do the selling.",
      preview: [`${home.title} → free guide block with an email capture`],
      path: "install",
      impact: 8,
      actions: [
        {
          type: "add_section",
          pageId: home.id,
          kind: "lead_magnet",
          heading: `The ${first} checklist${inArea}`,
          subheading:
            "What to check, what it should cost, and the questions to ask before you hire anyone.",
          body: `Free from ${name}. Enter your email and we'll send it straight over.`,
        },
      ],
    });
  }

  push({
    id: "gem-smart-quiz",
    name: "Smart form / qualification quiz",
    category: "Capture",
    why: "A few branching questions filter tyre-kickers out and tell you the job size before you pick up the phone.",
    preview: [
      "Assistant plans the questions from your services and prices",
      "Answers score the lead in your CRM",
    ],
    path: "ask",
    impact: 11,
    prompt: `Build me a short qualifying quiz for ${first}. Ask the 4 or 5 questions I need to price the job, and send the answers into my leads.`,
  });

  push({
    id: "gem-calculator",
    name: "Price / savings calculator",
    category: "Capture",
    why: "A calculator gets people to type in their own numbers — that is intent you can follow up on.",
    preview: [
      "Assistant plans the inputs and the formula with you",
      "Result screen ends in your quote form",
    ],
    path: "ask",
    impact: 9,
    prompt: `Add a price calculator for ${first} so visitors can estimate their own cost, then ask for their details to confirm it.`,
  });

  /* ---- Convert ---- */
  if (home && !hasKind(pages, "sticky_cta")) {
    push({
      id: "gem-sticky-cta",
      name: "Sticky mobile call bar",
      category: "Convert",
      why: "Most of your traffic is on a phone. A bar pinned to the bottom keeps the call button one thumb away on every scroll.",
      preview: ["Always-visible call / quote bar on mobile"],
      path: "install",
      impact: 12,
      actions: [
        {
          type: "add_section",
          pageId: home.id,
          kind: "sticky_cta",
          heading: facts.phone ? `Call ${facts.phone}` : "Get a fast quote",
          subheading: `${name} answers${inArea ? ` ${inArea}` : ""} the same day.`,
        },
      ],
    });
  }

  if (home && !hasKind(pages, "offer")) {
    push({
      id: "gem-offer-strip",
      name: "Limited-time offer strip",
      category: "Convert",
      why: "A reason to act today beats a reason to think about it. One honest offer lifts enquiries without discounting everything.",
      preview: [`${home.title} → offer strip near the top`],
      path: "install",
      impact: 9,
      actions: [
        {
          type: "add_section",
          pageId: home.id,
          kind: "offer",
          heading: "This month only",
          subheading: `Book ${first}${inArea} this month and ${name} will hold today's price.`,
        },
      ],
    });
  }

  push({
    id: "gem-exit-intent",
    name: "Exit-intent offer",
    category: "Convert",
    why: "Catch the people already reaching for the back button with one last, specific offer.",
    preview: [
      "Assistant writes the offer and where it shows",
      "Nothing is added until you approve the wording",
    ],
    path: "ask",
    impact: 7,
    prompt: `Write me an exit-intent offer for people about to leave my ${first} page, and add it to the site.`,
  });

  push({
    id: "gem-personal-cta",
    name: "Personalised calls to action",
    category: "Convert",
    why: "A visitor who arrived from a service page should be asked about that service, not sent a generic 'contact us'.",
    preview: ["Assistant rewrites each page's closing ask around that page's job"],
    path: "ask",
    impact: 8,
    prompt:
      "Rewrite the closing call to action on every page so it matches that page's service and audience.",
  });

  /* ---- Trust ---- */
  if (home && !hasKind(pages, "reviews") && facts.reviewCount > 0) {
    push({
      id: "gem-reviews-block",
      name: "Reviews next to the price",
      category: "Trust",
      why: `You already have ${facts.reviewCount} review${facts.reviewCount === 1 ? "" : "s"}. Shown beside the price they remove the last doubt before someone enquires.`,
      preview: [`${home.title} → reviews block`],
      path: "install",
      impact: 11,
      actions: [
        {
          type: "add_section",
          pageId: home.id,
          kind: "reviews",
          heading: `What people${inArea} say about ${name}`,
          subheading: "Real reviews from real jobs.",
        },
      ],
    });
  }

  if (home && !hasKind(pages, "trust_bar")) {
    push({
      id: "gem-trust-badges",
      name: "Trust badges strip",
      category: "Trust",
      why: "Licensed, insured, guaranteed, years in business — three seconds of reassurance right under the headline.",
      preview: [`${home.title} → trust strip under the hero`],
      path: "install",
      impact: 8,
      actions: [
        {
          type: "add_section",
          pageId: home.id,
          kind: "trust_bar",
          heading: "Licensed · Insured · Guaranteed",
          subheading: facts.guarantee?.trim() || `${name} stands behind every job${inArea}.`,
          position: 1,
        },
      ],
    });
  }

  if (home && !hasKind(pages, "guarantee")) {
    push({
      id: "gem-guarantee",
      name: "Written guarantee",
      category: "Trust",
      why: "Putting your promise in writing moves the risk off the customer — the single cheapest conversion lift there is.",
      preview: [`${home.title} → guarantee block`],
      path: "install",
      impact: 8,
      actions: [
        {
          type: "add_section",
          pageId: home.id,
          kind: "guarantee",
          heading: "Our promise to you",
          subheading:
            facts.guarantee?.trim() || `If it is not right, ${name} comes back and puts it right.`,
        },
      ],
    });
  }

  if (home && facts.mediaCount > 0 && !hasKind(pages, "gallery")) {
    push({
      id: "gem-gallery",
      name: "Work gallery",
      category: "Trust",
      why: `You have ${facts.mediaCount} photo${facts.mediaCount === 1 ? "" : "s"} sitting unused. Finished work sells better than adjectives.`,
      preview: [`${home.title} → gallery of your own photos`],
      path: "install",
      impact: 9,
      actions: [
        {
          type: "add_section",
          pageId: home.id,
          kind: "gallery",
          heading: "Recent work",
          subheading: `A few jobs ${name} finished${inArea}.`,
        },
      ],
    });
  }

  push({
    id: "gem-before-after",
    name: "Before / after slider",
    category: "Trust",
    why: "A dragger between the before and after photo is the most-shared thing on a trade website.",
    preview: ["Assistant plans it around the photo pairs you upload"],
    path: "ask",
    impact: 7,
    prompt: "Add a before and after comparison to my gallery using my uploaded photos.",
  });

  push({
    id: "gem-review-engine",
    name: "Automatic review requests",
    category: "Trust",
    why: "More Google reviews lift both your ranking and your close rate. Revora asks every finished customer for you.",
    preview: ["Already in your Revora system — turn it on and pick the timing"],
    path: "system",
    impact: 10,
    route: "/app/reviews",
    routeLabel: "Open Reviews",
  });

  /* ---- Retain ---- */
  push({
    id: "gem-followup",
    name: "SMS + email follow-up",
    category: "Retain",
    why: "Most enquiries are lost to silence, not to price. Automatic follow-ups keep answering until they book.",
    preview: ["Already in your Revora system — sequences, timing and templates"],
    path: "system",
    impact: 12,
    route: "/app/automations",
    routeLabel: "Open Automations",
  });

  push({
    id: "gem-abandoned-lead",
    name: "Abandoned-enquiry recovery",
    category: "Retain",
    why: "Someone started your form and stopped. One nudge recovers a share of those jobs for free.",
    preview: ["Already in your Revora system — recovery sequence on partial enquiries"],
    path: "system",
    impact: 9,
    route: "/app/automations",
    routeLabel: "Open Automations",
  });

  push({
    id: "gem-crm",
    name: "Lead pipeline / CRM",
    category: "Retain",
    why: "Every enquiry from the site lands in one pipeline so nothing is forgotten in a phone or an inbox.",
    preview: ["Already in your Revora system — stages, owners and history"],
    path: "system",
    impact: 8,
    route: "/app/leads",
    routeLabel: "Open Leads",
  });

  push({
    id: "gem-referral",
    name: "Referral & loyalty offer",
    category: "Retain",
    why: "Your happiest customers know your next customer. A named referral offer makes it easy for them to hand you over.",
    preview: ["Assistant writes the offer and adds it to the site and your follow-ups"],
    path: "ask",
    impact: 7,
    prompt: `Create a referral offer for ${name} customers and add it to my site and my follow-up emails.`,
  });

  push({
    id: "gem-membership",
    name: "Maintenance plan / membership",
    category: "Sell",
    why: "Recurring plans turn one-off jobs into monthly income and lock out your competition.",
    preview: ["Assistant drafts the plan tiers, price and page"],
    path: "ask",
    impact: 9,
    prompt: `Design a monthly maintenance plan for ${first} with two or three tiers, and build the page for it.`,
  });

  /* ---- Sell ---- */
  if (
    facts.services.some((service) => typeof service.price === "number" && service.price! > 0) &&
    !hasKind(pages, "pricing")
  ) {
    push({
      id: "gem-pricing",
      name: "Published from-prices",
      category: "Sell",
      why: "Hiding prices costs you the ready-to-buy visitor. 'From' pricing filters the rest without committing you.",
      preview: [`${home?.title ?? "Home"} → pricing block built from your service list`],
      path: "install",
      impact: 10,
      actions: home
        ? [
            {
              type: "add_section",
              pageId: home.id,
              kind: "pricing",
              heading: "Straight-talking prices",
              subheading: `What ${name} charges${inArea}, before we ever visit.`,
            },
          ]
        : [],
    });
  }

  push({
    id: "gem-upsell",
    name: "Upsells & bundles",
    category: "Sell",
    why: "The cheapest sale you will ever make is the second thing you sell the customer already saying yes.",
    preview: ["Assistant pairs your services into bundles and adds them to the quote flow"],
    path: "ask",
    impact: 8,
    prompt:
      "Look at my services and suggest bundles and upsells, then add them to my pricing and quote pages.",
  });

  push({
    id: "gem-payments",
    name: "Take payments and deposits online",
    category: "Sell",
    why: "A booked job with a deposit paid does not get cancelled for the cheaper quote that arrives tomorrow.",
    preview: ["Already in your Revora system — card payments on quotes and services"],
    path: "system",
    impact: 9,
    route: "/app/quotes",
    routeLabel: "Open Quotes",
  });

  /* ---- Get found ---- */
  if (area && !hasPage(pages, "areas") && !hasKind(pages, "areas") && !hasKind(pages, "area")) {
    push({
      id: "gem-area-pages",
      name: "Service-area pages",
      category: "Get found",
      why: `People search "${first} near me" with a town name attached. A page per town is how you show up for all of them.`,
      preview: [`New page per area you cover, starting with ${area}`],
      path: "install",
      impact: 12,
      actions: [{ type: "add_page", kind: "areas", title: `Areas we cover`, slug: "areas" }],
    });
  }

  push({
    id: "gem-local-seo",
    name: "Local SEO + Google snippet control",
    category: "Get found",
    why: "Your title and description are your advert in Google. Written properly they lift clicks without spending a penny.",
    preview: ["Assistant writes a unique title and description for every page"],
    path: "ask",
    impact: 10,
    prompt:
      "Write a unique Google title and description for every page of my site, using my town and services.",
  });

  push({
    id: "gem-schema",
    name: "Structured data & sitemap",
    category: "Get found",
    why: "Search engines need your business, services and reviews in a format they can read. Revora publishes it for you.",
    preview: [
      "Already live on every published Revora site — business, service and review markup plus sitemap",
    ],
    path: "system",
    impact: 6,
    route: "/app/launch",
    routeLabel: "Open Launch",
  });

  push({
    id: "gem-social",
    name: "Social share cards",
    category: "Get found",
    why: "When someone pastes your link into Facebook or WhatsApp, a proper card with your photo gets far more clicks.",
    preview: ["Assistant sets the share title, description and image per page"],
    path: "ask",
    impact: 6,
    prompt: "Set up the social share titles, descriptions and images for all of my pages.",
  });

  push({
    id: "gem-multilingual",
    name: "Second language version",
    category: "Get found",
    why: "If part of your area speaks another language, a translated version doubles the audience for the same work.",
    preview: ["Assistant translates your pages and keeps both versions in step"],
    path: "ask",
    impact: 5,
    prompt: "Translate my website into Spanish and keep both versions saying the same thing.",
  });

  /* ---- Experience ---- */
  if (facts.backdrop === "none") {
    push({
      id: "gem-backdrop",
      name: "Premium animated backdrop",
      category: "Experience",
      why: "Starfield, aurora, nebula or spotlight behind your pages makes a local business look national-brand expensive.",
      preview: ["Whole site → slow, tasteful animated background (mobile-safe)"],
      path: "install",
      impact: 7,
      actions: [{ type: "set_backdrop", backdrop: "aurora" }],
    });
  }

  const flat = visiblePages(pages)
    .flatMap((page) => page.sections)
    .filter(
      (section) => section.is_visible && !(section.settings as { effect?: string } | null)?.effect,
    );
  if (flat.length) {
    push({
      id: "gem-3d-motion",
      name: "3D depth, glass and gold-glow motion",
      category: "Experience",
      why: "Motion tells the eye what matters. Depth on the hero, glow on the ask, glass on the forms.",
      preview: flat.slice(0, 4).map((section) => `${section.kind} block → premium effect`),
      path: "install",
      impact: 6,
      actions: flat.slice(0, 6).map((section) => ({
        type: "set_section_effect" as const,
        sectionId: section.id,
        effect:
          section.kind === "hero"
            ? ("float_3d" as const)
            : section.kind === "cta"
              ? ("gold_glow" as const)
              : section.kind === "quote" || section.kind === "booking"
                ? ("glass" as const)
                : ("rise" as const),
      })),
    });
  }

  push({
    id: "gem-chatbot",
    name: "AI chat on your website",
    category: "Convert",
    why: "An assistant that answers price, timing and coverage questions at midnight captures the enquiry you would have lost.",
    preview: ["Assistant plans the answers it is allowed to give from your own facts"],
    path: "ask",
    impact: 11,
    prompt: `Add an AI chat assistant to my website that answers questions about ${first}, my prices, my hours and my service area, and collects the visitor's details.`,
  });

  push({
    id: "gem-map",
    name: "Map & service-area coverage",
    category: "Experience",
    why: "'Do you come out to me?' is the most common question you get. A map answers it before they ask.",
    preview: ["Assistant adds a coverage block for the towns you serve"],
    path: "ask",
    impact: 5,
    prompt: "Add a service-area map and coverage list showing every town I cover.",
  });

  push({
    id: "gem-accessibility",
    name: "Accessibility & speed pass",
    category: "Experience",
    why: "Readable contrast, real headings, alt text and light pages. Better for customers, better for Google, fewer complaints.",
    preview: ["Assistant checks every page and fixes what it can safely fix"],
    path: "ask",
    impact: 6,
    prompt:
      "Check my whole site for accessibility, contrast, alt text, heading order and mobile speed, then fix what you safely can.",
  });

  /* ---- Measure ---- */
  push({
    id: "gem-analytics",
    name: "Traffic, source and conversion tracking",
    category: "Measure",
    why: "Know which page, advert or town produced the job — then spend money only where it comes back.",
    preview: ["Already in your Revora system — visitors, sources, leads and bookings"],
    path: "system",
    impact: 8,
    route: "/app/analytics",
    routeLabel: "Open Analytics",
  });

  push({
    id: "gem-ab-test",
    name: "Headline A/B options",
    category: "Measure",
    why: "The headline is 80% of the page. Seeing three strong versions side by side beats guessing once.",
    preview: ["Use Show me options below — pick the winner, install it, roll back any time"],
    path: "ask",
    impact: 7,
    prompt:
      "Give me three different versions of my homepage headline and opening line, aimed at different customers.",
  });

  return out.sort((a, b) => b.impact - a.impact);
}

/* ---------------------------- find what's missing ---------------------------- */

export type GapArea =
  "Conversion" | "Content" | "UX" | "Mobile" | "SEO" | "Accessibility" | "Speed" | "Growth";

export type SiteGap = {
  id: string;
  area: GapArea;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  /** How to close it: a gem id to build, or a prompt for the assistant. */
  gemId?: string;
  prompt?: string;
};

/** A full sweep across features, UX, conversion, SEO, mobile, access and speed. */
export function findGaps(pages: ContentPage[], facts: GemFacts): SiteGap[] {
  const gaps: SiteGap[] = [];
  const shown = visiblePages(pages);
  const sections = shown.flatMap((page) => page.sections.filter((section) => section.is_visible));
  const add = (gap: SiteGap) => gaps.push(gap);

  if (!hasKind(pages, "quote") && !hasKind(pages, "booking"))
    add({
      id: "gap-capture",
      area: "Conversion",
      title: "Nothing on the site captures an enquiry",
      detail: "Every visitor has to find your phone number and choose to ring it. Most will not.",
      severity: "high",
      gemId: "gem-instant-quote",
    });

  const noCta = shown.filter(
    (page) =>
      !page.sections.some(
        (section) =>
          section.is_visible && (section.kind === "cta" || section.kind === "sticky_cta"),
      ),
  );
  if (noCta.length)
    add({
      id: "gap-cta",
      area: "Conversion",
      title: `${noCta.length} page${noCta.length === 1 ? "" : "s"} end without asking for the job`,
      detail: noCta.map((page) => page.title).join(", "),
      severity: "high",
      prompt: "Add a strong closing call to action to every page that is missing one.",
    });

  if (!hasKind(pages, "sticky_cta"))
    add({
      id: "gap-mobile-cta",
      area: "Mobile",
      title: "No always-visible call button on phones",
      detail:
        "Most of your visitors are on a phone with one thumb. Keep the call button pinned to the bottom.",
      severity: "medium",
      gemId: "gem-sticky-cta",
    });

  const thin = shown.filter(
    (page) =>
      page.sections.filter((section) => section.is_visible).length < 3 &&
      page.kind !== "thanks" &&
      page.kind !== "privacy",
  );
  if (thin.length)
    add({
      id: "gap-thin",
      area: "Content",
      title: `${thin.length} page${thin.length === 1 ? "" : "s"} are too thin to rank or convince`,
      detail: thin.map((page) => page.title).join(", "),
      severity: "medium",
      prompt: `Fill out these thin pages with useful, specific content: ${thin.map((p) => p.title).join(", ")}.`,
    });

  if (!facts.reviewCount)
    add({
      id: "gap-proof",
      area: "Growth",
      title: "No reviews to show",
      detail:
        "Proof is the cheapest conversion lift you can get. Revora can request reviews from finished customers automatically.",
      severity: "high",
      gemId: "gem-review-engine",
    });

  if (!facts.mediaCount)
    add({
      id: "gap-photos",
      area: "Content",
      title: "No photos of your own work",
      detail:
        "Stock-free, real photos outperform any wording you can write. Six good ones is enough to start.",
      severity: "medium",
      prompt:
        "Tell me exactly which photos to upload for my business and where each one should go on the site.",
    });

  if (!facts.services.length)
    add({
      id: "gap-services",
      area: "Content",
      title: "No services listed",
      detail: "Your services drive your pages, your quotes and everything Google indexes.",
      severity: "high",
      prompt: "Help me list my services with a short description and a from-price for each.",
    });
  else if (
    !facts.services.some((service) => typeof service.price === "number" && service.price! > 0)
  )
    add({
      id: "gap-prices",
      area: "Conversion",
      title: "No prices anywhere",
      detail:
        "Ready-to-buy visitors leave when there is no price signal at all. A 'from' price is enough.",
      severity: "medium",
      gemId: "gem-pricing",
    });

  const noSeo = shown.filter((page) => blank(page.seo_title) || blank(page.seo_description));
  if (noSeo.length)
    add({
      id: "gap-seo",
      area: "SEO",
      title: `${noSeo.length} page${noSeo.length === 1 ? "" : "s"} have no Google title or description`,
      detail:
        "Google will invent them for you, usually badly. These two lines are your advert in search.",
      severity: "high",
      gemId: "gem-local-seo",
    });

  const hidden = pages.filter((page) => page.noindex && page.is_visible);
  if (hidden.length)
    add({
      id: "gap-noindex",
      area: "SEO",
      title: `${hidden.length} page${hidden.length === 1 ? "" : "s"} are hidden from Google`,
      detail: hidden.map((page) => page.title).join(", "),
      severity: "medium",
      prompt: `Let Google list these pages again: ${hidden.map((p) => p.title).join(", ")}.`,
    });

  if (blank(facts.metaDescription) || blank(facts.headline))
    add({
      id: "gap-meta",
      area: "SEO",
      title: "The site headline or search description is blank",
      detail:
        "These are the first words a customer reads about you, on your page and in search results.",
      severity: "high",
      prompt: "Write my main headline and search description from my business facts.",
    });

  const heroes = sections.filter((section) => section.kind === "hero");
  const weakHero = heroes.find(
    (section) => blank(section.heading) || (section.heading ?? "").trim().length < 18,
  );
  if (weakHero)
    add({
      id: "gap-hero",
      area: "UX",
      title: "The opening headline does not say what you do or where",
      detail:
        "A visitor decides in about three seconds. The headline must name the job and the town.",
      severity: "high",
      prompt:
        "Rewrite my hero headline and opening line so they say exactly what I do, where, and what to do next.",
    });

  const longBody = sections.find((section) => (section.body ?? "").length > 900);
  if (longBody)
    add({
      id: "gap-readability",
      area: "UX",
      title: "A block of text is too long to be read on a phone",
      detail:
        "Break long paragraphs into short lines and bullets so people skim and still get the point.",
      severity: "low",
      prompt:
        "Find any over-long paragraphs on my site and rewrite them as short, skimmable lines.",
    });

  if (!hasKind(pages, "faq"))
    add({
      id: "gap-faq",
      area: "UX",
      title: "No answers to the questions that stop people enquiring",
      detail:
        "Price, timing, coverage and guarantee. Answer them on the page or they will not ask.",
      severity: "medium",
      prompt:
        "Add an FAQ that answers price, how soon you can come, the areas you cover and your guarantee.",
    });

  if (!facts.phone || !facts.email)
    add({
      id: "gap-contact",
      area: "UX",
      title: "Your contact details are incomplete",
      detail:
        "A missing phone or email quietly kills enquiries from people who prefer that channel.",
      severity: "high",
      prompt:
        "Ask me for my missing contact details and put them everywhere they belong on the site.",
    });

  const noAlt =
    sections.filter((section) => section.kind === "gallery").length && facts.mediaCount > 0;
  if (noAlt)
    add({
      id: "gap-alt",
      area: "Accessibility",
      title: "Check photo descriptions (alt text)",
      detail: "Alt text helps screen readers and gives Google another way to understand your work.",
      severity: "low",
      prompt: "Write proper alt text for all of my gallery photos.",
    });

  const heavy = sections.length > 24;
  if (heavy)
    add({
      id: "gap-speed",
      area: "Speed",
      title: "Pages are getting long — check load speed on mobile",
      detail:
        "Long pages with many blocks slow phones down. Trim, split or lazy-load the heaviest parts.",
      severity: "low",
      prompt: "Review my longest pages for mobile speed and tell me what to split or simplify.",
    });

  if (!hasKind(pages, "areas") && !hasKind(pages, "area") && areaOf(facts))
    add({
      id: "gap-local",
      area: "Growth",
      title: "No page for the towns you cover",
      detail:
        "Local searches include a place name. Without area pages you never appear for most of them.",
      severity: "medium",
      gemId: "gem-area-pages",
    });

  const order: Record<SiteGap["severity"], number> = { high: 0, medium: 1, low: 2 };
  return gaps.sort((a, b) => order[a.severity] - order[b.severity]);
}

/* ------------------------------- think ahead ------------------------------ */

export type NextMove = {
  id: string;
  title: string;
  reason: string;
  prompt?: string;
  gemId?: string;
};

/** The three or four things Revora would do next, in order, and why. */
export function thinkAhead(pages: ContentPage[], facts: GemFacts): NextMove[] {
  const gaps = findGaps(pages, facts);
  const gems = suggestGems(pages, facts);
  const moves: NextMove[] = [];

  for (const gap of gaps.slice(0, 3)) {
    const move: NextMove = {
      id: `move-${gap.id}`,
      title: gap.title,
      reason: gap.detail,
    };
    if (gap.gemId) move.gemId = gap.gemId;
    if (gap.prompt) move.prompt = gap.prompt;
    moves.push(move);
  }

  for (const gem of gems.filter((g) => g.path === "install").slice(0, 2)) {
    moves.push({
      id: `move-${gem.id}`,
      title: `Install ${gem.name.toLowerCase()}`,
      reason: gem.why,
      gemId: gem.id,
    });
  }

  return moves.slice(0, 5);
}

/* ------------------------------- surprise me ------------------------------ */

export type CreativeIdea = { id: string; title: string; pitch: string; prompt: string };

const hash = (value: string) => {
  let out = 0;
  for (let i = 0; i < value.length; i += 1) out = (out * 31 + value.charCodeAt(i)) >>> 0;
  return out;
};

/**
 * Creative, business-specific ideas — different for every client because they
 * are written from their own trade, town and services, and rotated by a seed.
 */
export function surpriseIdeas(facts: GemFacts, seed = 0): CreativeIdea[] {
  const name = nameOf(facts);
  const area = areaOf(facts) || "your area";
  const services = serviceNames(facts);
  const first = services[0] ?? "your main service";
  const second = services[1] ?? first;
  const trade = facts.industry?.trim() || "local service";

  const pool: CreativeIdea[] = [
    {
      id: "idea-cost-guide",
      title: `The ${area} ${first} price guide`,
      pitch: `A page that honestly explains what ${first.toLowerCase()} costs in ${area} and why. It ranks for the searches your competitors are too scared to answer.`,
      prompt: `Write and build a "${first} prices in ${area}" guide page with honest ranges, what changes the price, and a quote form at the end.`,
    },
    {
      id: "idea-mistakes",
      title: `"5 mistakes people make hiring a ${trade}"`,
      pitch:
        "A short, brutally honest page that positions you as the safe choice — and quietly disqualifies the cheap competition.",
      prompt: `Write a "5 mistakes people make when hiring a ${trade} in ${area}" page and add it to my site with a call to action.`,
    },
    {
      id: "idea-emergency",
      title: "Same-day / emergency landing page",
      pitch:
        "Urgent searchers do not read. One page, one phone number, one promise — the highest-value traffic you can catch.",
      prompt: `Build a same-day emergency ${first} page for ${area} with a big call button and a two-field form.`,
    },
    {
      id: "idea-seasonal",
      title: "Seasonal campaign page",
      pitch: `A page built around what ${area} needs this season, refreshed as the weather turns, so you own the seasonal searches.`,
      prompt: `Create a seasonal campaign page for ${first} in ${area}, with an offer and a booking block.`,
    },
    {
      id: "idea-story",
      title: `The ${name} story page`,
      pitch:
        "People hire people. One page with your face, your history and why you started beats any stock photo site.",
      prompt: `Write an "About ${name}" page in my voice — how we started, who we help in ${area}, and what we refuse to do.`,
    },
    {
      id: "idea-compare",
      title: `${first} vs ${second} — which do you need?`,
      pitch:
        "A comparison page that catches people still deciding, and sends both answers to your quote form.",
      prompt: `Build a comparison page: ${first} vs ${second} — who each is for, what each costs, and how to choose.`,
    },
    {
      id: "idea-checklist",
      title: "Downloadable pre-visit checklist",
      pitch:
        "Something genuinely useful in exchange for an email, then your follow-ups do the rest.",
      prompt: `Create a downloadable "before your ${first.toLowerCase()} visit" checklist with an email capture.`,
    },
    {
      id: "idea-neighbourhood",
      title: `Job map of ${area}`,
      pitch:
        "Show the streets and neighbourhoods where you have already worked. Nothing sells local like local.",
      prompt: `Add a "recent jobs around ${area}" section showing the neighbourhoods I cover with short job notes.`,
    },
    {
      id: "idea-video",
      title: "60-second walkthrough video block",
      pitch:
        "One phone-shot video of you explaining the job builds more trust than a page of copy.",
      prompt:
        "Add a short video section to my homepage and tell me exactly what to say in the 60 seconds.",
    },
    {
      id: "idea-guarantee-brand",
      title: "Name your guarantee",
      pitch: `Turn your promise into a brand: "The ${name.split(/\s+/)[0]} Promise". Named guarantees get remembered and repeated.`,
      prompt: `Turn my guarantee into a named promise with a badge and put it across my site.`,
    },
  ];

  const start = (hash(`${name}|${trade}|${area}`) + seed) % pool.length;
  return Array.from({ length: 4 }, (_, index) => pool[(start + index) % pool.length]!);
}
