/**
 * REVORA MASTER BUILDER ENGINE
 * =============================
 * Free-first, deterministic website planning engine.
 *
 * Responsibilities:
 * - Turn natural-language requests into a complete website plan.
 * - Reuse Revora's existing builder contracts.
 * - Generate differentiated pages and sections.
 * - Create conversion-focused structure.
 * - Apply industry-aware copy and visual direction.
 * - Produce SEO, CTA, mobile, FAQ, and trust recommendations.
 *
 * IMPORTANT:
 * This file is a PLANNING layer.
 * It does not directly write to Supabase, Stripe, or the filesystem.
 * The existing site-agent execution layer remains responsible for applying
 * the resulting actions.
 */

import {
  interpretBuilderRequest,
  type BuilderIntent,
  type StyleMood,
} from "./interpreter";
import {
  designDecision,
  hierarchySort,
  type DesignDecision,
} from "./design";
import { getIndustryPlaybook, type IndustryPlaybook } from "./industry";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type MasterSection = {
  id: string;
  kind: string;
  title?: string;
  subtitle?: string;
  visible?: boolean;
  variant?: string;
  components?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type MasterPage = {
  slug: string;
  title: string;
  description?: string;
  sections: MasterSection[];
  seo?: {
    title: string;
    description: string;
    keywords: string[];
  };
};

export type MasterSitePlan = {
  version: "revora-master-1";
  intent: BuilderIntent;
  industry: IndustryPlaybook;
  design: DesignDecision;
  pages: MasterPage[];
  actions: MasterAction[];
  copy: {
    businessName?: string;
    headline: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
    serviceSummary: string;
  };
  seo: {
    siteTitle: string;
    siteDescription: string;
    keywords: string[];
    localSignals: string[];
  };
  quality: {
    score: number;
    checks: string[];
    warnings: string[];
  };
};

export type MasterAction =
  | {
      type: "set_section_text";
      page?: string;
      section: string;
      field: string;
      value: string;
    }
  | {
      type: "set_section_visibility";
      page?: string;
      section: string;
      visible: boolean;
    }
  | {
      type: "set_section_variant";
      page?: string;
      section: string;
      variant: string;
    }
  | {
      type: "add_section";
      page: string;
      section: MasterSection;
      position?: number;
    }
  | {
      type: "delete_section";
      page: string;
      section: string;
    }
  | {
      type: "reorder_sections";
      page: string;
      sectionOrder: string[];
    }
  | {
      type: "set_component";
      page?: string;
      section: string;
      component: string;
      value: unknown;
    }
  | {
      type: "add_component";
      page?: string;
      section: string;
      component: string;
      value: unknown;
    }
  | {
      type: "delete_component";
      page?: string;
      section: string;
      component: string;
    }
  | {
      type: "add_page";
      page: MasterPage;
    }
  | {
      type: "set_page";
      page: string;
      value: Partial<MasterPage>;
    }
  | {
      type: "delete_page";
      page: string;
    }
  | {
      type: "set_theme";
      theme: DesignDecision["theme"];
    }
  | {
      type: "set_backdrop";
      backdrop: DesignDecision["backdrop"];
    }
  | {
      type: "set_section_effect";
      page?: string;
      section: string;
      effect: string;
    }
  | {
      type: "set_business_fact";
      key: string;
      value: string;
    };

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const DEFAULT_PAGES = [
  "home",
  "services",
  "about",
  "contact",
];

const OPTIONAL_PAGES = [
  "pricing",
  "faq",
  "gallery",
  "reviews",
  "booking",
  "areas",
  "blog",
];

const DEFAULT_SECTION_ORDER = [
  "hero",
  "trust_bar",
  "offer",
  "intro",
  "services",
  "benefits",
  "pricing",
  "process",
  "gallery",
  "reviews",
  "guarantee",
  "area",
  "faq",
  "lead_magnet",
  "quote",
  "booking",
  "cta",
  "contact",
  "sticky_cta",
];

/* -------------------------------------------------------------------------- */
/* Safe helpers                                                               */
/* -------------------------------------------------------------------------- */

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function slugify(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function includesAny(text: string, values: string[]): boolean {
  const lower = text.toLowerCase();
  return values.some((value) => lower.includes(value));
}

function safeIndustryLabel(playbook: IndustryPlaybook): string {
  return cleanText(playbook.label) || "local business";
}

function makeSectionId(kind: string, index = 0): string {
  return `${kind}-${index + 1}`;
}

/* -------------------------------------------------------------------------- */
/* Business language                                                          */
/* -------------------------------------------------------------------------- */

function buildHeadline(
  intent: BuilderIntent,
  industry: IndustryPlaybook,
): string {
  const business = safeIndustryLabel(industry);

  if (intent.goals.includes("bookings")) {
    return `Book your next ${business} service with confidence`;
  }

  if (intent.goals.includes("leads")) {
    return `Get the ${business} help you need`;
  }

  if (intent.goals.includes("sales")) {
    return `A better way to choose your next ${business} service`;
  }

  if (intent.goals.includes("local_visibility")) {
    return `Trusted ${business} services in your area`;
  }

  if (intent.goals.includes("trust")) {
    return `Professional ${business} service built around you`;
  }

  return `Professional ${business} service without the hassle`;
}

function buildSubheadline(
  intent: BuilderIntent,
  industry: IndustryPlaybook,
): string {
  const business = safeIndustryLabel(industry);

  if (intent.goals.includes("bookings")) {
    return `Explore services, get answers, and take the next step with a ${business} team that makes the process simple.`;
  }

  if (intent.goals.includes("leads")) {
    return `See what we offer, understand your options, and request the information you need to move forward.`;
  }

  return `Clear information, useful options, and an easy path to get started with your ${business} needs.`;
}

function buildPrimaryCta(intent: BuilderIntent): string {
  if (intent.goals.includes("bookings")) return "Book Now";
  if (intent.goals.includes("quotes")) return "Get a Quote";
  if (intent.goals.includes("leads")) return "Get Started";
  if (intent.goals.includes("calls")) return "Contact Us";
  if (intent.goals.includes("sales")) return "Explore Services";
  return "Get Started";
}

function buildSecondaryCta(intent: BuilderIntent): string {
  if (intent.goals.includes("bookings")) return "View Services";
  if (intent.goals.includes("quotes")) return "View Pricing";
  if (intent.goals.includes("calls")) return "Send a Message";
  return "Learn More";
}

function buildServiceSummary(industry: IndustryPlaybook): string {
  const label = safeIndustryLabel(industry);

  return `Explore professional ${label} services designed to make your next step easier.`;
}

/* -------------------------------------------------------------------------- */
/* Section generation                                                         */
/* -------------------------------------------------------------------------- */

function section(
  kind: string,
  index: number,
  options: Partial<MasterSection> = {},
): MasterSection {
  return {
    id: options.id || makeSectionId(kind, index),
    kind,
    visible: options.visible ?? true,
    ...options,
  };
}

function createHomeSections(
  intent: BuilderIntent,
  industry: IndustryPlaybook,
): MasterSection[] {
  const headline = buildHeadline(intent, industry);
  const subheadline = buildSubheadline(intent, industry);
  const primaryCta = buildPrimaryCta(intent);
  const secondaryCta = buildSecondaryCta(intent);

  const sections: MasterSection[] = [
    section("hero", 0, {
      title: headline,
      subtitle: subheadline,
      variant: intent.visualIntensity >= 2 ? "premium" : "standard",
      metadata: {
        primaryCta,
        secondaryCta,
        imageStrategy: "industry-relevant",
        mobilePriority: "critical",
      },
    }),

    section("trust_bar", 1, {
      title: "Why customers choose us",
      variant: "compact",
      metadata: {
        useOnlyVerifiedFacts: true,
        avoidFabricatedReviews: true,
      },
    }),

    section("services", 2, {
      title: "What we offer",
      subtitle: buildServiceSummary(industry),
      variant: "cards",
      metadata: {
        maxItems: 6,
        iconStyle: "industry-aware",
      },
    }),

    section("benefits", 3, {
      title: "A simpler experience from start to finish",
      variant: "split",
      metadata: {
        emphasizeOutcome: true,
        avoidUnsupportedClaims: true,
      },
    }),

    section("process", 4, {
      title: "How it works",
      variant: "steps",
      metadata: {
        steps: 3,
      },
    }),
  ];

  if (
    intent.goals.includes("quotes") ||
    intent.goals.includes("leads") ||
    intent.goals.includes("sales")
  ) {
    sections.push(
      section("quote", 5, {
        title: "Tell us what you need",
        variant: "conversion",
        metadata: {
          formType: "lead",
          progressiveFields: true,
        },
      }),
    );
  }

  if (intent.goals.includes("bookings")) {
    sections.push(
      section("booking", 6, {
        title: "Book your appointment",
        variant: "conversion",
        metadata: {
          formType: "booking",
        },
      }),
    );
  }

  sections.push(
    section("faq", 7, {
      title: "Frequently asked questions",
      variant: "accordion",
    }),
    section("cta", 8, {
      title: "Ready to take the next step?",
      variant: "strong",
      metadata: {
        primaryCta,
      },
    }),
    section("contact", 9, {
      title: "Contact us",
      variant: "split",
    }),
    section("sticky_cta", 10, {
      title: primaryCta,
      variant: "mobile-sticky",
      metadata: {
        mobileOnly: true,
      },
    }),
  );

  return sections;
}

function createServicesSections(
  industry: IndustryPlaybook,
): MasterSection[] {
  return [
    section("hero", 0, {
      title: `Our ${safeIndustryLabel(industry)} services`,
      subtitle:
        "Explore the services available and choose the option that best fits your needs.",
      variant: "service-hero",
    }),
    section("services", 1, {
      title: "Services",
      variant: "detailed-cards",
      metadata: {
        maxItems: 12,
        includeDescriptions: true,
        includeCta: true,
      },
    }),
    section("benefits", 2, {
      title: "What you can expect",
      variant: "icon-grid",
    }),
    section("process", 3, {
      title: "Our process",
      variant: "steps",
    }),
    section("faq", 4, {
      title: "Service questions",
      variant: "accordion",
    }),
    section("cta", 5, {
      title: "Need help choosing a service?",
      variant: "strong",
    }),
  ];
}

function createAboutSections(
  industry: IndustryPlaybook,
): MasterSection[] {
  return [
    section("hero", 0, {
      title: `About our ${safeIndustryLabel(industry)} business`,
      subtitle:
        "Learn more about who we are, how we work, and what you can expect.",
      variant: "editorial",
    }),
    section("intro", 1, {
      title: "Built around the customer experience",
      variant: "split",
    }),
    section("benefits", 2, {
      title: "What matters to us",
      variant: "icon-grid",
    }),
    section("process", 3, {
      title: "How we work",
      variant: "steps",
    }),
    section("cta", 4, {
      title: "Let's talk about what you need",
      variant: "strong",
    }),
    section("contact", 5, {
      title: "Contact us",
      variant: "split",
    }),
  ];
}

function createContactSections(
  intent: BuilderIntent,
): MasterSection[] {
  const sections: MasterSection[] = [
    section("hero", 0, {
      title: "Let's get started",
      subtitle:
        "Send a message and we'll make it easy to take the next step.",
      variant: "compact",
    }),
  ];

  if (intent.goals.includes("bookings")) {
    sections.push(
      section("booking", 1, {
        title: "Book an appointment",
        variant: "conversion",
      }),
    );
  }

  sections.push(
    section("contact", 2, {
      title: "Contact information",
      variant: "split",
    }),
    section("faq", 3, {
      title: "Before you contact us",
      variant: "accordion",
    }),
  );

  return sections;
}

function createPricingSections(
  industry: IndustryPlaybook,
): MasterSection[] {
  return [
    section("hero", 0, {
      title: `${titleCase(safeIndustryLabel(industry))} pricing`,
      subtitle:
        "Review available options and choose the path that best fits your needs.",
      variant: "pricing-hero",
    }),
    section("pricing", 1, {
      title: "Options",
      variant: "cards",
      metadata: {
        showPrice: true,
        showFeatureList: true,
        showCta: true,
        neverInventPrice: true,
      },
    }),
    section("faq", 2, {
      title: "Pricing questions",
      variant: "accordion",
    }),
    section("cta", 3, {
      title: "Not sure which option is right for you?",
      variant: "strong",
    }),
  ];
}

function createFaqSections(): MasterSection[] {
  return [
    section("hero", 0, {
      title: "Frequently asked questions",
      subtitle:
        "Find answers to common questions before taking the next step.",
      variant: "compact",
    }),
    section("faq", 1, {
      title: "Questions and answers",
      variant: "large-accordion",
      metadata: {
        categories: true,
        searchable: false,
      },
    }),
    section("cta", 2, {
      title: "Still have questions?",
      variant: "strong",
    }),
  ];
}

function createGallerySections(
  industry: IndustryPlaybook,
): MasterSection[] {
  return [
    section("hero", 0, {
      title: `${titleCase(safeIndustryLabel(industry))} gallery`,
      subtitle:
        "Explore examples, visual details, and the work behind the experience.",
      variant: "visual",
    }),
    section("gallery", 1, {
      title: "Our work",
      variant: "masonry",
      metadata: {
        responsive: true,
        lightbox: true,
        lazyLoad: true,
      },
    }),
    section("cta", 2, {
      title: "Ready to discuss your project?",
      variant: "strong",
    }),
  ];
}

function createBookingSections(
  industry: IndustryPlaybook,
): MasterSection[] {
  return [
    section("hero", 0, {
      title: `Book your ${safeIndustryLabel(industry)} service`,
      subtitle:
        "Choose an available time and provide the details needed to get started.",
      variant: "booking-hero",
    }),
    section("booking", 1, {
      title: "Choose a time",
      variant: "full",
      metadata: {
        formType: "booking",
        availabilityDriven: true,
      },
    }),
    section("faq", 2, {
      title: "Booking questions",
      variant: "accordion",
    }),
  ];
}

function createAreasSections(
  industry: IndustryPlaybook,
): MasterSection[] {
  return [
    section("hero", 0, {
      title: `${titleCase(safeIndustryLabel(industry))} service areas`,
      subtitle:
        "See the locations we serve and find the best way to get started.",
      variant: "local",
    }),
    section("area", 1, {
      title: "Areas we serve",
      variant: "local-grid",
      metadata: {
        mapOptional: true,
        useOnlyVerifiedLocations: true,
      },
    }),
    section("services", 2, {
      title: "Services available",
      variant: "compact-cards",
    }),
    section("cta", 3, {
      title: "Check availability for your area",
      variant: "strong",
    }),
  ];
}

/* -------------------------------------------------------------------------- */
/* Page generation                                                            */
/* -------------------------------------------------------------------------- */

function normalisePageSlug(value: string): string {
  const slug = slugify(value);

  const aliases: Record<string, string> = {
    index: "home",
    main: "home",
    landing: "home",
    "home-page": "home",
    service: "services",
    offerings: "services",
    company: "about",
    "about-us": "about",
    "contact-us": "contact",
    pricing: "pricing",
    prices: "pricing",
    questions: "faq",
    "frequently-asked-questions": "faq",
    photos: "gallery",
    portfolio: "gallery",
    appointments: "booking",
    schedule: "booking",
    locations: "areas",
    "service-areas": "areas",
  };

  return aliases[slug] || slug;
}

function createPage(
  slug: string,
  intent: BuilderIntent,
  industry: IndustryPlaybook,
): MasterPage {
  const normalized = normalisePageSlug(slug);

  let sections: MasterSection[];

  switch (normalized) {
    case "home":
      sections = createHomeSections(intent, industry);
      break;

    case "services":
      sections = createServicesSections(industry);
      break;

    case "about":
      sections = createAboutSections(industry);
      break;

    case "contact":
      sections = createContactSections(intent);
      break;

    case "pricing":
      sections = createPricingSections(industry);
      break;

    case "faq":
      sections = createFaqSections();
      break;

    case "gallery":
      sections = createGallerySections(industry);
      break;

    case "booking":
      sections = createBookingSections(industry);
      break;

    case "areas":
      sections = createAreasSections(industry);
      break;

    default:
      sections = createHomeSections(intent, industry);
      break;
  }

  sections = hierarchySort(sections);

  return {
    slug: normalized,
    title:
      normalized === "home"
        ? "Home"
        : titleCase(normalized.replace(/-/g, " ")),
    description: buildPageDescription(normalized, industry),
    sections,
    seo: buildPageSeo(normalized, industry),
  };
}

function buildPageDescription(
  page: string,
  industry: IndustryPlaybook,
): string {
  const label = safeIndustryLabel(industry);

  const descriptions: Record<string, string> = {
    home: `Professional ${label} services with clear information and an easy path to get started.`,
    services: `Explore our ${label} services and find the option that fits your needs.`,
    about: `Learn more about our ${label} business and how we work.`,
    contact: `Contact our ${label} team and take the next step.`,
    pricing: `Review ${label} pricing and available options.`,
    faq: `Answers to common ${label} questions.`,
    gallery: `Explore our ${label} work and visual examples.`,
    booking: `Book a ${label} appointment or service.`,
    areas: `Find ${label} services in the areas we serve.`,
  };

  return descriptions[page] || descriptions.home;
}

function buildPageSeo(
  page: string,
  industry: IndustryPlaybook,
): MasterPage["seo"] {
  const label = safeIndustryLabel(industry);

  const titleMap: Record<string, string> = {
    home: `${titleCase(label)} Services`,
    services: `${titleCase(label)} Services & Options`,
    about: `About Our ${titleCase(label)} Business`,
    contact: `Contact Our ${titleCase(label)} Team`,
    pricing: `${titleCase(label)} Pricing`,
    faq: `${titleCase(label)} FAQ`,
    gallery: `${titleCase(label)} Gallery`,
    booking: `Book ${titleCase(label)} Service`,
    areas: `${titleCase(label)} Service Areas`,
  };

  const description = buildPageDescription(page, industry);

  return {
    title: titleMap[page] || titleMap.home,
    description,
    keywords: unique([
      label.toLowerCase(),
      `${label.toLowerCase()} services`,
      `${label.toLowerCase()} near me`,
      `${label.toLowerCase()} local`,
    ]),
  };
}

/* -------------------------------------------------------------------------- */
/* Page inference                                                             */
/* -------------------------------------------------------------------------- */

function choosePages(intent: BuilderIntent): string[] {
  const pages = [...DEFAULT_PAGES];

  if (intent.goals.includes("sales") || intent.goals.includes("quotes")) {
    pages.push("pricing");
  }

  if (intent.goals.includes("bookings")) {
    pages.push("booking");
  }

  if (intent.goals.includes("local_visibility")) {
    pages.push("areas");
  }

  if (intent.visualIntensity >= 2) {
    pages.push("gallery");
  }

  if (intent.wantsFaq || intent.goals.includes("trust")) {
    pages.push("faq");
  }

  const requested = intent.pages || [];

  for (const requestedPage of requested) {
    const normalized = normalisePageSlug(requestedPage);

    if (
      DEFAULT_PAGES.includes(normalized) ||
      OPTIONAL_PAGES.includes(normalized)
    ) {
      pages.push(normalized);
    }
  }

  return unique(pages);
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

function sectionTextActions(
  pages: MasterPage[],
  copy: MasterSitePlan["copy"],
): MasterAction[] {
  const actions: MasterAction[] = [];

  const home = pages.find((page) => page.slug === "home");

  if (home) {
    actions.push(
      {
        type: "set_section_text",
        page: "home",
        section: "hero",
        field: "title",
        value: copy.headline,
      },
      {
        type: "set_section_text",
        page: "home",
        section: "hero",
        field: "subtitle",
        value: copy.subheadline,
      },
      {
        type: "set_section_text",
        page: "home",
        section: "hero",
        field: "primaryCta",
        value: copy.primaryCta,
      },
    );
  }

  return actions;
}

function pageActions(pages: MasterPage[]): MasterAction[] {
  return pages.map((page) => ({
    type: "add_page",
    page,
  }));
}

function sectionActions(
  pages: MasterPage[],
): MasterAction[] {
  const actions: MasterAction[] = [];

  for (const page of pages) {
    const order = page.sections.map((item) => item.id);

    actions.push({
      type: "reorder_sections",
      page: page.slug,
      sectionOrder: order,
    });

    for (const item of page.sections) {
      actions.push({
        type: "add_section",
        page: page.slug,
        section: item,
      });

      if (item.variant) {
        actions.push({
          type: "set_section_variant",
          page: page.slug,
          section: item.id,
          variant: item.variant,
        });
      }
    }
  }

  return actions;
}

function designActions(design: DesignDecision): MasterAction[] {
  const actions: MasterAction[] = [
    {
      type: "set_theme",
      theme: design.theme,
    },
    {
      type: "set_backdrop",
      backdrop: design.backdrop,
    },
  ];

  return actions;
}

function effectActions(
  pages: MasterPage[],
  design: DesignDecision,
): MasterAction[] {
  const actions: MasterAction[] = [];

  for (const page of pages) {
    const hero = page.sections.find((item) => item.kind === "hero");

    if (hero) {
      actions.push({
        type: "set_section_effect",
        page: page.slug,
        section: hero.id,
        effect: design.heroEffect,
      });
    }

    if (design.bodyEffect !== "none") {
      const candidates = page.sections.filter(
        (item) =>
          item.kind === "benefits" ||
          item.kind === "services" ||
          item.kind === "gallery" ||
          item.kind === "process",
      );

      for (const candidate of candidates.slice(0, 2)) {
        actions.push({
          type: "set_section_effect",
          page: page.slug,
          section: candidate.id,
          effect: design.bodyEffect,
        });
      }
    }
  }

  return actions;
}

/* -------------------------------------------------------------------------- */
/* SEO                                                                       */
/* -------------------------------------------------------------------------- */

function buildSiteSeo(
  industry: IndustryPlaybook,
  intent: BuilderIntent,
): MasterSitePlan["seo"] {
  const label = safeIndustryLabel(industry).toLowerCase();

  const locationSignals = [
    ...(intent.locationHints || []),
    ...(intent.audienceHints || []),
  ];

  const keywords = unique([
    label,
    `${label} services`,
    `${label} near me`,
    `local ${label}`,
    `${label} company`,
    `${label} business`,
    ...locationSignals.map((item) => `${label} ${item}`),
  ]);

  return {
    siteTitle: `${titleCase(label)} Services`,
    siteDescription: `Professional ${label} services with clear information, useful options, and an easy way to get started.`,
    keywords,
    localSignals: unique(locationSignals),
  };
}

/* -------------------------------------------------------------------------- */
/* Quality system                                                             */
/* -------------------------------------------------------------------------- */

function qualityCheck(
  pages: MasterPage[],
  intent: BuilderIntent,
  design: DesignDecision,
): MasterSitePlan["quality"] {
  const checks: string[] = [];
  const warnings: string[] = [];

  const hasHome = pages.some((page) => page.slug === "home");
  const hasServices = pages.some((page) => page.slug === "services");
  const hasContact = pages.some((page) => page.slug === "contact");
  const hasConversionPath = pages.some((page) =>
    page.sections.some(
      (section) =>
        section.kind === "cta" ||
        section.kind === "quote" ||
        section.kind === "booking" ||
        section.kind === "contact",
    ),
  );

  if (hasHome) checks.push("Home page exists.");
  else warnings.push("Home page is missing.");

  if (hasServices) checks.push("Services are represented.");
  else warnings.push("Services page is missing.");

  if (hasContact) checks.push("Contact path exists.");
  else warnings.push("Contact page is missing.");

  if (hasConversionPath) {
    checks.push("At least one conversion path exists.");
  } else {
    warnings.push("No obvious conversion path was generated.");
  }

  if (intent.wantsFaq) {
    const hasFaq = pages.some((page) =>
      page.sections.some((section) => section.kind === "faq"),
    );

    if (hasFaq) checks.push("FAQ coverage included.");
    else warnings.push("FAQ was requested but not generated.");
  }

  if (intent.goals.includes("bookings")) {
    const hasBooking = pages.some((page) =>
      page.sections.some((section) => section.kind === "booking"),
    );

    if (hasBooking) checks.push("Booking flow included.");
    else warnings.push("Booking goal detected without booking section.");
  }

  if (design.visualIntensity >= 2) {
    checks.push("Enhanced visual direction enabled.");
  }

  if (design.visualIntensity >= 3) {
    checks.push("High-impact visual treatment enabled with controlled effects.");
  }

  checks.push("Responsive/mobile-first metadata included.");
  checks.push("SEO metadata generated.");
  checks.push("Unsupported factual claims are avoided by default.");
  checks.push("Stable visual variation can be derived from business seed.");

  const score = Math.max(
    0,
    Math.min(
      100,
      100 -
        warnings.length * 12 +
        Math.min(10, pages.length * 1),
    ),
  );

  return {
    score,
    checks,
    warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* Main engine                                                                */
/* -------------------------------------------------------------------------- */

export function buildMasterPlan(
  request: string,
  options: {
    businessName?: string;
    seedKey?: string;
    existingPages?: string[];
    existingSections?: Record<string, string[]>;
  } = {},
): MasterSitePlan {
  const text = cleanText(request);

  const intent = interpretBuilderRequest(text);

  const industry = getIndustryPlaybook(
    intent.industry || "general",
  );

  const moods: StyleMood[] =
    intent.moods && intent.moods.length > 0
      ? intent.moods
      : ["professional"];

  const design = designDecision(
    industry,
    moods,
    options.seedKey || options.businessName || text,
    intent.visualIntensity,
  );

  const pageSlugs = choosePages(intent);

  const pages = pageSlugs.map((slug) =>
    createPage(slug, intent, industry),
  );

  const copy = {
    businessName: options.businessName,
    headline: buildHeadline(intent, industry),
    subheadline: buildSubheadline(intent, industry),
    primaryCta: buildPrimaryCta(intent),
    secondaryCta: buildSecondaryCta(intent),
    serviceSummary: buildServiceSummary(industry),
  };

  const seo = buildSiteSeo(industry, intent);

  const actions: MasterAction[] = [
    ...designActions(design),
    ...pageActions(pages),
    ...sectionActions(pages),
    ...effectActions(pages, design),
    ...sectionTextActions(pages, copy),
  ];

  const quality = qualityCheck(pages, intent, design);

  return {
    version: "revora-master-1",
    intent,
    industry,
    design,
    pages,
    actions,
    copy,
    seo,
    quality,
  };
}

/**
 * Compatibility alias.
 *
 * Existing Revora code may expect a deterministic-style builder function.
 * Keep both names available so the new engine can be introduced without
 * forcing a simultaneous rewrite of every caller.
 */
export function buildDeterministicPlan(
  request: string,
  options: {
    businessName?: string;
    seedKey?: string;
    existingPages?: string[];
    existingSections?: Record<string, string[]>;
  } = {},
): MasterSitePlan {
  return buildMasterPlan(request, options);
}

/**
 * Smaller API for callers that only need pages/actions.
 */
export function planBuilderRequest(
  request: string,
  options: {
    businessName?: string;
    seedKey?: string;
  } = {},
): MasterSitePlan {
  return buildMasterPlan(request, options);
}

/* -------------------------------------------------------------------------- */
/* Utility exports                                                            */
/* -------------------------------------------------------------------------- */

export function getMasterPageSlugs(
  request: string,
): string[] {
  const intent = interpretBuilderRequest(cleanText(request));
  return choosePages(intent);
}

export function getMasterSectionKinds(
  request: string,
): string[] {
  const plan = buildMasterPlan(request);

  return unique(
    plan.pages.flatMap((page) =>
      page.sections.map((section) => section.kind),
    ),
  );
}

export function getMasterSectionOrder(): string[] {
  return [...DEFAULT_SECTION_ORDER];
}

export default buildMasterPlan;