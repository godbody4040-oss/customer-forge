/**
 * REVORA INDUSTRY INTELLIGENCE ENGINE
 * MASTER EDITION
 *
 * Purpose:
 * - Give the free-first builder an expert strategy for different industries.
 * - Turn vague user requests into a strong site architecture.
 * - Improve conversion paths without fabricating business facts.
 * - Improve SEO structure without making unsupported claims.
 * - Give every industry a distinct visual and content direction.
 * - Keep generation deterministic, local, fast, and zero-cost.
 *
 * IMPORTANT:
 * This file contains strategy, NOT business facts.
 *
 * Never assume:
 * - reviews
 * - awards
 * - licenses
 * - certifications
 * - prices
 * - years in business
 * - guarantees
 * - locations
 * - opening hours
 * - customer results
 *
 * Those facts must come from the actual business data.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
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

  /**
   * Higher-level visual instructions consumed by builder design systems.
   */
  style?: VisualStyle;
  density?: "airy" | "balanced" | "dense";
  radius?: "sharp" | "soft" | "rounded";
  imageTreatment?: "natural" | "editorial" | "cinematic" | "bright" | "technical";
  motion?: "subtle" | "moderate" | "energetic";
};

export type IndustrySEO = {
  qualifier: string;
  intent: string;

  /**
   * Search patterns help the deterministic copy engine construct
   * page titles/descriptions without inventing a location.
   */
  patterns?: string[];

  /**
   * Local intent is a strategy flag, not a claim that the business
   * actually serves a particular area.
   */
  localIntent?: boolean;

  /**
   * Service pages are generally valuable when this is true.
   */
  servicePageStrategy?: "strong" | "moderate" | "limited";
};

export type IndustryConversion = {
  intensity: ConversionIntensity;

  /**
   * Main CTA objective.
   */
  primaryAction: PrimaryAction;

  /**
   * Secondary actions give the builder alternatives when contact
   * information is incomplete.
   */
  secondaryActions: PrimaryAction[];

  /**
   * Preferred CTA placement.
   */
  placement: (
    | "hero"
    | "after_services"
    | "after_process"
    | "after_trust"
    | "after_gallery"
    | "faq"
    | "footer"
    | "sticky"
  )[];

  /**
   * Whether a sticky mobile action is strategically useful.
   */
  stickyMobile: boolean;

  /**
   * Whether a short lead form is usually appropriate.
   */
  leadForm: boolean;
};

export type IndustryPlaybook = {
  /** Stable machine key. */
  slug: string;

  /** Human-readable industry name. */
  label: string;

  /** Natural-language terms users may use. */
  aliases: string[];

  /** Pages that make strategic sense for this industry. */
  pages: IndustryPage[];

  /** Homepage section order. */
  homeSections: string[];

  /** Service/landing page section order. */
  servicePageSections: string[];

  /** Primary conversion action. */
  action: PrimaryAction;

  /** Recommended CTA labels. */
  ctaLabels: {
    primary: string;
    secondary: string;
  };

  /** Terms the industry commonly uses. */
  terminology: string[];

  /** Trust themes — never treated as verified facts. */
  trust: string[];

  /** SEO strategy. */
  seo: IndustrySEO;

  /** Visual system direction. */
  visual: IndustryVisual;

  /** FAQ starter questions. */
  faqSeeds: string[];

  /** Detailed conversion strategy. */
  conversion: IndustryConversion;

  /** Suggested schema.org business type. */
  schemaType: string;

  /** Search-friendly service page names. */
  servicePageExamples: string[];

  /** Common buyer objections. */
  objections: string[];

  /** Content angles useful for differentiation. */
  contentAngles: string[];

  /** Whether before/after or project visuals are strategically valuable. */
  visualProof:
    | "low"
    | "medium"
    | "high";

  /** Whether emergency/urgent messaging is appropriate. */
  urgency:
    | "none"
    | "situational"
    | "high";
};

/* -------------------------------------------------------------------------- */
/* Shared architecture                                                       */
/* -------------------------------------------------------------------------- */

const URGENT_TRADE_HOME = [
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

const URGENT_TRADE_SERVICE = [
  "hero",
  "intro",
  "benefits",
  "services",
  "process",
  "faq",
  "cta",
  "contact",
];

const CONSIDERED_HOME = [
  "hero",
  "intro",
  "services",
  "benefits",
  "process",
  "gallery",
  "reviews",
  "faq",
  "cta",
  "contact",
];

const CONSIDERED_SERVICE = [
  "hero",
  "intro",
  "services",
  "benefits",
  "gallery",
  "process",
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

const LOCAL_PAGE_SET: IndustryPage[] = [
  {
    kind: "services",
    title: "Services",
    slug: "services",
    why: "Creates a clear overview of the business's main work.",
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

const URGENT_CONVERSION: IndustryConversion = {
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
};

const QUOTE_CONVERSION: IndustryConversion = {
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
};

const BOOKING_CONVERSION: IndustryConversion = {
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
};

const CONSULTATION_CONVERSION: IndustryConversion = {
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
};

const VISIT_CONVERSION: IndustryConversion = {
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
};

/* -------------------------------------------------------------------------- */
/* Factory                                                                    */
/* -------------------------------------------------------------------------- */

function playbook(
  input: Omit<IndustryPlaybook, "conversion"> & {
    conversion?: IndustryConversion;
  },
): IndustryPlaybook {
  return {
    ...input,
    conversion:
      input.conversion ??
      conversionFor(input.action),
  };
}

function conversionFor(action: PrimaryAction): IndustryConversion {
  switch (action) {
    case "call":
      return URGENT_CONVERSION;

    case "quote":
      return QUOTE_CONVERSION;

    case "book":
      return BOOKING_CONVERSION;

    case "consult":
      return CONSULTATION_CONVERSION;

    case "visit":
      return VISIT_CONVERSION;

    case "lead":
    default:
      return {
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
      };
  }
}

/* -------------------------------------------------------------------------- */
/* Industry database                                                          */
/* -------------------------------------------------------------------------- */

export const INDUSTRY_PLAYBOOKS: IndustryPlaybook[] = [
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
    pages: [
      ...LOCAL_PAGE_SET,
      {
        kind: "service",
        title: "Emergency Plumbing",
        slug: "emergency-plumbing",
        why: "Captures urgent search intent when the business actually offers emergency work.",
        priority: 100,
      },
    ],
    homeSections: URGENT_TRADE_HOME,
    servicePageSections: URGENT_TRADE_SERVICE,
    action: "call",
    ctaLabels: {
      primary: "Call now",
      secondary: "Get a quote",
    },
    terminology: [
      "repairs",
      "installations",
      "emergency service",
      "drain clearing",
      "leak detection",
      "water heaters",
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
    pages: LOCAL_PAGE_SET,
    homeSections: URGENT_TRADE_HOME,
    servicePageSections: URGENT_TRADE_SERVICE,
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
    pages: [
      ...LOCAL_PAGE_SET,
      {
        kind: "projects",
        title: "Projects",
        slug: "projects",
        why: "Roofing decisions benefit from visible examples of completed work.",
        priority: 80,
      },
    ],
    homeSections: URGENT_TRADE_HOME,
    servicePageSections: URGENT_TRADE_SERVICE,
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
    ],
    pages: [
      ...LOCAL_PAGE_SET,
      {
        kind: "service",
        title: "Electrical Services",
        slug: "electrical-services",
        why: "Groups the business's electrical work into a strong search and conversion page.",
        priority: 95,
      },
    ],
    homeSections: URGENT_TRADE_HOME,
    servicePageSections: URGENT_TRADE_SERVICE,
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
    pages: [
      ...LOCAL_PAGE_SET,
      {
        kind: "gallery",
        title: "Our Work",
        slug: "our-work",
        why: "Outdoor transformations are highly visual and benefit from project imagery.",
        priority: 90,
      },
    ],
    homeSections: CONSIDERED_HOME,
    servicePageSections: CONSIDERED_SERVICE,
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
      "Insured crews",
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
      "How to prepare an outdoor space for a project",
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
      "move out cleaning",
      "move-out cleaning",
    ],
    pages: LOCAL_PAGE_SET,
    homeSections: CONSIDERED_HOME,
    servicePageSections: CONSIDERED_SERVICE,
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
      "Insured",
      "Vetted staff",
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
    ],
    pages: [
      ...LOCAL_PAGE_SET,
      {
        kind: "projects",
        title: "Projects",
        slug: "projects",
        why: "Project-based work benefits from visual proof and case-study structure.",
        priority: 100,
      },
    ],
    homeSections: CONSIDERED_HOME,
    servicePageSections: CONSIDERED_SERVICE,
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
    pages: [
      ...LOCAL_PAGE_SET,
      {
        kind: "projects",
        title: "Projects",
        slug: "projects",
        why: "Before/after and completed-project visuals strongly support remodeling decisions.",
        priority: 100,
      },
    ],
    homeSections: CONSIDERED_HOME,
    servicePageSections: CONSIDERED_SERVICE,
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
      "Insured",
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
    pages: [
      ...LOCAL_PAGE_SET,
      {
        kind: "gallery",
        title: "Our Work",
        slug: "our-work",
        why: "Painting quality is easy to communicate visually.",
        priority: 90,
      },
    ],
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
      "How to prepare a property for painters",
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
    pages: [
      ...LOCAL_PAGE_SET,
      {
        kind: "service",
        title: "Auto Services",
        slug: "auto-services",
        why: "Groups high-intent vehicle services into a searchable destination.",
        priority: 95,
      },
    ],
    homeSections: URGENT_TRADE_HOME,
    servicePageSections: URGENT_TRADE_SERVICE,
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
      {
        kind: "home",
        title: "Home",
        slug: "",
        why: "Primary introduction and conversion destination.",
        priority: 100,
      },
      {
        kind: "services",
        title: "Services",
        slug: "services",
        why: "Explains buying, selling, valuation or management services actually offered.",
        priority: 90,
      },
      {
        kind: "portfolio",
        title: "Properties",
        slug: "properties",
        why: "Provides a dedicated place for available property content when supplied.",
        priority: 95,
      },
      {
        kind: "about",
        title: "About",
        slug: "about",
        why: "Builds context around the business and its approach.",
        priority: 70,
      },
      {
        kind: "contact",
        title: "Contact",
        slug: "contact",
        why: "Creates a direct inquiry destination.",
        priority: 100,
      },
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
      {
        kind: "home",
        title: "Home",
        slug: "",
        why: "Introduces the practice and its areas of work.",
        priority: 100,
      },
      {
        kind: "services",
        title: "Practice Areas",
        slug: "practice-areas",
        why: "Visitors need to quickly determine whether the firm handles their matter.",
        priority: 100,
      },
      {
        kind: "about",
        title: "About",
        slug: "about",
        why: "Provides practice and team information supplied by the business.",
        priority: 80,
      },
      {
        kind: "faq",
        title: "FAQ",
        slug: "faq",
        why: "Addresses common process questions without providing individualized legal advice.",
        priority: 60,
      },
      {
        kind: "contact",
        title: "Contact",
        slug: "contact",
        why: "Provides a clear consultation route.",
        priority: 100,
      },
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
      {
        kind: "home",
        title: "Home",
        slug: "",
        why: "Introduces the clinic and directs visitors to appropriate next steps.",
        priority: 100,
      },
      {
        kind: "services",
        title: "Services",
        slug: "services",
        why: "Explains the treatments or services actually supplied by the clinic.",
        priority: 100,
      },
      {
        kind: "about",
        title: "About",
        slug: "about",
        why: "Provides clinician and clinic information from verified business data.",
        priority: 75,
      },
      {
        kind: "faq",
        title: "FAQ",
        slug: "faq",
        why: "Answers administrative questions without inventing medical claims.",
        priority: 65,
      },
      {
        kind: "contact",
        title: "Contact",
        slug: "contact",
        why: "Provides appointment and contact information.",
        priority: 100,
      },
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
      {
        kind: "home",
        title: "Home",
        slug: "",
        why: "Introduces the practice and directs visitors to booking.",
        priority: 100,
      },
      {
        kind: "services",
        title: "Dental Services",
        slug: "services",
        why: "Lets visitors quickly identify relevant treatments.",
        priority: 100,
      },
      {
        kind: "about",
        title: "About",
        slug: "about",
        why: "Provides verified practice and team information.",
        priority: 70,
      },
      {
        kind: "faq",
        title: "FAQ",
        slug: "faq",
        why: "Answers common administrative questions.",
        priority: 60,
      },
      {
        kind: "contact",
        title: "Contact",
        slug: "contact",
        why: "Provides appointment access.",
        priority: 100,
      },
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
      {
        kind: "home",
        title: "Home",
        slug: "",
        why: "Creates the strongest visual introduction.",
        priority: 100,
      },
      {
        kind: "menu",
        title: "Menu",
        slug: "menu",
        why: "Visitors commonly need the menu before deciding to visit.",
        priority: 100,
      },
      {
        kind: "visit",
        title: "Visit Us",
        slug: "visit",
        why: "Combines location, hours and visit information.",
        priority: 90,
      },
      {
        kind: "about",
        title: "About",
        slug: "about",
        why: "Adds personality and context.",
        priority: 65,
      },
      {
        kind: "contact",
        title: "Contact",
        slug: "contact",
        why: "Provides a direct route for inquiries.",
        priority: 70,
      },
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
      {
        kind: "home",
        title: "Home",
        slug: "",
        why: "Visual-first introduction and booking path.",
        priority: 100,
      },
      {
        kind: "services",
        title: "Treatments",
        slug: "treatments",
        why: "Visitors need to compare available treatments.",
        priority: 100,
      },
      {
        kind: "gallery",
        title: "Our Work",
        slug: "our-work",
        why: "Visual proof is highly valuable for appearance-based services.",
        priority: 90,
      },
      {
        kind: "contact",
        title: "Contact",
        slug: "contact",
        why: "Provides booking/contact information.",
        priority: 90,
      },
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
      {
        kind: "home",
        title: "Home",
        slug: "",
        why: "Introduces the experience and directs visitors toward joining.",
        priority: 100,
      },
      {
        kind: "services",
        title: "Programs",
        slug: "programs",
        why: "Explains memberships, classes or training options.",
        priority: 100,
      },
      {
        kind: "schedule",
        title: "Schedule",
        slug: "schedule",
        why: "Useful when class or appointment schedules are supplied.",
        priority: 80,
      },
      {
        kind: "about",
        title: "About",
        slug: "about",
        why: "Explains the training philosophy.",
        priority: 65,
      },
      {
        kind: "contact",
        title: "Contact",
        slug: "contact",
        why: "Creates a direct inquiry route.",
        priority: 80,
      },
    ],
    homeSections: CONSIDERED_HOME,
    servicePageSections: CONSIDERED_SERVICE,
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
      {
        kind: "home",
        title: "Home",
        slug: "",
        why: "Positions the business and establishes the primary conversion path.",
        priority: 100,
      },
      {
        kind: "services",
        title: "Services",
        slug: "services",
        why: "Makes service scope immediately understandable.",
        priority: 100,
      },
      {
        kind: "about",
        title: "About",
        slug: "about",
        why: "Adds team, process and business context.",
        priority: 80,
      },
      {
        kind: "faq",
        title: "FAQ",
        slug: "faq",
        why: "Reduces uncertainty around process and engagement.",
        priority: 60,
      },
      {
        kind: "contact",
        title: "Contact",
        slug: "contact",
        why: "Creates a direct consultation/inquiry route.",
        priority: 100,
      },
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
    pages: [
      ...LOCAL_PAGE_SET,
      {
        kind: "services",
        title: "Services",
        slug: "services",
        why: "Lets visitors identify the specific home service they need.",
        priority: 100,
      },
    ],
    homeSections: URGENT_TRADE_HOME,
    servicePageSections: URGENT_TRADE_SERVICE,
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
    ],
    pages: [
      ...LOCAL_PAGE_SET,
      {
        kind: "gallery",
        title: "Gallery",
        slug: "gallery",
        why: "Provides a flexible visual destination when the business has genuine imagery.",
        priority: 60,
      },
    ],
    homeSections: CONSIDERED_HOME,
    servicePageSections: CONSIDERED_SERVICE,
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
/* Generic fallback                                                           */
/* -------------------------------------------------------------------------- */

export const GENERIC_PLAYBOOK: IndustryPlaybook =
  INDUSTRY_PLAYBOOKS.find(
    (entry) => entry.slug === "local_business",
  ) ??
  playbook({
    slug: "generic",
    label: "Local Business",
    aliases: ["business"],
    pages: LOCAL_PAGE_SET,
    homeSections: CONSIDERED_HOME,
    servicePageSections: CONSIDERED_SERVICE,
    action: "lead",
    ctaLabels: {
      primary: "Get in touch",
      secondary: "Learn more",
    },
    terminology: ["services", "contact", "about"],
    trust: ["Business information", "Clear communication"],
    seo: {
      qualifier: "local",
      intent: "local business",
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
      "What services do you offer?",
      "Where are you located?",
      "How do I get started?",
    ],
    schemaType: "LocalBusiness",
    servicePageExamples: ["Services", "About", "Contact"],
    objections: [
      "What does the business offer?",
      "How do I contact the business?",
    ],
    contentAngles: [
      "What the business does",
      "How to get started",
    ],
    visualProof: "medium",
    urgency: "none",
  });

/* -------------------------------------------------------------------------- */
/* Matching engine                                                             */
/* -------------------------------------------------------------------------- */

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean);
}

function containsPhrase(
  normalizedHaystack: string,
  normalizedNeedle: string,
): boolean {
  if (!normalizedNeedle) return false;

  return (
    normalizedHaystack === normalizedNeedle ||
    normalizedHaystack.includes(` ${normalizedNeedle} `) ||
    normalizedHaystack.startsWith(`${normalizedNeedle} `) ||
    normalizedHaystack.endsWith(` ${normalizedNeedle}`)
  );
}

function scoreAlias(
  haystack: string,
  tokens: Set<string>,
  alias: string,
): number {
  const normalizedAlias = normalizeText(alias);

  if (!normalizedAlias) return 0;

  const aliasTokens = tokenize(alias);

  /*
   * Exact multi-word phrase is the strongest signal.
   */
  if (containsPhrase(haystack, normalizedAlias)) {
    return 100 + normalizedAlias.length * 2;
  }

  /*
   * Single-word aliases still receive a strong signal.
   */
  if (aliasTokens.length === 1 && tokens.has(aliasTokens[0])) {
    return 45 + normalizedAlias.length;
  }

  /*
   * Partial token overlap helps with natural requests such as:
   * "I need a website for my heating and cooling company."
   */
  if (aliasTokens.length > 1) {
    const overlap = aliasTokens.filter((token) =>
      tokens.has(token),
    ).length;

    if (overlap === aliasTokens.length) {
      return 80 + normalizedAlias.length;
    }

    if (overlap > 0) {
      return 10 + overlap * 12;
    }
  }

  return 0;
}

/**
 * Returns the best industry playbook for any combination of hints.
 *
 * Examples:
 *   playbookFor("electrician")
 *   playbookFor("I run a roofing company")
 *   playbookFor("we install AC systems", "HVAC")
 *
 * Matching is deterministic and never calls an AI model.
 */
export function playbookFor(
  ...hints: (string | null | undefined)[]
): IndustryPlaybook {
  const usableHints = hints
    .filter(
      (hint): hint is string =>
        typeof hint === "string" && Boolean(hint.trim()),
    )
    .map(normalizeText)
    .filter(Boolean);

  if (!usableHints.length) {
    return GENERIC_PLAYBOOK;
  }

  const haystack = usableHints.join(" ");
  const tokens = new Set(tokenize(haystack));

  let best:
    | {
        playbook: IndustryPlaybook;
        score: number;
        matchedAliasLength: number;
      }
    | null = null;

  for (const candidate of INDUSTRY_PLAYBOOKS) {
    const aliases = [
      candidate.label,
      candidate.slug.replace(/_/g, " "),
      ...candidate.aliases,
    ];

    let candidateScore = 0;
    let longestAlias = 0;

    for (const alias of aliases) {
      const score = scoreAlias(
        haystack,
        tokens,
        alias,
      );

      if (score > 0) {
        candidateScore += score;

        longestAlias = Math.max(
          longestAlias,
          normalizeText(alias).length,
        );
      }
    }

    /*
     * Give specialized industries a modest preference over the generic
     * fallback when a real match exists.
     */
    if (candidate.slug !== "local_business") {
      candidateScore += 2;
    }

    if (
      !best ||
      candidateScore > best.score ||
      (candidateScore === best.score &&
        longestAlias > best.matchedAliasLength)
    ) {
      best = {
        playbook: candidate,
        score: candidateScore,
        matchedAliasLength: longestAlias,
      };
    }
  }

  return best?.playbook ?? GENERIC_PLAYBOOK;
}

/**
 * Returns the confidence level of an industry match.
 *
 * This lets the builder avoid over-specializing when the user's request
 * is ambiguous.
 */
export function industryConfidence(
  ...hints: (string | null | undefined)[]
): "high" | "medium" | "low" {
  const usable = hints
    .filter(
      (hint): hint is string =>
        typeof hint === "string" && Boolean(hint.trim()),
    );

  if (!usable.length) return "low";

  const result = playbookFor(...usable);

  if (result === GENERIC_PLAYBOOK) return "low";

  const haystack = normalizeText(usable.join(" "));
  const tokens = new Set(tokenize(haystack));

  let bestScore = 0;

  for (const alias of [
    result.label,
    result.slug.replace(/_/g, " "),
    ...result.aliases,
  ]) {
    bestScore = Math.max(
      bestScore,
      scoreAlias(haystack, tokens, alias),
    );
  }

  if (bestScore >= 100) return "high";
  if (bestScore >= 50) return "medium";

  return "low";
}

/**
 * Whether the request explicitly identifies a supported industry.
 */
export function mentionsIndustry(
  text: string,
): boolean {
  if (!text?.trim()) return false;

  const result = playbookFor(text);

  return result !== GENERIC_PLAYBOOK;
}

/**
 * Returns all plausible industry matches, ranked.
 *
 * Useful when a user says something broad such as:
 * "I do home repair and electrical work."
 */
export function rankIndustryMatches(
  ...hints: (string | null | undefined)[]
): IndustryPlaybook[] {
  const haystack = normalizeText(
    hints.filter(Boolean).join(" "),
  );

  if (!haystack) {
    return [GENERIC_PLAYBOOK];
  }

  const tokens = new Set(tokenize(haystack));

  return INDUSTRY_PLAYBOOKS
    .map((candidate) => {
      let score = 0;

      for (const alias of [
        candidate.label,
        candidate.slug.replace(/_/g, " "),
        ...candidate.aliases,
      ]) {
        score = Math.max(
          score,
          scoreAlias(haystack, tokens, alias),
        );
      }

      return {
        candidate,
        score,
      };
    })
    .filter(
      ({ candidate, score }) =>
        score > 0 || candidate === GENERIC_PLAYBOOK,
    )
    .sort((a, b) => b.score - a.score)
    .map(({ candidate }) => candidate);
}

/* -------------------------------------------------------------------------- */
/* Strategy helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Returns the most appropriate CTA for a playbook.
 */
export function primaryCta(
  industry: IndustryPlaybook,
): string {
  return industry.ctaLabels.primary;
}

/**
 * Returns the secondary CTA.
 */
export function secondaryCta(
  industry: IndustryPlaybook,
): string {
  return industry.ctaLabels.secondary;
}

/**
 * Returns a recommended page set, sorted by strategic priority.
 *
 * Home is always first.
 */
export function recommendedPages(
  industry: IndustryPlaybook,
): IndustryPage[] {
  const unique = new Map<string, IndustryPage>();

  const pages = [
    {
      kind: "home",
      title: "Home",
      slug: "",
      why: "Primary homepage.",
      priority: 100,
    },
    ...industry.pages,
  ];

  for (const page of pages) {
    const key = page.slug || "home";

    if (!unique.has(key)) {
      unique.set(key, {
        ...page,
        priority: page.priority ?? 50,
      });
    }
  }

  return Array.from(unique.values()).sort(
    (a, b) =>
      (b.priority ?? 0) - (a.priority ?? 0),
  );
}

/**
 * Returns the strongest service page names for an industry.
 */
export function recommendedServiceNames(
  industry: IndustryPlaybook,
  limit = 8,
): string[] {
  return industry.servicePageExamples
    .filter(Boolean)
    .slice(0, Math.max(1, limit));
}

/**
 * Returns FAQ seeds without duplicates.
 */
export function recommendedFaqs(
  industry: IndustryPlaybook,
  limit = 6,
): string[] {
  const result: string[] = [];

  for (const question of industry.faqSeeds) {
    const normalized = normalizeText(question);

    if (!normalized) continue;

    if (
      !result.some(
        (existing) =>
          normalizeText(existing) === normalized,
      )
    ) {
      result.push(question);
    }

    if (result.length >= Math.max(1, limit)) {
      break;
    }
  }

  return result;
}

/**
 * Determines whether the industry strongly benefits from visual proof.
 */
export function shouldPrioritizeVisualProof(
  industry: IndustryPlaybook,
): boolean {
  return (
    industry.visualProof === "high" ||
    industry.visualProof === "medium"
  );
}

/**
 * Determines whether a mobile sticky CTA is strategically appropriate.
 */
export function shouldUseStickyMobileCta(
  industry: IndustryPlaybook,
): boolean {
  return industry.conversion.stickyMobile;
}

/**
 * Determines whether a lead form should be included.
 */
export function shouldUseLeadForm(
  industry: IndustryPlaybook,
): boolean {
  return industry.conversion.leadForm;
}

/**
 * Returns the best conversion path when the requested action is unavailable.
 *
 * Example:
 * - No phone -> quote/lead can still work.
 * - No booking system -> lead/contact can still work.
 */
export function fallbackActions(
  industry: IndustryPlaybook,
): PrimaryAction[] {
  const result = [
    industry.conversion.primaryAction,
    ...industry.conversion.secondaryActions,
  ];

  return Array.from(new Set(result));
}

/**
 * Whether the business category commonly supports urgent messaging.
 *
 * This is a strategy flag only.
 * It does NOT mean the business itself offers emergency service.
 */
export function canUseUrgencyMessaging(
  industry: IndustryPlaybook,
): boolean {
  return industry.urgency !== "none";
}

/**
 * Returns schema.org type.
 */
export function schemaTypeFor(
  industry: IndustryPlaybook,
): string {
  return industry.schemaType || "LocalBusiness";
}

/**
 * Returns a compact strategic summary for the deterministic builder.
 *
 * No business facts are generated here.
 */
export function strategyFor(
  industry: IndustryPlaybook,
) {
  return {
    industry: industry.slug,
    label: industry.label,
    action: industry.action,
    primaryCta: industry.ctaLabels.primary,
    secondaryCta: industry.ctaLabels.secondary,
    pages: recommendedPages(industry),
    homeSections: [...industry.homeSections],
    servicePageSections: [
      ...industry.servicePageSections,
    ],
    serviceNames: recommendedServiceNames(industry),
    faqs: recommendedFaqs(industry),
    terminology: [...industry.terminology],
    trustThemes: [...industry.trust],
    objections: [...industry.objections],
    contentAngles: [...industry.contentAngles],
    seo: { ...industry.seo },
    conversion: { ...industry.conversion },
    visual: { ...industry.visual },
    schemaType: schemaTypeFor(industry),
    visualProof: industry.visualProof,
    urgency: industry.urgency,
  };
}

/* -------------------------------------------------------------------------- */
/* Industry lookup utilities                                                  */
/* -------------------------------------------------------------------------- */

export function industryBySlug(
  slug: string | null | undefined,
): IndustryPlaybook {
  if (!slug) return GENERIC_PLAYBOOK;

  const normalized = normalizeText(
    slug.replace(/_/g, " "),
  );

  return (
    INDUSTRY_PLAYBOOKS.find(
      (industry) =>
        normalizeText(industry.slug.replace(/_/g, " ")) ===
          normalized ||
        normalizeText(industry.label) === normalized,
    ) ?? GENERIC_PLAYBOOK
  );
}

export function allIndustrySlugs(): string[] {
  return INDUSTRY_PLAYBOOKS.map(
    (industry) => industry.slug,
  );
}

export function allIndustryLabels(): string[] {
  return INDUSTRY_PLAYBOOKS.map(
    (industry) => industry.label,
  );
}

/* -------------------------------------------------------------------------- */
/* Request-aware strategy                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Allows the builder to detect a more specific user request while still
 * using the industry playbook as the foundation.
 *
 * This does NOT modify the underlying playbook.
 */
export function strategyFromRequest(
  request: string,
  knownIndustry?: string | null,
): {
  industry: IndustryPlaybook;
  strategy: ReturnType<typeof strategyFor>;
  request: string;
  confidence: "high" | "medium" | "low";
} {
  const industry = knownIndustry
    ? industryBySlug(knownIndustry)
    : playbookFor(request);

  /*
   * If a known industry is generic, let the actual request attempt
   * to identify a better specialization.
   */
  const detected =
    industry === GENERIC_PLAYBOOK
      ? playbookFor(request)
      : industry;

  return {
    industry: detected,
    strategy: strategyFor(detected),
    request,
    confidence: industryConfidence(
      knownIndustry,
      request,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight integrity check for development/tests.
 *
 * This catches broken playbook data without throwing at runtime.
 */
export function validatePlaybook(
  industry: IndustryPlaybook,
): string[] {
  const issues: string[] = [];

  if (!industry.slug.trim()) {
    issues.push("missing slug");
  }

  if (!industry.label.trim()) {
    issues.push("missing label");
  }

  if (!industry.pages.length) {
    issues.push("missing pages");
  }

  if (!industry.homeSections.length) {
    issues.push("missing home sections");
  }

  if (!industry.servicePageSections.length) {
    issues.push("missing service page sections");
  }

  if (!industry.ctaLabels.primary.trim()) {
    issues.push("missing primary CTA");
  }

  if (!industry.ctaLabels.secondary.trim()) {
    issues.push("missing secondary CTA");
  }

  if (!industry.faqSeeds.length) {
    issues.push("missing FAQ seeds");
  }

  if (!industry.schemaType.trim()) {
    issues.push("missing schema type");
  }

  if (!industry.visual.primary.trim()) {
    issues.push("missing primary visual token");
  }

  if (!industry.visual.secondary.trim()) {
    issues.push("missing secondary visual token");
  }

  if (!industry.visual.accent.trim()) {
    issues.push("missing accent visual token");
  }

  return issues;
}

/**
 * Development-safe complete database validation.
 */
export function validateIndustryLibrary(): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const seen = new Set<string>();

  for (const industry of INDUSTRY_PLAYBOOKS) {
    if (seen.has(industry.slug)) {
      issues.push(
        `duplicate industry slug: ${industry.slug}`,
      );
    }

    seen.add(industry.slug);

    for (const issue of validatePlaybook(industry)) {
      issues.push(
        `${industry.slug}: ${issue}`,
      );
    }
  }

  if (!seen.has("local_business")) {
    issues.push(
      "missing generic local_business fallback",
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}