/**
 * REVORA INDUSTRY INTELLIGENCE ENGINE
 * MASTER / BUILD-SAFE EDITION
 *
 * PURPOSE
 * -------
 * Deterministic industry strategy for the free-first Revora builder.
 *
 * GUARANTEES
 * ----------
 * - No imports
 * - No network
 * - No AI provider
 * - No browser APIs
 * - No Cloudflare APIs
 * - No dynamic code
 * - No external dependencies
 * - No fabricated business facts
 * - Safe for server and client execution
 * - Stable contracts for downstream builder modules
 *
 * IMPORTANT
 * ---------
 * This file provides STRATEGY ONLY.
 * It must never invent:
 * reviews, ratings, awards, licenses, certifications,
 * prices, guarantees, locations, hours, results,
 * years in business, staff credentials, or customer claims.
 */

/* -------------------------------------------------------------------------- */
/* Core types                                                                  */
/* -------------------------------------------------------------------------- */

export type PrimaryAction =
  | "call"
  | "quote"
  | "book"
  | "lead"
  | "visit"
  | "consult";

export type ConversionIntensity =
  | "urgent"
  | "direct"
  | "considered"
  | "relationship";

export type VisualStyle =
  | "clean"
  | "bold"
  | "luxury"
  | "editorial"
  | "technical"
  | "natural"
  | "energetic"
  | "warm";

export type PageKind =
  | "home"
  | "services"
  | "service"
  | "about"
  | "contact"
  | "gallery"
  | "faq"
  | "pricing"
  | "areas"
  | "booking"
  | "menu"
  | "portfolio"
  | "projects"
  | "schedule"
  | "visit"
  | "custom";

export type IndustryPage = {
  kind: string;
  title: string;
  slug: string;
  why: string;
  priority?: number;
};

export type IndustryVisual = {
  primary: string;
  secondary: string;
  accent: string;
  font: string;
  backdrop: string;
  style?: VisualStyle;
  density?: "airy" | "balanced" | "dense";
  radius?: "sharp" | "soft" | "rounded";
  imageTreatment?:
    | "natural"
    | "editorial"
    | "cinematic"
    | "bright"
    | "technical";
  motion?: "subtle" | "moderate" | "energetic";
};

export type IndustrySEO = {
  qualifier: string;
  intent: string;
  patterns?: string[];
  localIntent?: boolean;
  servicePageStrategy?:
    | "strong"
    | "moderate"
    | "limited";
};

export type ConversionPlacement =
  | "hero"
  | "after_intro"
  | "after_services"
  | "after_benefits"
  | "after_process"
  | "after_trust"
  | "after_gallery"
  | "faq"
  | "footer"
  | "sticky";

export type IndustryConversion = {
  intensity: ConversionIntensity;
  primaryAction: PrimaryAction;
  secondaryActions: PrimaryAction[];
  placement: ConversionPlacement[];
  stickyMobile: boolean;
  leadForm: boolean;
};

export type IndustryPlaybook = {
  slug: string;
  label: string;
  aliases: string[];
  pages: IndustryPage[];
  homeSections: string[];
  servicePageSections: string[];
  action: PrimaryAction;
  ctaLabels: {
    primary: string;
    secondary: string;
  };
  terminology: string[];
  trust: string[];
  seo: IndustrySEO;
  visual: IndustryVisual;
  faqSeeds: string[];
  conversion: IndustryConversion;
  schemaType: string;
  servicePageExamples: string[];
  objections: string[];
  contentAngles: string[];
  visualProof: "low" | "medium" | "high";
  urgency: "none" | "situational" | "high";

  readonly [key: string]: unknown;
};

/* -------------------------------------------------------------------------- */
/* Shared page architecture                                                   */
/* -------------------------------------------------------------------------- */

const HOME_PAGE: IndustryPage = {
  kind: "home",
  title: "Home",
  slug: "",
  why: "Primary homepage and conversion destination.",
  priority: 100,
};

const LOCAL_PAGES: IndustryPage[] = [
  {
    kind: "services",
    title: "Services",
    slug: "services",
    why: "Explains the business's actual services.",
    priority: 90,
  },
  {
    kind: "about",
    title: "About",
    slug: "about",
    why: "Explains who the business is and how it works.",
    priority: 70,
  },
  {
    kind: "contact",
    title: "Contact",
    slug: "contact",
    why: "Provides a direct conversion destination.",
    priority: 100,
  },
];

const TRADE_HOME = [
  "hero",
  "trust_bar",
  "services",
  "benefits",
  "process",
  "area",
  "reviews",
  "faq",
  "cta",
  "sticky_cta",
  "contact",
];

const TRADE_SERVICE = [
  "hero",
  "intro",
  "benefits",
  "services",
  "process",
  "faq",
  "cta",
  "contact",
];

const VISUAL_HOME = [
  "hero",
  "intro",
  "services",
  "gallery",
  "benefits",
  "reviews",
  "faq",
  "cta",
  "contact",
];

const VISUAL_SERVICE = [
  "hero",
  "intro",
  "services",
  "gallery",
  "benefits",
  "faq",
  "cta",
];

const PROFESSIONAL_HOME = [
  "hero",
  "trust_bar",
  "intro",
  "services",
  "benefits",
  "process",
  "case_studies",
  "faq",
  "cta",
  "contact",
];

const PROFESSIONAL_SERVICE = [
  "hero",
  "intro",
  "benefits",
  "services",
  "process",
  "faq",
  "cta",
];

/* -------------------------------------------------------------------------- */
/* Shared conversion profiles                                                  */
/* -------------------------------------------------------------------------- */

const CONVERSIONS: Record<
  PrimaryAction,
  IndustryConversion
> = {
  call: {
    intensity: "urgent",
    primaryAction: "call",
    secondaryActions: ["quote", "lead"],
    placement: [
      "hero",
      "after_services",
      "after_process",
      "faq",
      "sticky",
      "footer",
    ],
    stickyMobile: true,
    leadForm: true,
  },

  quote: {
    intensity: "direct",
    primaryAction: "quote",
    secondaryActions: ["call", "lead"],
    placement: [
      "hero",
      "after_services",
      "after_gallery",
      "faq",
      "sticky",
      "footer",
    ],
    stickyMobile: true,
    leadForm: true,
  },

  book: {
    intensity: "direct",
    primaryAction: "book",
    secondaryActions: ["call", "lead"],
    placement: [
      "hero",
      "after_services",
      "after_process",
      "faq",
      "sticky",
      "footer",
    ],
    stickyMobile: true,
    leadForm: true,
  },

  consult: {
    intensity: "considered",
    primaryAction: "consult",
    secondaryActions: ["lead", "call"],
    placement: [
      "hero",
      "after_benefits",
      "after_process",
      "faq",
      "footer",
    ],
    stickyMobile: false,
    leadForm: true,
  },

  visit: {
    intensity: "direct",
    primaryAction: "visit",
    secondaryActions: ["book", "call"],
    placement: [
      "hero",
      "after_gallery",
      "faq",
      "footer",
    ],
    stickyMobile: true,
    leadForm: false,
  },

  lead: {
    intensity: "relationship",
    primaryAction: "lead",
    secondaryActions: ["call", "consult"],
    placement: [
      "hero",
      "after_services",
      "after_benefits",
      "faq",
      "footer",
    ],
    stickyMobile: true,
    leadForm: true,
  },
};

function conversionFor(
  action: PrimaryAction,
): IndustryConversion {
  const source = CONVERSIONS[action];

  return {
    intensity: source.intensity,
    primaryAction: source.primaryAction,
    secondaryActions: [
      ...source.secondaryActions,
    ],
    placement: [
      ...source.placement,
    ],
    stickyMobile: source.stickyMobile,
    leadForm: source.leadForm,
  };
}

/* -------------------------------------------------------------------------- */
/* Page factories                                                              */
/* -------------------------------------------------------------------------- */

function pages(
  extras: IndustryPage[] = [],
): IndustryPage[] {
  return [
    HOME_PAGE,
    ...LOCAL_PAGES,
    ...extras,
  ];
}

function page(
  kind: string,
  title: string,
  slug: string,
  why: string,
  priority = 60,
): IndustryPage {
  return {
    kind,
    title,
    slug,
    why,
    priority,
  };
}

/* -------------------------------------------------------------------------- */
/* Playbook factory                                                            */
/* -------------------------------------------------------------------------- */

type PlaybookInput = Omit<
  IndustryPlaybook,
  "conversion"
> & {
  conversion?: IndustryConversion;
};

function playbook(
  input: PlaybookInput,
): IndustryPlaybook {
  return {
    ...input,
    aliases: uniqueStrings(input.aliases),
    homeSections: uniqueStrings(
      input.homeSections,
    ),
    servicePageSections: uniqueStrings(
      input.servicePageSections,
    ),
    terminology: uniqueStrings(
      input.terminology,
    ),
    trust: uniqueStrings(
      input.trust,
    ),
    faqSeeds: uniqueStrings(
      input.faqSeeds,
    ),
    servicePageExamples: uniqueStrings(
      input.servicePageExamples,
    ),
    objections: uniqueStrings(
      input.objections,
    ),
    contentAngles: uniqueStrings(
      input.contentAngles,
    ),
    conversion:
      input.conversion ??
      conversionFor(input.action),
  };
}

/* -------------------------------------------------------------------------- */
/* Industry definitions                                                        */
/* -------------------------------------------------------------------------- */

const RAW_PLAYBOOKS: IndustryPlaybook[] = [
  playbook({
    slug: "plumbing",
    label: "Plumbing",
    aliases: [
      "plumber",
      "plumbers",
      "plumbing",
      "drain",
      "drains",
      "drain cleaning",
      "leak",
      "leak repair",
      "pipe",
      "pipes",
      "pipework",
      "water heater",
      "water heaters",
      "boiler",
      "boilers",
      "sewer",
      "sewer repair",
      "faucet",
      "toilet repair",
    ],
    pages: pages([
      page(
        "service",
        "Emergency Plumbing",
        "emergency-plumbing",
        "Captures urgent plumbing intent when actually offered.",
        100,
      ),
    ]),
    homeSections: TRADE_HOME,
    servicePageSections: TRADE_SERVICE,
    action: "call",
    ctaLabels: {
      primary: "Call now",
      secondary: "Get a quote",
    },
    terminology: [
      "plumbing repairs",
      "installations",
      "drain clearing",
      "leak detection",
      "water heaters",
      "emergency service",
    ],
    trust: [
      "Licensing",
      "Insurance",
      "Availability",
      "Upfront pricing",
      "Local service",
    ],
    seo: {
      qualifier: "local",
      intent: "plumber near me",
      patterns: [
        "plumber",
        "plumbing repair",
        "emergency plumber",
        "drain cleaning",
        "water heater repair",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#0b6bcb",
      secondary: "#0f172a",
      accent: "#f59e0b",
      font: "sans",
      backdrop: "none",
      style: "technical",
      density: "balanced",
      radius: "soft",
      imageTreatment: "bright",
      motion: "moderate",
    },
    faqSeeds: [
      "How quickly can you get here?",
      "Do you offer emergency service?",
      "Do you provide estimates before work begins?",
      "What areas do you serve?",
    ],
    schemaType: "Plumber",
    servicePageExamples: [
      "Plumbing Repairs",
      "Drain Cleaning",
      "Leak Detection",
      "Water Heater Services",
      "Emergency Plumbing",
    ],
    objections: [
      "How much will this cost?",
      "How quickly can someone come?",
      "Will I know the price before work starts?",
    ],
    contentAngles: [
      "What to do when a pipe leaks",
      "When a drain needs professional attention",
      "How to prepare for a plumbing visit",
    ],
    visualProof: "medium",
    urgency: "high",
  }),

  playbook({
    slug: "hvac",
    label: "Heating & Air Conditioning",
    aliases: [
      "hvac",
      "heating",
      "cooling",
      "air conditioning",
      "air conditioning repair",
      "air con",
      "aircon",
      "ac",
      "ac repair",
      "furnace",
      "furnace repair",
      "heat pump",
      "ductwork",
      "duct cleaning",
      "ventilation",
    ],
    pages: LOCAL_PAGES,
    homeSections: TRADE_HOME,
    servicePageSections: TRADE_SERVICE,
    action: "book",
    ctaLabels: {
      primary: "Book a visit",
      secondary: "Call now",
    },
    terminology: [
      "repairs",
      "installations",
      "maintenance",
      "tune-ups",
      "system replacement",
      "air conditioning",
      "heating",
    ],
    trust: [
      "Qualified technicians",
      "Maintenance plans",
      "Written estimates",
      "Equipment knowledge",
      "Local service",
    ],
    seo: {
      qualifier: "local",
      intent: "HVAC repair near me",
      patterns: [
        "HVAC repair",
        "AC repair",
        "heating repair",
        "air conditioning service",
        "HVAC installation",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#0891b2",
      secondary: "#0b1220",
      accent: "#f97316",
      font: "sans",
      backdrop: "none",
      style: "technical",
      density: "balanced",
      radius: "soft",
      imageTreatment: "bright",
      motion: "moderate",
    },
    faqSeeds: [
      "How quickly can you schedule a visit?",
      "Do you service my equipment?",
      "Do you provide maintenance plans?",
      "When should an HVAC system be replaced?",
    ],
    schemaType: "HVACBusiness",
    servicePageExamples: [
      "AC Repair",
      "Heating Repair",
      "HVAC Maintenance",
      "Air Conditioning Installation",
      "Heating Installation",
    ],
    objections: [
      "How soon can someone inspect the system?",
      "Should I repair or replace it?",
      "How much will the work cost?",
    ],
    contentAngles: [
      "Signs an HVAC system needs attention",
      "Repair versus replacement considerations",
      "How regular maintenance helps equipment",
    ],
    visualProof: "medium",
    urgency: "high",
  }),

  playbook({
    slug: "roofing",
    label: "Roofing",
    aliases: [
      "roof",
      "roofer",
      "roofers",
      "roofing",
      "shingles",
      "shingle",
      "metal roofing",
      "flat roof",
      "roof leak",
      "roof repair",
      "storm damage",
      "roof replacement",
      "gutter",
      "gutters",
    ],
    pages: pages([
      page(
        "projects",
        "Projects",
        "projects",
        "Provides a visual project destination when genuine project material exists.",
        80,
      ),
    ]),
    homeSections: TRADE_HOME,
    servicePageSections: TRADE_SERVICE,
    action: "quote",
    ctaLabels: {
      primary: "Get a quote",
      secondary: "See our work",
    },
    terminology: [
      "roof repair",
      "roof replacement",
      "roof inspection",
      "storm damage",
      "shingles",
      "gutters",
    ],
    trust: [
      "Licensing",
      "Insurance",
      "Inspection",
      "Written estimates",
      "Workmanship information",
    ],
    seo: {
      qualifier: "local",
      intent: "roofing contractor near me",
      patterns: [
        "roof repair",
        "roof replacement",
        "roof inspection",
        "storm damage roofing",
        "roofing contractor",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#1d4ed8",
      secondary: "#111827",
      accent: "#eab308",
      font: "sans",
      backdrop: "none",
      style: "bold",
      density: "balanced",
      radius: "soft",
      imageTreatment: "cinematic",
      motion: "moderate",
    },
    faqSeeds: [
      "How does a roof inspection work?",
      "How long does a roof replacement usually take?",
      "Do you provide written estimates?",
      "Do you work with storm-damage projects?",
    ],
    schemaType: "RoofingContractor",
    servicePageExamples: [
      "Roof Repair",
      "Roof Replacement",
      "Roof Inspections",
      "Storm Damage",
      "Gutter Services",
    ],
    objections: [
      "Is the inspection free?",
      "How long will the project take?",
      "How do I compare roofing quotes?",
    ],
    contentAngles: [
      "Signs a roof may need repair",
      "Repair versus replacement",
      "Questions to ask before choosing a roofer",
    ],
    visualProof: "high",
    urgency: "situational",
  }),

  playbook({
    slug: "electrical",
    label: "Electrical",
    aliases: [
      "electric",
      "electrical",
      "electrician",
      "electricians",
      "electrician service",
      "wiring",
      "rewiring",
      "rewire",
      "electrical panel",
      "panel upgrade",
      "breaker",
      "outlet",
      "lighting",
      "ev charger",
      "ev charging",
      "electrical contractor",
    ],
    pages: pages([
      page(
        "service",
        "Electrical Services",
        "electrical-services",
        "Groups electrical work into a clear service destination.",
        95,
      ),
    ]),
    homeSections: TRADE_HOME,
    servicePageSections: TRADE_SERVICE,
    action: "call",
    ctaLabels: {
      primary: "Call an electrician",
      secondary: "Get a quote",
    },
    terminology: [
      "repairs",
      "rewiring",
      "panel upgrades",
      "lighting",
      "safety inspections",
      "EV chargers",
    ],
    trust: [
      "Licensing",
      "Insurance",
      "Qualified electricians",
      "Safety-focused work",
      "Written estimates",
    ],
    seo: {
      qualifier: "local",
      intent: "electrician near me",
      patterns: [
        "electrician",
        "electrical repair",
        "electrical panel upgrade",
        "rewiring",
        "EV charger installation",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#f59e0b",
      secondary: "#0f172a",
      accent: "#22d3ee",
      font: "sans",
      backdrop: "none",
      style: "technical",
      density: "balanced",
      radius: "soft",
      imageTreatment: "technical",
      motion: "moderate",
    },
    faqSeeds: [
      "Are you licensed for electrical work?",
      "Can you inspect an electrical panel?",
      "Can you install EV charging equipment?",
      "How soon can you schedule service?",
    ],
    schemaType: "Electrician",
    servicePageExamples: [
      "Electrical Repairs",
      "Panel Upgrades",
      "Rewiring",
      "Lighting",
      "EV Charger Installation",
    ],
    objections: [
      "Is the work safe and compliant?",
      "How much will the repair cost?",
      "How soon can an electrician come?",
    ],
    contentAngles: [
      "Signs of an electrical problem",
      "When an electrical panel may need attention",
      "Preparing for an electrical inspection",
    ],
    visualProof: "medium",
    urgency: "situational",
  }),

  playbook({
    slug: "landscaping",
    label: "Landscaping",
    aliases: [
      "landscape",
      "landscaping",
      "landscaper",
      "lawn",
      "lawn care",
      "garden",
      "gardening",
      "yard",
      "yards",
      "turf",
      "tree service",
      "hardscape",
      "hardscaping",
      "mulch",
      "irrigation",
    ],
    pages: pages([
      page(
        "gallery",
        "Our Work",
        "our-work",
        "Provides a visual project destination when genuine imagery exists.",
        90,
      ),
    ]),
    homeSections: VISUAL_HOME,
    servicePageSections: VISUAL_SERVICE,
    action: "quote",
    ctaLabels: {
      primary: "Get a quote",
      secondary: "See our work",
    },
    terminology: [
      "landscape design",
      "lawn care",
      "planting",
      "hardscaping",
      "maintenance",
      "seasonal cleanups",
      "irrigation",
    ],
    trust: [
      "Insurance",
      "Project planning",
      "Maintenance plans",
      "Local service",
      "Portfolio",
    ],
    seo: {
      qualifier: "local",
      intent: "landscaping near me",
      patterns: [
        "landscaping",
        "lawn care",
        "landscape design",
        "hardscaping",
        "yard maintenance",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#15803d",
      secondary: "#052e16",
      accent: "#facc15",
      font: "serif",
      backdrop: "none",
      style: "natural",
      density: "airy",
      radius: "rounded",
      imageTreatment: "natural",
      motion: "subtle",
    },
    faqSeeds: [
      "Do you offer ongoing maintenance?",
      "Do you provide landscape design?",
      "How does the quote process work?",
      "What areas do you serve?",
    ],
    schemaType: "LandscapingBusiness",
    servicePageExamples: [
      "Lawn Care",
      "Landscape Design",
      "Planting",
      "Hardscaping",
      "Seasonal Cleanup",
    ],
    objections: [
      "What will the project cost?",
      "How long will the work take?",
      "Can you maintain the property afterward?",
    ],
    contentAngles: [
      "Planning a landscape project",
      "Choosing between lawn and landscape services",
      "Preparing an outdoor space for a project",
    ],
    visualProof: "high",
    urgency: "none",
  }),

  playbook({
    slug: "cleaning",
    label: "Cleaning",
    aliases: [
      "clean",
      "cleaning",
      "cleaner",
      "cleaners",
      "house cleaning",
      "home cleaning",
      "commercial cleaning",
      "janitorial",
      "maid",
      "housekeeping",
      "deep clean",
      "deep cleaning",
      "move out cleaning",
      "move-out cleaning",
    ],
    pages: LOCAL_PAGES,
    homeSections: VISUAL_HOME,
    servicePageSections: VISUAL_SERVICE,
    action: "book",
    ctaLabels: {
      primary: "Book a clean",
      secondary: "Get a price",
    },
    terminology: [
      "regular cleaning",
      "deep cleaning",
      "move-out cleaning",
      "commercial cleaning",
      "recurring service",
    ],
    trust: [
      "Insurance",
      "Staff information",
      "Supplies",
      "Flexible scheduling",
      "Service standards",
    ],
    seo: {
      qualifier: "local",
      intent: "cleaning service near me",
      patterns: [
        "house cleaning",
        "cleaning service",
        "deep cleaning",
        "commercial cleaning",
        "move-out cleaning",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#0ea5e9",
      secondary: "#0f172a",
      accent: "#a3e635",
      font: "sans",
      backdrop: "none",
      style: "clean",
      density: "airy",
      radius: "rounded",
      imageTreatment: "bright",
      motion: "subtle",
    },
    faqSeeds: [
      "Do you bring cleaning supplies?",
      "Can I schedule recurring cleaning?",
      "What is included in a deep clean?",
      "Do you clean commercial spaces?",
    ],
    schemaType: "CleaningService",
    servicePageExamples: [
      "House Cleaning",
      "Deep Cleaning",
      "Move-Out Cleaning",
      "Commercial Cleaning",
      "Recurring Cleaning",
    ],
    objections: [
      "What is included?",
      "Do I need to provide supplies?",
      "How does scheduling work?",
    ],
    contentAngles: [
      "What to expect from a deep clean",
      "Preparing a home for professional cleaning",
      "Choosing recurring versus one-time cleaning",
    ],
    visualProof: "medium",
    urgency: "none",
  }),

  playbook({
    slug: "construction",
    label: "Construction",
    aliases: [
      "construction",
      "builder",
      "builders",
      "building",
      "general contractor",
      "contractor",
      "groundwork",
      "groundworks",
      "commercial construction",
      "residential construction",
      "construction company",
    ],
    pages: pages([
      page(
        "projects",
        "Projects",
        "projects",
        "Provides project proof when genuine project material exists.",
        100,
      ),
    ]),
    homeSections: PROFESSIONAL_HOME,
    servicePageSections: PROFESSIONAL_SERVICE,
    action: "consult",
    ctaLabels: {
      primary: "Request a consultation",
      secondary: "See projects",
    },
    terminology: [
      "new builds",
      "extensions",
      "renovations",
      "groundworks",
      "project management",
      "commercial projects",
    ],
    trust: [
      "Licensing",
      "Insurance",
      "Project planning",
      "Site safety",
      "References",
    ],
    seo: {
      qualifier: "local",
      intent: "construction company near me",
      patterns: [
        "general contractor",
        "construction company",
        "building contractor",
        "home construction",
        "commercial construction",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#334155",
      secondary: "#0b1220",
      accent: "#f59e0b",
      font: "sans",
      backdrop: "none",
      style: "bold",
      density: "balanced",
      radius: "soft",
      imageTreatment: "cinematic",
      motion: "moderate",
    },
    faqSeeds: [
      "How does the consultation process work?",
      "How are projects estimated?",
      "Who manages the project?",
      "Can I see examples of completed work?",
    ],
    schemaType: "GeneralContractor",
    servicePageExamples: [
      "Residential Construction",
      "Commercial Construction",
      "Renovations",
      "Extensions",
      "Project Management",
    ],
    objections: [
      "What will the project cost?",
      "How long will construction take?",
      "Who manages the project?",
    ],
    contentAngles: [
      "How construction projects are planned",
      "What to ask before hiring a contractor",
      "Understanding project stages",
    ],
    visualProof: "high",
    urgency: "none",
  }),

  playbook({
    slug: "remodeling",
    label: "Remodeling",
    aliases: [
      "remodel",
      "remodeling",
      "remodelling",
      "renovation",
      "renovations",
      "home renovation",
      "kitchen remodeling",
      "kitchen remodel",
      "bathroom remodeling",
      "bathroom remodel",
      "home improvement",
    ],
    pages: pages([
      page(
        "projects",
        "Projects",
        "projects",
        "Provides visual proof when genuine project imagery exists.",
        100,
      ),
    ]),
    homeSections: VISUAL_HOME,
    servicePageSections: VISUAL_SERVICE,
    action: "consult",
    ctaLabels: {
      primary: "Book a design call",
      secondary: "See our work",
    },
    terminology: [
      "kitchen remodeling",
      "bathroom remodeling",
      "whole-home renovation",
      "design and build",
      "renovation",
    ],
    trust: [
      "Insurance",
      "Project planning",
      "Design process",
      "Portfolio",
      "Written estimates",
    ],
    seo: {
      qualifier: "local",
      intent: "home remodeling near me",
      patterns: [
        "kitchen remodeling",
        "bathroom remodeling",
        "home renovation",
        "home remodeling",
        "renovation contractor",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#7c3aed",
      secondary: "#160f2e",
      accent: "#f5d0a9",
      font: "serif",
      backdrop: "none",
      style: "luxury",
      density: "airy",
      radius: "rounded",
      imageTreatment: "editorial",
      motion: "subtle",
    },
    faqSeeds: [
      "How does the remodeling process work?",
      "Do you provide design assistance?",
      "How are remodeling projects estimated?",
      "Can I see completed projects?",
    ],
    schemaType: "GeneralContractor",
    servicePageExamples: [
      "Kitchen Remodeling",
      "Bathroom Remodeling",
      "Whole-Home Remodeling",
      "Home Renovations",
      "Design & Build",
    ],
    objections: [
      "How long will the project take?",
      "How disruptive will the work be?",
      "How do I plan a remodeling budget?",
    ],
    contentAngles: [
      "Planning a kitchen remodel",
      "How to prepare for a renovation",
      "Questions to ask before starting a remodel",
    ],
    visualProof: "high",
    urgency: "none",
  }),

  playbook({
    slug: "painting",
    label: "Painting & Decorating",
    aliases: [
      "paint",
      "painting",
      "painter",
      "painters",
      "house painter",
      "commercial painter",
      "decorating",
      "decorator",
      "interior painting",
      "exterior painting",
      "wallpaper",
      "wallpapering",
    ],
    pages: pages([
      page(
        "gallery",
        "Our Work",
        "our-work",
        "Provides visual proof when genuine imagery exists.",
        90,
      ),
    ]),
    homeSections: VISUAL_HOME,
    servicePageSections: VISUAL_SERVICE,
    action: "quote",
    ctaLabels: {
      primary: "Get a quote",
      secondary: "See our work",
    },
    terminology: [
      "interior painting",
      "exterior painting",
      "surface preparation",
      "commercial painting",
      "decorating",
    ],
    trust: [
      "Insurance",
      "Preparation",
      "Clean finish",
      "Colour guidance",
      "Portfolio",
    ],
    seo: {
      qualifier: "professional",
      intent: "painters near me",
      patterns: [
        "house painters",
        "interior painters",
        "exterior painters",
        "commercial painting",
        "painting contractor",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#2563eb",
      secondary: "#0f172a",
      accent: "#fb7185",
      font: "sans",
      backdrop: "none",
      style: "clean",
      density: "airy",
      radius: "rounded",
      imageTreatment: "bright",
      motion: "subtle",
    },
    faqSeeds: [
      "How is the surface prepared?",
      "How many coats are normally needed?",
      "Do you handle interior and exterior work?",
      "How long does a painting project take?",
    ],
    schemaType: "HousePainter",
    servicePageExamples: [
      "Interior Painting",
      "Exterior Painting",
      "Commercial Painting",
      "Colour Consultation",
      "Decorating",
    ],
    objections: [
      "Will the preparation be thorough?",
      "How long will the project take?",
      "How will furniture and surfaces be protected?",
    ],
    contentAngles: [
      "How professional painting is prepared",
      "Choosing interior versus exterior finishes",
      "Preparing a property for painters",
    ],
    visualProof: "high",
    urgency: "none",
  }),

  playbook({
    slug: "automotive",
    label: "Automotive",
    aliases: [
      "auto",
      "automotive",
      "mechanic",
      "mechanics",
      "garage",
      "auto repair",
      "car repair",
      "vehicle repair",
      "detailing",
      "car detailing",
      "tire",
      "tyre",
      "brakes",
      "oil change",
      "diagnostics",
      "vehicle service",
    ],
    pages: pages([
      page(
        "service",
        "Auto Services",
        "auto-services",
        "Groups high-intent vehicle services.",
        95,
      ),
    ]),
    homeSections: TRADE_HOME,
    servicePageSections: TRADE_SERVICE,
    action: "book",
    ctaLabels: {
      primary: "Book my car in",
      secondary: "Call the garage",
    },
    terminology: [
      "servicing",
      "diagnostics",
      "repairs",
      "maintenance",
      "brakes",
      "detailing",
      "tires",
    ],
    trust: [
      "Qualified technicians",
      "Transparent pricing",
      "Parts information",
      "Service updates",
      "Appointment scheduling",
    ],
    seo: {
      qualifier: "local",
      intent: "auto repair near me",
      patterns: [
        "auto repair",
        "mechanic",
        "car service",
        "brake repair",
        "auto diagnostics",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#dc2626",
      secondary: "#0b0f19",
      accent: "#f8fafc",
      font: "sans",
      backdrop: "none",
      style: "bold",
      density: "dense",
      radius: "soft",
      imageTreatment: "cinematic",
      motion: "moderate",
    },
    faqSeeds: [
      "How do I book a service?",
      "How long will the work take?",
      "Do you provide diagnostics?",
      "Can I get an estimate before repairs begin?",
    ],
    schemaType: "AutoRepair",
    servicePageExamples: [
      "Auto Repair",
      "Vehicle Diagnostics",
      "Brake Service",
      "Car Maintenance",
      "Auto Detailing",
    ],
    objections: [
      "How much will the repair cost?",
      "How long will my vehicle be unavailable?",
      "Will I receive an estimate first?",
    ],
    contentAngles: [
      "Signs your vehicle needs attention",
      "Preparing for a vehicle service",
      "Questions to ask before approving repairs",
    ],
    visualProof: "medium",
    urgency: "situational",
  }),

  playbook({
    slug: "real_estate",
    label: "Real Estate",
    aliases: [
      "real estate",
      "realtor",
      "realtors",
      "realty",
      "estate agent",
      "property",
      "property agent",
      "property management",
      "lettings",
      "homes for sale",
      "real estate agent",
    ],
    pages: [
      HOME_PAGE,
      page(
        "services",
        "Services",
        "services",
        "Explains the actual services offered.",
        90,
      ),
      page(
        "portfolio",
        "Properties",
        "properties",
        "Provides a property destination when actual property data exists.",
        95,
      ),
      page(
        "about",
        "About",
        "about",
        "Explains the business and its approach.",
        70,
      ),
      page(
        "contact",
        "Contact",
        "contact",
        "Provides an inquiry destination.",
        100,
      ),
    ],
    homeSections: PROFESSIONAL_HOME,
    servicePageSections: PROFESSIONAL_SERVICE,
    action: "consult",
    ctaLabels: {
      primary: "Request a consultation",
      secondary: "View properties",
    },
    terminology: [
      "buying",
      "selling",
      "valuation",
      "property search",
      "property marketing",
      "management",
    ],
    trust: [
      "Local market knowledge",
      "Clear communication",
      "Property marketing",
      "Regular updates",
      "Transparent fees",
    ],
    seo: {
      qualifier: "local",
      intent: "real estate agent near me",
      patterns: [
        "real estate agent",
        "realtor",
        "homes for sale",
        "property agent",
        "property management",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#0f766e",
      secondary: "#04211f",
      accent: "#d4af37",
      font: "serif",
      backdrop: "none",
      style: "editorial",
      density: "airy",
      radius: "soft",
      imageTreatment: "editorial",
      motion: "subtle",
    },
    faqSeeds: [
      "How does the consultation process work?",
      "What services do you offer?",
      "How are fees structured?",
      "How do you market properties?",
    ],
    schemaType: "RealEstateAgent",
    servicePageExamples: [
      "Buying",
      "Selling",
      "Property Valuation",
      "Property Management",
      "Property Marketing",
    ],
    objections: [
      "How much are the fees?",
      "How will my property be marketed?",
      "Who will be my main contact?",
    ],
    contentAngles: [
      "Preparing a property for sale",
      "Questions to ask a real estate professional",
      "Understanding the property-selling process",
    ],
    visualProof: "high",
    urgency: "none",
  }),

  playbook({
    slug: "legal",
    label: "Legal",
    aliases: [
      "law",
      "legal",
      "lawyer",
      "lawyers",
      "attorney",
      "attorneys",
      "solicitor",
      "solicitors",
      "law firm",
      "legal firm",
      "legal services",
      "conveyancing",
    ],
    pages: [
      HOME_PAGE,
      page(
        "services",
        "Practice Areas",
        "practice-areas",
        "Helps visitors identify relevant legal services.",
        100,
      ),
      page(
        "about",
        "About",
        "about",
        "Provides verified practice information.",
        80,
      ),
      page(
        "faq",
        "FAQ",
        "faq",
        "Answers general process questions.",
        60,
      ),
      page(
        "contact",
        "Contact",
        "contact",
        "Provides a consultation route.",
        100,
      ),
    ],
    homeSections: PROFESSIONAL_HOME,
    servicePageSections: PROFESSIONAL_SERVICE,
    action: "consult",
    ctaLabels: {
      primary: "Request a consultation",
      secondary: "View practice areas",
    },
    terminology: [
      "practice areas",
      "consultation",
      "representation",
      "legal services",
      "case evaluation",
    ],
    trust: [
      "Professional credentials",
      "Confidentiality",
      "Clear communication",
      "Fee information",
      "Practice experience",
    ],
    seo: {
      qualifier: "local",
      intent: "lawyer near me",
      patterns: [
        "law firm",
        "lawyer",
        "attorney",
        "legal services",
        "legal consultation",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#1e3a8a",
      secondary: "#0b1220",
      accent: "#d4af37",
      font: "serif",
      backdrop: "none",
      style: "luxury",
      density: "airy",
      radius: "soft",
      imageTreatment: "editorial",
      motion: "subtle",
    },
    faqSeeds: [
      "How does an initial consultation work?",
      "How are legal fees structured?",
      "What information should I bring?",
      "How do I contact the practice?",
    ],
    schemaType: "LegalService",
    servicePageExamples: [
      "Practice Areas",
      "Consultations",
      "Legal Representation",
      "Legal Advice",
    ],
    objections: [
      "How much will this cost?",
      "What happens during the first consultation?",
      "Will my information remain confidential?",
    ],
    contentAngles: [
      "Preparing for a legal consultation",
      "Questions to ask before choosing legal representation",
      "Understanding the first steps in a legal matter",
    ],
    visualProof: "low",
    urgency: "situational",
  }),

  playbook({
    slug: "medical",
    label: "Medical",
    aliases: [
      "medical",
      "clinic",
      "doctor",
      "doctors",
      "physician",
      "physiotherapy",
      "physio",
      "chiropractor",
      "health clinic",
      "healthcare",
      "wellness clinic",
    ],
    pages: [
      HOME_PAGE,
      page(
        "services",
        "Services",
        "services",
        "Explains the actual services supplied.",
        100,
      ),
      page(
        "about",
        "About",
        "about",
        "Provides verified clinic information.",
        75,
      ),
      page(
        "faq",
        "FAQ",
        "faq",
        "Answers administrative questions.",
        65,
      ),
      page(
        "contact",
        "Contact",
        "contact",
        "Provides appointment access.",
        100,
      ),
    ],
    homeSections: PROFESSIONAL_HOME,
    servicePageSections: PROFESSIONAL_SERVICE,
    action: "book",
    ctaLabels: {
      primary: "Book an appointment",
      secondary: "Call the clinic",
    },
    terminology: [
      "appointments",
      "consultations",
      "assessments",
      "treatments",
      "follow-up",
      "care",
    ],
    trust: [
      "Professional credentials",
      "Clinic information",
      "Appointment availability",
      "Clear pricing",
      "Patient information",
    ],
    seo: {
      qualifier: "local",
      intent: "clinic near me",
      patterns: [
        "clinic",
        "doctor",
        "medical clinic",
        "physiotherapy",
        "chiropractor",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#0d9488",
      secondary: "#08201f",
      accent: "#60a5fa",
      font: "sans",
      backdrop: "none",
      style: "clean",
      density: "airy",
      radius: "rounded",
      imageTreatment: "bright",
      motion: "subtle",
    },
    faqSeeds: [
      "How do I book an appointment?",
      "What should I bring to an appointment?",
      "What are your opening hours?",
      "How do I contact the clinic?",
    ],
    schemaType: "MedicalBusiness",
    servicePageExamples: [
      "Consultations",
      "Assessments",
      "Treatments",
      "Follow-Up Care",
    ],
    objections: [
      "How do I book?",
      "What happens during an appointment?",
      "What information should I bring?",
    ],
    contentAngles: [
      "What to expect from an appointment",
      "Preparing for a first visit",
      "Understanding the clinic's services",
    ],
    visualProof: "low",
    urgency: "situational",
  }),

  playbook({
    slug: "dental",
    label: "Dental",
    aliases: [
      "dental",
      "dentist",
      "dentists",
      "dental practice",
      "orthodontist",
      "orthodontic",
      "implants",
      "dental implants",
      "hygienist",
      "teeth whitening",
      "cosmetic dentistry",
    ],
    pages: [
      HOME_PAGE,
      page(
        "services",
        "Dental Services",
        "services",
        "Lets visitors identify relevant treatments.",
        100,
      ),
      page(
        "about",
        "About",
        "about",
        "Provides verified practice information.",
        70,
      ),
      page(
        "faq",
        "FAQ",
        "faq",
        "Answers general administrative questions.",
        60,
      ),
      page(
        "contact",
        "Contact",
        "contact",
        "Provides appointment access.",
        100,
      ),
    ],
    homeSections: PROFESSIONAL_HOME,
    servicePageSections: PROFESSIONAL_SERVICE,
    action: "book",
    ctaLabels: {
      primary: "Book an appointment",
      secondary: "Call the practice",
    },
    terminology: [
      "check-ups",
      "hygiene",
      "cosmetic dentistry",
      "implants",
      "orthodontics",
      "emergency appointments",
    ],
    trust: [
      "Professional credentials",
      "Patient information",
      "Clear pricing",
      "Appointment availability",
      "Practice information",
    ],
    seo: {
      qualifier: "local",
      intent: "dentist near me",
      patterns: [
        "dentist",
        "dental practice",
        "dental implants",
        "teeth whitening",
        "emergency dentist",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#0284c7",
      secondary: "#0b1b2b",
      accent: "#f472b6",
      font: "sans",
      backdrop: "none",
      style: "clean",
      density: "airy",
      radius: "rounded",
      imageTreatment: "bright",
      motion: "subtle",
    },
    faqSeeds: [
      "Are you accepting new patients?",
      "How do I book an appointment?",
      "What services do you provide?",
      "What should I expect at a first appointment?",
    ],
    schemaType: "Dentist",
    servicePageExamples: [
      "Dental Check-Ups",
      "Dental Hygiene",
      "Cosmetic Dentistry",
      "Dental Implants",
      "Orthodontics",
    ],
    objections: [
      "How much does treatment cost?",
      "How do I book?",
      "What happens at the first appointment?",
    ],
    contentAngles: [
      "Preparing for a dental appointment",
      "Understanding different dental services",
      "Questions to ask before treatment",
    ],
    visualProof: "medium",
    urgency: "situational",
  }),

  playbook({
    slug: "restaurant",
    label: "Restaurant & Food",
    aliases: [
      "restaurant",
      "restaurants",
      "cafe",
      "coffee shop",
      "coffee",
      "bakery",
      "food",
      "catering",
      "bar",
      "takeaway",
      "takeout",
      "pizzeria",
      "pizza",
      "diner",
      "bistro",
    ],
    pages: [
      HOME_PAGE,
      page(
        "menu",
        "Menu",
        "menu",
        "Provides menu information.",
        100,
      ),
      page(
        "visit",
        "Visit Us",
        "visit",
        "Combines visit information.",
        90,
      ),
      page(
        "about",
        "About",
        "about",
        "Adds business personality and context.",
        65,
      ),
      page(
        "contact",
        "Contact",
        "contact",
        "Provides inquiry information.",
        70,
      ),
    ],
    homeSections: VISUAL_HOME,
    servicePageSections: VISUAL_SERVICE,
    action: "visit",
    ctaLabels: {
      primary: "Book a table",
      secondary: "View the menu",
    },
    terminology: [
      "menu",
      "reservations",
      "opening hours",
      "takeout",
      "catering",
      "private events",
    ],
    trust: [
      "Menu information",
      "Opening hours",
      "Dietary information",
      "Location",
      "Booking information",
    ],
    seo: {
      qualifier: "local",
      intent: "restaurant near me",
      patterns: [
        "restaurant",
        "cafe",
        "coffee shop",
        "bakery",
        "catering",
      ],
      localIntent: true,
      servicePageStrategy: "moderate",
    },
    visual: {
      primary: "#b91c1c",
      secondary: "#1c0a0a",
      accent: "#f5d0a9",
      font: "serif",
      backdrop: "none",
      style: "editorial",
      density: "airy",
      radius: "soft",
      imageTreatment: "cinematic",
      motion: "subtle",
    },
    faqSeeds: [
      "Do you take reservations?",
      "Where are you located?",
      "What are your opening hours?",
      "Do you accommodate dietary requirements?",
    ],
    schemaType: "Restaurant",
    servicePageExamples: [
      "Menu",
      "Catering",
      "Private Events",
      "Reservations",
    ],
    objections: [
      "What is on the menu?",
      "Do I need a reservation?",
      "Where are you located?",
    ],
    contentAngles: [
      "What to expect when visiting",
      "How reservations work",
      "Menu and dietary information",
    ],
    visualProof: "high",
    urgency: "none",
  }),

  playbook({
    slug: "beauty",
    label: "Beauty & Salon",
    aliases: [
      "beauty",
      "salon",
      "hair salon",
      "hairdresser",
      "barber",
      "barbershop",
      "nails",
      "nail salon",
      "spa",
      "lashes",
      "eyelashes",
      "aesthetics",
      "skincare",
      "beautician",
    ],
    pages: [
      HOME_PAGE,
      page(
        "services",
        "Treatments",
        "treatments",
        "Explains available treatments.",
        100,
      ),
      page(
        "gallery",
        "Our Work",
        "our-work",
        "Provides visual proof when genuine imagery exists.",
        90,
      ),
      page(
        "contact",
        "Contact",
        "contact",
        "Provides booking information.",
        90,
      ),
    ],
    homeSections: VISUAL_HOME,
    servicePageSections: VISUAL_SERVICE,
    action: "book",
    ctaLabels: {
      primary: "Book now",
      secondary: "See treatments",
    },
    terminology: [
      "treatments",
      "appointments",
      "packages",
      "aftercare",
      "gift vouchers",
    ],
    trust: [
      "Training",
      "Hygiene",
      "Patch testing",
      "Aftercare",
      "Treatment information",
    ],
    seo: {
      qualifier: "local",
      intent: "salon near me",
      patterns: [
        "salon",
        "hair salon",
        "barber",
        "beauty salon",
        "spa",
        "nail salon",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#be185d",
      secondary: "#1b0713",
      accent: "#f5d0a9",
      font: "serif",
      backdrop: "none",
      style: "luxury",
      density: "airy",
      radius: "rounded",
      imageTreatment: "editorial",
      motion: "subtle",
    },
    faqSeeds: [
      "How do I book?",
      "How long does a treatment take?",
      "Do you offer gift vouchers?",
      "Do I need a patch test?",
    ],
    schemaType: "BeautySalon",
    servicePageExamples: [
      "Hair Services",
      "Beauty Treatments",
      "Nail Services",
      "Spa Treatments",
      "Aesthetics",
    ],
    objections: [
      "How do I book?",
      "What should I expect?",
      "How long does the appointment take?",
    ],
    contentAngles: [
      "Preparing for an appointment",
      "Choosing the right treatment",
      "Aftercare information",
    ],
    visualProof: "high",
    urgency: "none",
  }),

  playbook({
    slug: "fitness",
    label: "Fitness",
    aliases: [
      "gym",
      "fitness",
      "personal trainer",
      "personal training",
      "training",
      "coach",
      "coaching",
      "yoga",
      "pilates",
      "crossfit",
      "strength training",
      "fitness studio",
    ],
    pages: [
      HOME_PAGE,
      page(
        "services",
        "Programs",
        "programs",
        "Explains memberships, classes and training options.",
        100,
      ),
      page(
        "schedule",
        "Schedule",
        "schedule",
        "Useful when actual schedules are supplied.",
        80,
      ),
      page(
        "about",
        "About",
        "about",
        "Explains the training approach.",
        65,
      ),
      page(
        "contact",
        "Contact",
        "contact",
        "Provides an inquiry route.",
        80,
      ),
    ],
    homeSections: VISUAL_HOME,
    servicePageSections: VISUAL_SERVICE,
    action: "lead",
    ctaLabels: {
      primary: "Get started",
      secondary: "See programs",
    },
    terminology: [
      "memberships",
      "classes",
      "personal training",
      "programs",
      "coaching",
      "training plans",
    ],
    trust: [
      "Coach credentials",
      "Class information",
      "Membership details",
      "Facility information",
      "Beginner guidance",
    ],
    seo: {
      qualifier: "local",
      intent: "gym near me",
      patterns: [
        "gym",
        "fitness studio",
        "personal trainer",
        "yoga",
        "pilates",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#ea580c",
      secondary: "#0b0f19",
      accent: "#22d3ee",
      font: "sans",
      backdrop: "none",
      style: "energetic",
      density: "dense",
      radius: "soft",
      imageTreatment: "cinematic",
      motion: "energetic",
    },
    faqSeeds: [
      "Do you offer beginner programs?",
      "How do memberships work?",
      "Can I book a class?",
      "Do you offer personal training?",
    ],
    schemaType: "SportsActivityLocation",
    servicePageExamples: [
      "Memberships",
      "Personal Training",
      "Group Classes",
      "Training Programs",
    ],
    objections: [
      "Is this suitable for beginners?",
      "How much does membership cost?",
      "How do I get started?",
    ],
    contentAngles: [
      "How to choose a training program",
      "What beginners can expect",
      "How memberships and classes work",
    ],
    visualProof: "high",
    urgency: "none",
  }),

  playbook({
    slug: "professional_services",
    label: "Professional Services",
    aliases: [
      "professional services",
      "accountant",
      "accounting",
      "bookkeeper",
      "bookkeeping",
      "consultant",
      "consulting",
      "marketing agency",
      "agency",
      "it support",
      "insurance",
      "financial advisor",
      "business consultant",
      "business services",
    ],
    pages: [
      HOME_PAGE,
      page(
        "services",
        "Services",
        "services",
        "Makes the actual service scope understandable.",
        100,
      ),
      page(
        "about",
        "About",
        "about",
        "Adds business and process context.",
        80,
      ),
      page(
        "faq",
        "FAQ",
        "faq",
        "Reduces uncertainty around engagement.",
        60,
      ),
      page(
        "contact",
        "Contact",
        "contact",
        "Creates a consultation route.",
        100,
      ),
    ],
    homeSections: PROFESSIONAL_HOME,
    servicePageSections: PROFESSIONAL_SERVICE,
    action: "consult",
    ctaLabels: {
      primary: "Book a call",
      secondary: "See services",
    },
    terminology: [
      "services",
      "consultation",
      "onboarding",
      "strategy",
      "reporting",
      "support",
    ],
    trust: [
      "Credentials",
      "Experience",
      "Process",
      "Clear pricing",
      "Direct communication",
    ],
    seo: {
      qualifier: "local",
      intent: "professional services near me",
      patterns: [
        "accountant",
        "bookkeeper",
        "consultant",
        "business consultant",
        "professional services",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#1d4ed8",
      secondary: "#0b1220",
      accent: "#22c55e",
      font: "sans",
      backdrop: "none",
      style: "clean",
      density: "balanced",
      radius: "soft",
      imageTreatment: "editorial",
      motion: "subtle",
    },
    faqSeeds: [
      "How does onboarding work?",
      "How are fees structured?",
      "Who will be my main contact?",
      "How do I get started?",
    ],
    schemaType: "ProfessionalService",
    servicePageExamples: [
      "Consulting",
      "Accounting",
      "Bookkeeping",
      "Business Support",
      "Strategy",
    ],
    objections: [
      "What will this cost?",
      "How does the engagement work?",
      "What happens after the first call?",
    ],
    contentAngles: [
      "What to prepare for a consultation",
      "How professional service engagements work",
      "Questions to ask before hiring a consultant",
    ],
    visualProof: "medium",
    urgency: "none",
  }),

  playbook({
    slug: "home_services",
    label: "Home Services",
    aliases: [
      "home service",
      "home services",
      "handyman",
      "handyman services",
      "pest control",
      "pest",
      "locksmith",
      "flooring",
      "flooring contractor",
      "windows",
      "window installation",
      "fencing",
      "fence",
      "pressure washing",
      "gutter cleaning",
      "appliance repair",
      "moving",
      "movers",
      "removals",
    ],
    pages: LOCAL_PAGES,
    homeSections: TRADE_HOME,
    servicePageSections: TRADE_SERVICE,
    action: "quote",
    ctaLabels: {
      primary: "Get a quote",
      secondary: "Call now",
    },
    terminology: [
      "repairs",
      "installations",
      "maintenance",
      "callouts",
      "home services",
    ],
    trust: [
      "Insurance",
      "Service areas",
      "Written estimates",
      "Scheduling",
      "Local service",
    ],
    seo: {
      qualifier: "local",
      intent: "home services near me",
      patterns: [
        "handyman",
        "home services",
        "pressure washing",
        "pest control",
        "home repair",
      ],
      localIntent: true,
      servicePageStrategy: "strong",
    },
    visual: {
      primary: "#2563eb",
      secondary: "#0f172a",
      accent: "#f59e0b",
      font: "sans",
      backdrop: "none",
      style: "bold",
      density: "balanced",
      radius: "soft",
      imageTreatment: "bright",
      motion: "moderate",
    },
    faqSeeds: [
      "How soon can you schedule service?",
      "Is the estimate free?",
      "What areas do you serve?",
      "What should I expect during the visit?",
    ],
    schemaType: "HomeAndConstructionBusiness",
    servicePageExamples: [
      "Home Repairs",
      "Maintenance",
      "Installations",
      "Pressure Washing",
      "Handyman Services",
    ],
    objections: [
      "How much will it cost?",
      "How quickly can you come?",
      "Do you serve my area?",
    ],
    contentAngles: [
      "Preparing for a home-service visit",
      "When to call a professional",
      "How to compare service estimates",
    ],
    visualProof: "medium",
    urgency: "situational",
  }),

  playbook({
    slug: "local_business",
    label: "Local Business",
    aliases: [
      "local business",
      "small business",
      "shop",
      "store",
      "retail",
      "photography",
      "photographer",
      "pet",
      "pet services",
      "tutoring",
      "education",
      "events",
      "event services",
      "business",
    ],
    pages: [
      HOME_PAGE,
      page(
        "services",
        "Services",
        "services",
        "Explains the actual services or products.",
        90,
      ),
      page(
        "about",
        "About",
        "about",
        "Explains the business.",
        70,
      ),
      page(
        "contact",
        "Contact",
        "contact",
        "Provides a direct contact route.",
        100,
      ),
      page(
        "gallery",
        "Gallery",
        "gallery",
        "Provides a visual destination when genuine imagery exists.",
        60,
      ),
    ],
    homeSections: VISUAL_HOME,
    servicePageSections: VISUAL_SERVICE,
    action: "lead",
    ctaLabels: {
      primary: "Get in touch",
      secondary: "See what we do",
    },
    terminology: [
      "services",
      "products",
      "how it works",
      "getting started",
      "contact",
    ],
    trust: [
      "Local service",
      "Business information",
      "Availability",
      "Clear communication",
      "Customer support",
    ],
    seo: {
      qualifier: "local",
      intent: "near me",
      patterns: [
        "local business",
        "services near me",
        "local services",
      ],
      localIntent: true,
      servicePageStrategy: "moderate",
    },
    visual: {
      primary: "#4f46e5",
      secondary: "#0f172a",
      accent: "#f59e0b",
      font: "sans",
      backdrop: "none",
      style: "clean",
      density: "balanced",
      radius: "rounded",
      imageTreatment: "natural",
      motion: "subtle",
    },
    faqSeeds: [
      "Where are you located?",
      "What services do you offer?",
      "What are your hours?",
      "How do I get started?",
    ],
    schemaType: "LocalBusiness",
    servicePageExamples: [
      "Services",
      "Products",
      "What We Do",
      "Getting Started",
    ],
    objections: [
      "Where are you located?",
      "How do I contact you?",
      "What exactly do you offer?",
    ],
    contentAngles: [
      "How the business works",
      "What new customers should know",
      "How to get started",
    ],
    visualProof: "medium",
    urgency: "none",
  }),
];

/* -------------------------------------------------------------------------- */
/* Immutable-ish exported library                                              */
/* -------------------------------------------------------------------------- */

export const INDUSTRY_PLAYBOOKS: IndustryPlaybook[] =
  RAW_PLAYBOOKS.map((item) => ({
    ...item,
    aliases: [...item.aliases],
    pages: item.pages.map((p) => ({ ...p })),
    homeSections: [...item.homeSections],
    servicePageSections: [
      ...item.servicePageSections,
    ],
    terminology: [...item.terminology],
    trust: [...item.trust],
    faqSeeds: [...item.faqSeeds],
    servicePageExamples: [
      ...item.servicePageExamples,
    ],
    objections: [...item.objections],
    contentAngles: [...item.contentAngles],
    seo: {
      ...item.seo,
      patterns: item.seo.patterns
        ? [...item.seo.patterns]
        : [],
    },
    visual: { ...item.visual },
    conversion: {
      ...item.conversion,
      secondaryActions: [
        ...item.conversion.secondaryActions,
      ],
      placement: [
        ...item.conversion.placement,
      ],
    },
  }));

export const GENERIC_PLAYBOOK: IndustryPlaybook =
  INDUSTRY_PLAYBOOKS.find(
    (item) => item.slug === "local_business",
  ) ?? INDUSTRY_PLAYBOOKS[0]!;

/* -------------------------------------------------------------------------- */
/* Safe normalization                                                          */
/* -------------------------------------------------------------------------- */

function normalizeText(
  value: string | null | undefined,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(
  value: string,
): string[] {
  const normalized = normalizeText(value);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(" ")
    .filter(Boolean);
}

function uniqueStrings(
  values: string[],
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const clean = value.trim();

    if (!clean) {
      continue;
    }

    const key = normalizeText(clean);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(clean);
  }

  return result;
}

function containsPhrase(
  haystack: string,
  needle: string,
): boolean {
  if (!haystack || !needle) {
    return false;
  }

  return (
    haystack === needle ||
    haystack.includes(` ${needle} `) ||
    haystack.startsWith(`${needle} `) ||
    haystack.endsWith(` ${needle}`)
  );
}

/* -------------------------------------------------------------------------- */
/* Matching                                                                    */
/* -------------------------------------------------------------------------- */

function scoreAlias(
  haystack: string,
  tokens: Set<string>,
  alias: string,
): number {
  const normalizedAlias =
    normalizeText(alias);

  if (!normalizedAlias) {
    return 0;
  }

  const aliasTokens =
    tokenize(normalizedAlias);

  if (!aliasTokens.length) {
    return 0;
  }

  if (
    containsPhrase(
      haystack,
      normalizedAlias,
    )
  ) {
    return (
      120 +
      Math.min(
        normalizedAlias.length,
        60,
      )
    );
  }

  if (
    aliasTokens.length === 1 &&
    tokens.has(aliasTokens[0]!)
  ) {
    return (
      55 +
      Math.min(
        normalizedAlias.length,
        20,
      )
    );
  }

  if (aliasTokens.length > 1) {
    let overlap = 0;

    for (const token of aliasTokens) {
      if (tokens.has(token)) {
        overlap += 1;
      }
    }

    const ratio =
      overlap / aliasTokens.length;

    if (ratio === 1) {
      return (
        90 +
        Math.min(
          normalizedAlias.length,
          40,
        )
      );
    }

    if (ratio >= 0.66) {
      return 45 + overlap * 12;
    }

    if (ratio >= 0.5) {
      return 25 + overlap * 8;
    }
  }

  return 0;
}

function scoreCandidate(
  candidate: IndustryPlaybook,
  haystack: string,
  tokens: Set<string>,
): {
  score: number;
  strongestAliasLength: number;
} {
  const aliases = uniqueStrings([
    candidate.label,
    candidate.slug.replace(
      /_/g,
      " ",
    ),
    ...candidate.aliases,
  ]);

  let score = 0;
  let strongestAliasLength = 0;
  let supportingHits = 0;

  for (const alias of aliases) {
    const aliasScore =
      scoreAlias(
        haystack,
        tokens,
        alias,
      );

    if (aliasScore > score) {
      score = aliasScore;
    }

    if (aliasScore >= 45) {
      supportingHits += 1;
    }

    if (aliasScore > 0) {
      strongestAliasLength =
        Math.max(
          strongestAliasLength,
          normalizeText(alias).length,
        );
    }
  }

  score += Math.min(
    supportingHits * 4,
    20,
  );

  if (
    candidate.slug !==
    "local_business"
  ) {
    score += 2;
  }

  return {
    score,
    strongestAliasLength,
  };
}

/* -------------------------------------------------------------------------- */
/* Primary industry detection                                                  */
/* -------------------------------------------------------------------------- */

export function playbookFor(
  ...hints: (
    | string
    | null
    | undefined
  )[]
): IndustryPlaybook {
  const usable =
    hints
      .filter(
        (
          hint,
        ): hint is string =>
          typeof hint === "string" &&
          Boolean(hint.trim()),
      )
      .map(normalizeText)
      .filter(Boolean);

  if (!usable.length) {
    return GENERIC_PLAYBOOK;
  }

  const haystack =
    usable.join(" ");

  const tokens =
    new Set(
      tokenize(haystack),
    );

  let best:
    | {
        playbook: IndustryPlaybook;
        score: number;
        aliasLength: number;
      }
    | undefined;

  for (
    const candidate of INDUSTRY_PLAYBOOKS
  ) {
    const result =
      scoreCandidate(
        candidate,
        haystack,
        tokens,
      );

    if (result.score <= 0) {
      continue;
    }

    if (
      !best ||
      result.score > best.score ||
      (
        result.score === best.score &&
        result.strongestAliasLength >
          best.aliasLength
      ) ||
      (
        result.score === best.score &&
        result.strongestAliasLength ===
          best.aliasLength &&
        candidate.slug <
          best.playbook.slug
      )
    ) {
      best = {
        playbook: candidate,
        score: result.score,
        aliasLength:
          result.strongestAliasLength,
      };
    }
  }

  return (
    best?.playbook ??
    GENERIC_PLAYBOOK
  );
}

/* -------------------------------------------------------------------------- */
/* Confidence                                                                  */
/* -------------------------------------------------------------------------- */

export function industryConfidence(
  ...hints: (
    | string
    | null
    | undefined
  )[]
): "high" | "medium" | "low" {
  const usable =
    hints.filter(
      (
        hint,
      ): hint is string =>
        typeof hint === "string" &&
        Boolean(hint.trim()),
    );

  if (!usable.length) {
    return "low";
  }

  const haystack =
    usable
      .map(normalizeText)
      .filter(Boolean)
      .join(" ");

  if (!haystack) {
    return "low";
  }

  const tokens =
    new Set(
      tokenize(haystack),
    );

  const best =
    playbookFor(...usable);

  if (
    best ===
    GENERIC_PLAYBOOK
  ) {
    return "low";
  }

  const result =
    scoreCandidate(
      best,
      haystack,
      tokens,
    );

  if (result.score >= 120) {
    return "high";
  }

  if (result.score >= 60) {
    return "medium";
  }

  return "low";
}

/* -------------------------------------------------------------------------- */
/* Detection helpers                                                           */
/* -------------------------------------------------------------------------- */

export function mentionsIndustry(
  text: string,
): boolean {
  if (
    typeof text !== "string" ||
    !text.trim()
  ) {
    return false;
  }

  return (
    playbookFor(text) !==
    GENERIC_PLAYBOOK
  );
}

export function detectConfidentIndustry(
  ...hints: (
    | string
    | null
    | undefined
  )[]
): IndustryPlaybook {
  const detected =
    playbookFor(...hints);

  if (
    detected ===
    GENERIC_PLAYBOOK
  ) {
    return GENERIC_PLAYBOOK;
  }

  const confidence =
    industryConfidence(...hints);

  return confidence === "low"
    ? GENERIC_PLAYBOOK
    : detected;
}

/* -------------------------------------------------------------------------- */
/* Ranked matches                                                              */
/* -------------------------------------------------------------------------- */

export function rankIndustryMatches(
  ...hints: (
    | string
    | null
    | undefined
  )[]
): IndustryPlaybook[] {
  const haystack =
    hints
      .filter(
        (
          hint,
        ): hint is string =>
          typeof hint === "string" &&
          Boolean(hint.trim()),
      )
      .map(normalizeText)
      .filter(Boolean)
      .join(" ");

  if (!haystack) {
    return [GENERIC_PLAYBOOK];
  }

  const tokens =
    new Set(
      tokenize(haystack),
    );

  return INDUSTRY_PLAYBOOKS
    .map((candidate) => {
      const result =
        scoreCandidate(
          candidate,
          haystack,
          tokens,
        );

      return {
        candidate,
        score: result.score,
        aliasLength:
          result.strongestAliasLength,
      };
    })
    .filter(
      (item) =>
        item.score > 0 ||
        item.candidate ===
          GENERIC_PLAYBOOK,
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.aliasLength -
          a.aliasLength ||
        a.candidate.slug.localeCompare(
          b.candidate.slug,
        ),
    )
    .map(
      (item) =>
        item.candidate,
    );
}

/* -------------------------------------------------------------------------- */
/* CTA helpers                                                                 */
/* -------------------------------------------------------------------------- */

export function primaryCta(
  industry: IndustryPlaybook,
): string {
  return (
    industry.ctaLabels.primary.trim() ||
    "Get started"
  );
}

export function secondaryCta(
  industry: IndustryPlaybook,
): string {
  return (
    industry.ctaLabels.secondary.trim() ||
    "Learn more"
  );
}

export function fallbackActions(
  industry: IndustryPlaybook,
): PrimaryAction[] {
  return uniqueStrings([
    industry.conversion.primaryAction,
    ...industry.conversion.secondaryActions,
  ]) as PrimaryAction[];
}

export function conversionPathFor(
  industry: IndustryPlaybook,
): PrimaryAction[] {
  return fallbackActions(industry);
}

export function conversionPlacementFor(
  industry: IndustryPlaybook,
): ConversionPlacement[] {
  return Array.from(
    new Set(
      industry.conversion.placement,
    ),
  );
}

export function shouldUseStickyMobileCta(
  industry: IndustryPlaybook,
): boolean {
  return Boolean(
    industry.conversion.stickyMobile,
  );
}

export function shouldUseLeadForm(
  industry: IndustryPlaybook,
): boolean {
  return Boolean(
    industry.conversion.leadForm,
  );
}

export function shouldPrioritizeVisualProof(
  industry: IndustryPlaybook,
): boolean {
  return (
    industry.visualProof === "high" ||
    industry.visualProof === "medium"
  );
}

export function canUseUrgencyMessaging(
  industry: IndustryPlaybook,
): boolean {
  return industry.urgency !== "none";
}

/* -------------------------------------------------------------------------- */
/* Page helpers                                                                */
/* -------------------------------------------------------------------------- */

function normalizedSlug(
  value: string,
): string {
  return normalizeText(
    value.replace(/^\/+/, ""),
  ).replace(
    /\s+/g,
    "-",
  );
}

export function recommendedPages(
  industry: IndustryPlaybook,
): IndustryPage[] {
  const map =
    new Map<string, IndustryPage>();

  for (
    const current of [
      HOME_PAGE,
      ...industry.pages,
    ]
  ) {
    const key =
      normalizedSlug(
        current.slug ||
          current.title,
      ) || "home";

    if (!map.has(key)) {
      map.set(
        key,
        {
          ...current,
          priority:
            current.priority ??
            (key === "home"
              ? 100
              : 50),
        },
      );
    }
  }

  return Array.from(
    map.values(),
  ).sort(
    (a, b) =>
      (b.priority ?? 0) -
        (a.priority ?? 0) ||
      a.title.localeCompare(
        b.title,
      ),
  );
}

export function recommendedServiceNames(
  industry: IndustryPlaybook,
  limit = 8,
): string[] {
  const safeLimit =
    safeLimitNumber(
      limit,
      8,
      1,
      20,
    );

  return uniqueStrings(
    industry.servicePageExamples,
  ).slice(
    0,
    safeLimit,
  );
}

export function recommendedFaqs(
  industry: IndustryPlaybook,
  limit = 6,
): string[] {
  const safeLimit =
    safeLimitNumber(
      limit,
      6,
      1,
      20,
    );

  return uniqueStrings(
    industry.faqSeeds,
  ).slice(
    0,
    safeLimit,
  );
}

/* -------------------------------------------------------------------------- */
/* Strategy helpers                                                            */
/* -------------------------------------------------------------------------- */

export function homeSectionStrategy(
  industry: IndustryPlaybook,
): string[] {
  return uniqueStrings(
    industry.homeSections,
  );
}

export function serviceSectionStrategy(
  industry: IndustryPlaybook,
): string[] {
  return uniqueStrings(
    industry.servicePageSections,
  );
}

export function terminologyFor(
  industry: IndustryPlaybook,
  limit = 12,
): string[] {
  return uniqueStrings(
    industry.terminology,
  ).slice(
    0,
    safeLimitNumber(
      limit,
      12,
      1,
      30,
    ),
  );
}

export function trustThemesFor(
  industry: IndustryPlaybook,
  limit = 8,
): string[] {
  return uniqueStrings(
    industry.trust,
  ).slice(
    0,
    safeLimitNumber(
      limit,
      8,
      1,
      20,
    ),
  );
}

export function objectionsFor(
  industry: IndustryPlaybook,
  limit = 8,
): string[] {
  return uniqueStrings(
    industry.objections,
  ).slice(
    0,
    safeLimitNumber(
      limit,
      8,
      1,
      20,
    ),
  );
}

export function contentAnglesFor(
  industry: IndustryPlaybook,
  limit = 8,
): string[] {
  return uniqueStrings(
    industry.contentAngles,
  ).slice(
    0,
    safeLimitNumber(
      limit,
      8,
      1,
      20,
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* Visual helpers                                                              */
/* -------------------------------------------------------------------------- */

export function visualDirectionFor(
  industry: IndustryPlaybook,
): IndustryVisual {
  return {
    ...industry.visual,
  };
}

export function visualProofLevelFor(
  industry: IndustryPlaybook,
): "low" | "medium" | "high" {
  return industry.visualProof;
}

/* -------------------------------------------------------------------------- */
/* SEO helpers                                                                 */
/* -------------------------------------------------------------------------- */

export function schemaTypeFor(
  industry: IndustryPlaybook,
): string {
  const value =
    typeof industry.schemaType ===
    "string"
      ? industry.schemaType.trim()
      : "";

  return value || "LocalBusiness";
}

export function seoStrategyFor(
  industry: IndustryPlaybook,
): IndustrySEO {
  return {
    ...industry.seo,
    patterns:
      industry.seo.patterns
        ? [...industry.seo.patterns]
        : [],
  };
}

export function searchPatternsFor(
  industry: IndustryPlaybook,
  limit = 10,
): string[] {
  return uniqueStrings(
    industry.seo.patterns ?? [],
  ).slice(
    0,
    safeLimitNumber(
      limit,
      10,
      1,
      30,
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* Strategy snapshot                                                           */
/* -------------------------------------------------------------------------- */

export function strategyFor(
  industry: IndustryPlaybook,
) {
  return {
    industry: industry.slug,
    label: industry.label,
    action: industry.action,

    primaryCta:
      primaryCta(industry),

    secondaryCta:
      secondaryCta(industry),

    pages:
      recommendedPages(industry),

    homeSections:
      homeSectionStrategy(industry),

    servicePageSections:
      serviceSectionStrategy(industry),

    serviceNames:
      recommendedServiceNames(industry),

    faqs:
      recommendedFaqs(industry),

    terminology:
      terminologyFor(industry),

    trustThemes:
      trustThemesFor(industry),

    objections:
      objectionsFor(industry),

    contentAngles:
      contentAnglesFor(industry),

    seo:
      seoStrategyFor(industry),

    conversion: {
      ...industry.conversion,
      secondaryActions: [
        ...industry.conversion.secondaryActions,
      ],
      placement: [
        ...industry.conversion.placement,
      ],
    },

    visual:
      visualDirectionFor(industry),

    schemaType:
      schemaTypeFor(industry),

    visualProof:
      industry.visualProof,

    urgency:
      industry.urgency,
  };
}

/* -------------------------------------------------------------------------- */
/* Slug lookup                                                                 */
/* -------------------------------------------------------------------------- */

export function industryBySlug(
  slug:
    | string
    | null
    | undefined,
): IndustryPlaybook {
  if (
    typeof slug !== "string" ||
    !slug.trim()
  ) {
    return GENERIC_PLAYBOOK;
  }

  const normalized =
    normalizeText(
      slug.replace(
        /_/g,
        " ",
      ),
    );

  if (!normalized) {
    return GENERIC_PLAYBOOK;
  }

  for (
    const industry of INDUSTRY_PLAYBOOKS
  ) {
    const industrySlug =
      normalizeText(
        industry.slug.replace(
          /_/g,
          " ",
        ),
      );

    if (
      industrySlug ===
      normalized
    ) {
      return industry;
    }

    if (
      normalizeText(
        industry.label,
      ) === normalized
    ) {
      return industry;
    }
  }

  for (
    const industry of INDUSTRY_PLAYBOOKS
  ) {
    for (
      const alias of industry.aliases
    ) {
      if (
        normalizeText(alias) ===
        normalized
      ) {
        return industry;
      }
    }
  }

  return GENERIC_PLAYBOOK;
}

/* -------------------------------------------------------------------------- */
/* Request-aware strategy                                                      */
/* -------------------------------------------------------------------------- */

export function strategyFromRequest(
  request: string,
  knownIndustry?: string | null,
): {
  industry: IndustryPlaybook;
  strategy: ReturnType<
    typeof strategyFor
  >;
  request: string;
  confidence:
    | "high"
    | "medium"
    | "low";
} {
  const detected =
    playbookFor(request);

  let industry =
    detected;

  if (
    typeof knownIndustry ===
      "string" &&
    knownIndustry.trim()
  ) {
    const known =
      industryBySlug(
        knownIndustry,
      );

    if (
      known !==
      GENERIC_PLAYBOOK
    ) {
      industry = known;
    }
  }

  return {
    industry,
    strategy:
      strategyFor(industry),
    request,
    confidence:
      industryConfidence(
        knownIndustry,
        request,
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* Lists                                                                       */
/* -------------------------------------------------------------------------- */

export function allIndustrySlugs(): string[] {
  return INDUSTRY_PLAYBOOKS.map(
    (industry) =>
      industry.slug,
  );
}

export function allIndustryLabels(): string[] {
  return INDUSTRY_PLAYBOOKS.map(
    (industry) =>
      industry.label,
  );
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export function validatePlaybook(
  industry: IndustryPlaybook,
): string[] {
  const issues: string[] = [];

  if (
    !industry.slug?.trim()
  ) {
    issues.push("missing slug");
  }

  if (
    !industry.label?.trim()
  ) {
    issues.push("missing label");
  }

  if (
    !Array.isArray(
      industry.aliases,
    ) ||
    !industry.aliases.length
  ) {
    issues.push("missing aliases");
  }

  if (
    !Array.isArray(
      industry.pages,
    ) ||
    !industry.pages.length
  ) {
    issues.push("missing pages");
  }

  if (
    !Array.isArray(
      industry.homeSections,
    ) ||
    !industry.homeSections.length
  ) {
    issues.push(
      "missing home sections",
    );
  }

  if (
    !Array.isArray(
      industry.servicePageSections,
    ) ||
    !industry.servicePageSections.length
  ) {
    issues.push(
      "missing service page sections",
    );
  }

  if (
    !industry.ctaLabels?.primary?.trim()
  ) {
    issues.push(
      "missing primary CTA",
    );
  }

  if (
    !industry.ctaLabels?.secondary?.trim()
  ) {
    issues.push(
      "missing secondary CTA",
    );
  }

  if (
    !Array.isArray(
      industry.terminology,
    ) ||
    !industry.terminology.length
  ) {
    issues.push(
      "missing terminology",
    );
  }

  if (
    !Array.isArray(
      industry.faqSeeds,
    ) ||
    !industry.faqSeeds.length
  ) {
    issues.push(
      "missing FAQ seeds",
    );
  }

  if (
    !industry.schemaType?.trim()
  ) {
    issues.push(
      "missing schema type",
    );
  }

  if (
    !industry.visual?.primary?.trim()
  ) {
    issues.push(
      "missing primary visual token",
    );
  }

  if (
    !industry.visual?.secondary?.trim()
  ) {
    issues.push(
      "missing secondary visual token",
    );
  }

  if (
    !industry.visual?.accent?.trim()
  ) {
    issues.push(
      "missing accent visual token",
    );
  }

  if (!industry.conversion) {
    issues.push(
      "missing conversion strategy",
    );
  } else {
    if (
      !industry.conversion.primaryAction
    ) {
      issues.push(
        "missing conversion action",
      );
    }

    if (
      !Array.isArray(
        industry.conversion
          .secondaryActions,
      )
    ) {
      issues.push(
        "invalid secondary actions",
      );
    }

    if (
      !Array.isArray(
        industry.conversion
          .placement,
      )
    ) {
      issues.push(
        "invalid CTA placement",
      );
    }
  }

  return issues;
}

export function validateIndustryLibrary(): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const seenSlugs =
    new Set<string>();

  for (
    const industry of INDUSTRY_PLAYBOOKS
  ) {
    if (
      seenSlugs.has(
        industry.slug,
      )
    ) {
      issues.push(
        `duplicate industry slug: ${industry.slug}`,
      );
    }

    seenSlugs.add(
      industry.slug,
    );

    const playbookIssues =
      validatePlaybook(
        industry,
      );

    for (
      const issue of playbookIssues
    ) {
      issues.push(
        `${industry.slug}: ${issue}`,
      );
    }

    const pageSlugs =
      new Set<string>();

    for (
      const current of industry.pages
    ) {
      const key =
        normalizedSlug(
          current.slug ||
            current.title,
        ) || "home";

      if (
        pageSlugs.has(key)
      ) {
        issues.push(
          `${industry.slug}: duplicate page slug: ${key}`,
        );
      }

      pageSlugs.add(key);
    }
  }

  if (
    !seenSlugs.has(
      "local_business",
    )
  ) {
    issues.push(
      "missing local_business fallback",
    );
  }

  return {
    valid:
      issues.length === 0,
    issues,
  };
}

/* -------------------------------------------------------------------------- */
/* Health snapshot                                                             */
/* -------------------------------------------------------------------------- */

export function industryEngineHealth(): {
  industryCount: number;
  hasGenericFallback: boolean;
  duplicateSlugs: string[];
  invalidIndustries: string[];
  valid: boolean;
} {
  const duplicates: string[] = [];
  const invalid: string[] = [];
  const seen =
    new Set<string>();

  for (
    const industry of INDUSTRY_PLAYBOOKS
  ) {
    if (
      seen.has(industry.slug)
    ) {
      duplicates.push(
        industry.slug,
      );
    }

    seen.add(
      industry.slug,
    );

    if (
      validatePlaybook(
        industry,
      ).length > 0
    ) {
      invalid.push(
        industry.slug,
      );
    }
  }

  const hasFallback =
    INDUSTRY_PLAYBOOKS.some(
      (industry) =>
        industry.slug ===
        "local_business",
    );

  return {
    industryCount:
      INDUSTRY_PLAYBOOKS.length,

    hasGenericFallback:
      hasFallback,

    duplicateSlugs:
      uniqueStrings(
        duplicates,
      ),

    invalidIndustries:
      uniqueStrings(
        invalid,
      ),

    valid:
      duplicates.length === 0 &&
      invalid.length === 0 &&
      hasFallback,
  };
}

/* -------------------------------------------------------------------------- */
/* Internal numeric safety                                                     */
/* -------------------------------------------------------------------------- */

function safeLimitNumber(
  value: number,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    minimum,
    Math.min(
      Math.floor(value),
      maximum,
    ),
  );
}