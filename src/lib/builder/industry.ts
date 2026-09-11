/**
 * REVORA FREE-FIRST BUILDER
 * INDUSTRY INTELLIGENCE ENGINE — MASTER EDITION v2
 *
 * Code #9
 *
 * PURPOSE
 * -------
 * Convert a business/industry description into a deterministic strategy that
 * the Revora builder can use to create materially better websites.
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Zero paid AI dependency.
 * - Zero network calls.
 * - Deterministic and repeatable.
 * - No fabricated business facts.
 * - No fabricated reviews, awards, statistics, guarantees, credentials,
 *   locations, prices, years in business, or outcomes.
 * - Industry strategy should influence structure, copy, conversion, SEO,
 *   visuals, FAQs, schema, and page planning.
 * - Unknown industries gracefully fall back to GENERIC_PLAYBOOK.
 * - Consumer-facing and professional-service businesses receive different
 *   conversion strategies.
 * - Local businesses receive local-search-aware recommendations.
 * - The engine should never make a website feel like a generic template.
 *
 * IMPORTANT
 * ---------
 * This file is intentionally self-contained.
 * It should remain safe to use from the deterministic/free builder path.
 */

/* -------------------------------------------------------------------------- */
/* CORE TYPES                                                                 */
/* -------------------------------------------------------------------------- */

export type IndustryConfidence =
  | "exact"
  | "strong"
  | "probable"
  | "broad"
  | "generic";

export type IndustryFamily =
  | "home-services"
  | "professional-services"
  | "health-wellness"
  | "beauty"
  | "food-hospitality"
  | "automotive"
  | "retail"
  | "fitness-sports"
  | "education"
  | "real-estate"
  | "finance"
  | "technology"
  | "creative"
  | "events"
  | "nonprofit"
  | "construction"
  | "industrial"
  | "travel"
  | "pet-services"
  | "child-family"
  | "religious"
  | "public-community"
  | "other";

export type ConversionMode =
  | "call"
  | "book"
  | "quote"
  | "contact"
  | "order"
  | "visit"
  | "apply"
  | "consult"
  | "reserve"
  | "request-info"
  | "mixed";

export type VisualDirection =
  | "premium"
  | "clean"
  | "bold"
  | "editorial"
  | "warm"
  | "trust"
  | "modern"
  | "luxury"
  | "technical"
  | "energetic"
  | "minimal"
  | "community";

export type SchemaKind =
  | "LocalBusiness"
  | "ProfessionalService"
  | "Service"
  | "Product"
  | "Restaurant"
  | "FoodEstablishment"
  | "AutoRepair"
  | "BeautySalon"
  | "HealthAndBeautyBusiness"
  | "HealthCareBusiness"
  | "RealEstateAgent"
  | "FinancialService"
  | "EducationalOrganization"
  | "SportsActivityLocation"
  | "Event"
  | "Organization"
  | "WebSite";

export type PageKind =
  | "home"
  | "about"
  | "services"
  | "service-detail"
  | "pricing"
  | "contact"
  | "booking"
  | "faq"
  | "gallery"
  | "portfolio"
  | "menu"
  | "products"
  | "locations"
  | "team"
  | "testimonials"
  | "blog"
  | "resources"
  | "classes"
  | "events"
  | "properties"
  | "inventory"
  | "application"
  | "other";

/* -------------------------------------------------------------------------- */
/* INDUSTRY PLAYBOOK                                                          */
/* -------------------------------------------------------------------------- */

export type IndustryPlaybook = {
  id: string;

  name: string;

  family: IndustryFamily;

  confidence: IndustryConfidence;

  aliases: string[];

  description: string;

  customerIntent: string[];

  primaryGoals: string[];

  conversionMode: ConversionMode;

  conversionModes: ConversionMode[];

  primaryCta: string;

  secondaryCta: string;

  ctaLabels: string[];

  recommendedPages: PageKind[];

  optionalPages: PageKind[];

  prioritySections: string[];

  recommendedSections: string[];

  avoidSections: string[];

  serviceTerminology: {
    singular: string;
    plural: string;
    action: string;
    customer: string;
  };

  visualDirection: VisualDirection[];

  visualKeywords: string[];

  trustSignals: string[];

  seoKeywords: string[];

  localSeoKeywords: string[];

  faqTopics: string[];

  schemaTypes: SchemaKind[];

  contentRules: string[];

  conversionRules: string[];

  imageRules: string[];

  mobileRules: string[];

  accessibilityRules: string[];

  navigationRules: string[];

  pagePriority: Record<PageKind, number>;

  sectionPriority: Record<string, number>;

  /**
   * Flexible extension point so future builder layers can attach additional
   * deterministic strategy without breaking this contract.
   */
  metadata?: Record<
    string,
    string | number | boolean | string[]
  >;
};

/* -------------------------------------------------------------------------- */
/* NORMALIZATION                                                              */
/* -------------------------------------------------------------------------- */

function normalize(
  value: unknown,
): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9\s&/-]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function tokens(
  value: string,
): string[] {
  return Array.from(
    new Set(
      normalize(value)
        .split(/\s+/)
        .filter(Boolean),
    ),
  );
}

function containsAny(
  text: string,
  values: string[],
): boolean {
  const normalized =
    normalize(text);

  return values.some(
    (value) =>
      normalized.includes(
        normalize(value),
      ),
  );
}

function unique<T>(
  values: T[],
): T[] {
  return Array.from(
    new Set(values),
  );
}

/* -------------------------------------------------------------------------- */
/* BASE PLAYBOOK                                                              */
/* -------------------------------------------------------------------------- */

const BASE_PAGE_PRIORITY: Record<
  PageKind,
  number
> = {
  home: 100,
  services: 95,
  "service-detail": 90,
  contact: 88,
  booking: 87,
  pricing: 80,
  about: 72,
  faq: 70,
  gallery: 62,
  portfolio: 62,
  menu: 80,
  products: 82,
  locations: 75,
  team: 58,
  testimonials: 55,
  blog: 45,
  resources: 45,
  classes: 72,
  events: 65,
  properties: 85,
  inventory: 82,
  application: 76,
  other: 20,
};

const BASE_SECTION_PRIORITY: Record<
  string,
  number
> = {
  hero: 100,
  services: 95,
  benefits: 86,
  process: 80,
  trust: 78,
  gallery: 68,
  testimonials: 65,
  faq: 60,
  about: 58,
  team: 52,
  contact: 90,
  cta: 98,
  pricing: 82,
  location: 72,
  hours: 65,
  portfolio: 68,
  products: 82,
  menu: 82,
  booking: 90,
  form: 88,
};

function makePlaybook(
  partial: Partial<IndustryPlaybook> &
    Pick<
      IndustryPlaybook,
      "id" | "name" | "family"
    >,
): IndustryPlaybook {
  return {
    id: partial.id,
    name: partial.name,
    family: partial.family,

    confidence:
      partial.confidence ??
      "generic",

    aliases:
      partial.aliases ?? [],

    description:
      partial.description ??
      "",

    customerIntent:
      partial.customerIntent ??
      [],

    primaryGoals:
      partial.primaryGoals ??
      [
        "understand the offer",
        "trust the business",
        "take the next step",
      ],

    conversionMode:
      partial.conversionMode ??
      "contact",

    conversionModes:
      partial.conversionModes ??
      [
        partial.conversionMode ??
          "contact",
      ],

    primaryCta:
      partial.primaryCta ??
      "Get Started",

    secondaryCta:
      partial.secondaryCta ??
      "Contact Us",

    ctaLabels:
      partial.ctaLabels ??
      [
        "Get Started",
        "Learn More",
        "Contact Us",
      ],

    recommendedPages:
      partial.recommendedPages ??
      [
        "home",
        "services",
        "about",
        "contact",
      ],

    optionalPages:
      partial.optionalPages ??
      [
        "faq",
        "gallery",
      ],

    prioritySections:
      partial.prioritySections ??
      [
        "hero",
        "services",
        "benefits",
        "trust",
        "cta",
      ],

    recommendedSections:
      partial.recommendedSections ??
      [
        "hero",
        "services",
        "benefits",
        "process",
        "trust",
        "faq",
        "cta",
      ],

    avoidSections:
      partial.avoidSections ??
      [],

    serviceTerminology:
      partial.serviceTerminology ??
      {
        singular: "service",
        plural: "services",
        action: "work",
        customer: "customer",
      },

    visualDirection:
      partial.visualDirection ??
      [
        "modern",
        "clean",
        "trust",
      ],

    visualKeywords:
      partial.visualKeywords ??
      [
        "modern",
        "professional",
        "clear",
        "confident",
      ],

    trustSignals:
      partial.trustSignals ??
      [
        "clear services",
        "transparent contact information",
        "specific business details",
        "clear next steps",
      ],

    seoKeywords:
      partial.seoKeywords ??
      [],

    localSeoKeywords:
      partial.localSeoKeywords ??
      [],

    faqTopics:
      partial.faqTopics ??
      [
        "services",
        "process",
        "pricing",
        "availability",
        "contact",
      ],

    schemaTypes:
      partial.schemaTypes ??
      [
        "Organization",
        "WebSite",
      ],

    contentRules:
      partial.contentRules ??
      [
        "Use specific business facts when available.",
        "Do not invent facts that were not provided.",
        "Keep copy concise and action-oriented.",
      ],

    conversionRules:
      partial.conversionRules ??
      [
        "Make the primary next step obvious.",
        "Repeat the primary CTA at useful decision points.",
        "Never create fake conversion destinations.",
      ],

    imageRules:
      partial.imageRules ??
      [
        "Use relevant imagery.",
        "Do not fabricate business-specific imagery.",
        "Do not use irrelevant stock-style imagery when a stronger visual direction exists.",
      ],

    mobileRules:
      partial.mobileRules ??
      [
        "Keep primary actions easy to tap.",
        "Avoid horizontal overflow.",
        "Keep important information above excessive decorative content.",
      ],

    accessibilityRules:
      partial.accessibilityRules ??
      [
        "Maintain logical heading order.",
        "Use accessible labels.",
        "Keep sufficient text contrast.",
      ],

    navigationRules:
      partial.navigationRules ??
      [
        "Keep navigation short.",
        "Put the primary conversion destination within easy reach.",
      ],

    pagePriority: {
      ...BASE_PAGE_PRIORITY,
      ...(partial.pagePriority ?? {}),
    },

    sectionPriority: {
      ...BASE_SECTION_PRIORITY,
      ...(partial.sectionPriority ?? {}),
    },

    metadata:
      partial.metadata,
  };
}

/* -------------------------------------------------------------------------- */
/* GENERIC PLAYBOOK                                                           */
/* -------------------------------------------------------------------------- */

export const GENERIC_PLAYBOOK: IndustryPlaybook =
  makePlaybook({
    id: "generic-business",
    name: "General Business",
    family: "other",
    confidence: "generic",

    aliases: [
      "business",
      "company",
      "organization",
      "brand",
      "service provider",
    ],

    description:
      "A flexible business strategy used when the exact industry is unclear.",

    customerIntent: [
      "understand what the business does",
      "evaluate credibility",
      "learn about services",
      "contact the business",
      "take the next step",
    ],

    primaryGoals: [
      "clarity",
      "trust",
      "conversion",
      "discoverability",
    ],

    conversionMode: "contact",

    conversionModes: [
      "contact",
      "request-info",
      "quote",
    ],

    primaryCta:
      "Get Started",

    secondaryCta:
      "Learn More",

    ctaLabels: [
      "Get Started",
      "Learn More",
      "View Services",
      "Contact Us",
    ],

    recommendedPages: [
      "home",
      "services",
      "about",
      "contact",
    ],

    optionalPages: [
      "faq",
      "gallery",
      "portfolio",
      "pricing",
    ],

    prioritySections: [
      "hero",
      "services",
      "benefits",
      "trust",
      "process",
      "cta",
    ],

    recommendedSections: [
      "hero",
      "services",
      "benefits",
      "process",
      "about",
      "trust",
      "faq",
      "cta",
    ],

    serviceTerminology: {
      singular: "service",
      plural: "services",
      action: "work",
      customer: "customer",
    },

    visualDirection: [
      "modern",
      "clean",
      "trust",
    ],

    visualKeywords: [
      "clear",
      "modern",
      "professional",
      "confident",
      "structured",
    ],

    seoKeywords: [
      "business",
      "services",
      "local business",
    ],

    localSeoKeywords: [
      "near me",
      "local",
      "in the area",
    ],

    faqTopics: [
      "services",
      "process",
      "pricing",
      "availability",
      "service area",
      "contact",
    ],

    schemaTypes: [
      "Organization",
      "WebSite",
      "Service",
    ],
  });

/* -------------------------------------------------------------------------- */
/* HOME SERVICES                                                              */
/* -------------------------------------------------------------------------- */

const HOME_SERVICES = makePlaybook({
  id: "home-services",
  name: "Home Services",
  family: "home-services",
  confidence: "strong",

  aliases: [
    "plumber",
    "plumbing",
    "electrician",
    "electrical",
    "hvac",
    "heating",
    "air conditioning",
    "ac repair",
    "roofer",
    "roofing",
    "landscaper",
    "landscaping",
    "lawn care",
    "cleaner",
    "cleaning service",
    "house cleaning",
    "pressure washing",
    "painter",
    "painting",
    "handyman",
    "contractor",
    "remodeling",
    "home improvement",
    "flooring",
    "carpet cleaning",
    "junk removal",
    "moving company",
    "pest control",
    "tree service",
    "window cleaning",
    "garage door",
    "fence",
    "fencing",
    "concrete",
    "masonry",
  ],

  description:
    "Local service strategy focused on trust, service clarity, service area visibility, fast contact, estimates, and booking.",

  customerIntent: [
    "solve a problem",
    "find a reliable local provider",
    "request a quote",
    "schedule service",
    "call quickly",
  ],

  primaryGoals: [
    "generate qualified leads",
    "make contact effortless",
    "show services clearly",
    "build local trust",
    "support local SEO",
  ],

  conversionMode: "quote",

  conversionModes: [
    "quote",
    "call",
    "book",
    "contact",
  ],

  primaryCta:
    "Request a Quote",

  secondaryCta:
    "Call Now",

  ctaLabels: [
    "Request a Quote",
    "Get an Estimate",
    "Call Now",
    "Schedule Service",
    "Contact Us",
  ],

  recommendedPages: [
    "home",
    "services",
    "service-detail",
    "about",
    "contact",
    "faq",
  ],

  optionalPages: [
    "gallery",
    "pricing",
    "locations",
    "portfolio",
  ],

  prioritySections: [
    "hero",
    "services",
    "benefits",
    "process",
    "trust",
    "location",
    "cta",
    "contact",
  ],

  recommendedSections: [
    "hero",
    "services",
    "problem-solution",
    "benefits",
    "process",
    "service-area",
    "trust",
    "faq",
    "cta",
  ],

  avoidSections: [
    "generic-corporate-history",
    "unverified-awards",
    "fake-testimonials",
  ],

  serviceTerminology: {
    singular: "service",
    plural: "services",
    action: "service",
    customer: "customer",
  },

  visualDirection: [
    "trust",
    "modern",
    "clean",
    "bold",
  ],

  visualKeywords: [
    "reliable",
    "local",
    "professional",
    "responsive",
    "clean",
    "confident",
  ],

  trustSignals: [
    "service area",
    "clear services",
    "contact information",
    "availability",
    "quote request",
    "business details",
  ],

  seoKeywords: [
    "home services",
    "repair",
    "installation",
    "maintenance",
    "service",
  ],

  localSeoKeywords: [
    "near me",
    "local",
    "in [city]",
    "[service] near me",
    "local [service]",
  ],

  faqTopics: [
    "service area",
    "pricing",
    "estimates",
    "availability",
    "emergency service",
    "scheduling",
    "services offered",
  ],

  schemaTypes: [
    "LocalBusiness",
    "ProfessionalService",
    "Service",
  ],

  conversionRules: [
    "Put the primary contact action in the hero.",
    "Make quote requests easy to understand.",
    "Repeat contact actions after major service sections.",
    "Keep service-area information visible.",
    "Never invent emergency availability.",
  ],

  imageRules: [
    "Prefer relevant work imagery.",
    "Use service-specific visuals when possible.",
    "Avoid generic office imagery when the service itself can be shown.",
    "Never imply a project was completed by the business unless that project is supplied as real content.",
  ],

  mobileRules: [
    "Keep call and quote actions thumb-friendly.",
    "Avoid oversized decorative hero elements.",
    "Keep service cards easy to scan.",
  ],
});

/* -------------------------------------------------------------------------- */
/* PROFESSIONAL SERVICES                                                      */
/* -------------------------------------------------------------------------- */

const PROFESSIONAL_SERVICES =
  makePlaybook({
    id: "professional-services",
    name: "Professional Services",
    family: "professional-services",
    confidence: "strong",

    aliases: [
      "lawyer",
      "law firm",
      "attorney",
      "accountant",
      "accounting",
      "bookkeeper",
      "consultant",
      "consulting",
      "agency",
      "marketing agency",
      "insurance",
      "insurance agency",
      "business consultant",
      "coach",
      "coaching",
      "advisor",
      "advisory",
      "tax service",
      "tax preparation",
      "financial advisor",
      "real estate attorney",
    ],

    description:
      "Trust-first professional-service strategy focused on expertise, clarity, credibility, consultation, and qualified enquiries.",

    customerIntent: [
      "understand expertise",
      "determine fit",
      "evaluate trust",
      "learn about services",
      "request consultation",
    ],

    primaryGoals: [
      "build trust",
      "qualify leads",
      "explain expertise",
      "generate consultations",
    ],

    conversionMode: "consult",

    conversionModes: [
      "consult",
      "contact",
      "book",
      "request-info",
    ],

    primaryCta:
      "Book a Consultation",

    secondaryCta:
      "Contact Us",

    ctaLabels: [
      "Book a Consultation",
      "Schedule a Call",
      "Learn More",
      "Contact Us",
      "Request Information",
    ],

    recommendedPages: [
      "home",
      "services",
      "service-detail",
      "about",
      "faq",
      "contact",
    ],

    optionalPages: [
      "team",
      "resources",
      "blog",
      "pricing",
      "portfolio",
    ],

    prioritySections: [
      "hero",
      "services",
      "expertise",
      "process",
      "trust",
      "faq",
      "cta",
    ],

    recommendedSections: [
      "hero",
      "services",
      "expertise",
      "benefits",
      "process",
      "about",
      "trust",
      "faq",
      "cta",
    ],

    serviceTerminology: {
      singular: "service",
      plural: "services",
      action: "consult",
      customer: "client",
    },

    visualDirection: [
      "premium",
      "trust",
      "editorial",
      "modern",
    ],

    visualKeywords: [
      "credible",
      "refined",
      "expert",
      "clear",
      "confident",
      "professional",
    ],

    trustSignals: [
      "specific expertise",
      "clear process",
      "team information",
      "business details",
      "credentials only when supplied",
      "transparent contact path",
    ],

    seoKeywords: [
      "consulting",
      "professional services",
      "advisor",
      "consultation",
    ],

    localSeoKeywords: [
      "local consultant",
      "consultant near me",
      "professional services [city]",
    ],

    faqTopics: [
      "services",
      "consultation",
      "pricing",
      "process",
      "qualifications",
      "timeline",
    ],

    schemaTypes: [
      "ProfessionalService",
      "Organization",
      "Service",
    ],
  });

/* -------------------------------------------------------------------------- */
/* BEAUTY                                                                    */
/* -------------------------------------------------------------------------- */

const BEAUTY = makePlaybook({
  id: "beauty",
  name: "Beauty & Personal Care",
  family: "beauty",
  confidence: "strong",

  aliases: [
    "barber",
    "barbershop",
    "hair salon",
    "salon",
    "hairstylist",
    "hair stylist",
    "nail salon",
    "nails",
    "esthetician",
    "spa",
    "beauty salon",
    "lash",
    "lashes",
    "brows",
    "makeup artist",
    "massage",
    "skincare",
  ],

  description:
    "Visual, appointment-driven strategy centered on services, style, trust, availability, and booking.",

  customerIntent: [
    "see services",
    "see the style",
    "check availability",
    "book",
    "find location",
  ],

  primaryGoals: [
    "generate bookings",
    "show work",
    "make pricing/services clear",
    "build visual trust",
  ],

  conversionMode: "book",

  conversionModes: [
    "book",
    "call",
    "contact",
  ],

  primaryCta:
    "Book an Appointment",

  secondaryCta:
    "View Services",

  ctaLabels: [
    "Book an Appointment",
    "Book Now",
    "View Services",
    "View Work",
    "Contact Us",
  ],

  recommendedPages: [
    "home",
    "services",
    "booking",
    "gallery",
    "contact",
  ],

  optionalPages: [
    "pricing",
    "about",
    "team",
    "faq",
  ],

  prioritySections: [
    "hero",
    "services",
    "gallery",
    "pricing",
    "booking",
    "trust",
    "cta",
  ],

  recommendedSections: [
    "hero",
    "services",
    "gallery",
    "benefits",
    "pricing",
    "faq",
    "booking",
    "cta",
  ],

  serviceTerminology: {
    singular: "service",
    plural: "services",
    action: "book",
    customer: "client",
  },

  visualDirection: [
    "luxury",
    "editorial",
    "premium",
    "bold",
  ],

  visualKeywords: [
    "stylish",
    "visual",
    "premium",
    "clean",
    "expressive",
    "modern",
  ],

  trustSignals: [
    "real work gallery",
    "clear services",
    "booking path",
    "location",
    "hours",
  ],

  seoKeywords: [
    "beauty services",
    "hair",
    "beauty",
    "appointments",
  ],

  localSeoKeywords: [
    "salon near me",
    "barber near me",
    "beauty salon [city]",
    "hair stylist [city]",
  ],

  faqTopics: [
    "appointments",
    "services",
    "pricing",
    "cancellation",
    "location",
    "availability",
  ],

  schemaTypes: [
    "BeautySalon",
    "HealthAndBeautyBusiness",
    "Service",
  ],
});

/* -------------------------------------------------------------------------- */
/* RESTAURANT / FOOD                                                         */
/* -------------------------------------------------------------------------- */

const FOOD = makePlaybook({
  id: "food-hospitality",
  name: "Food & Hospitality",
  family: "food-hospitality",
  confidence: "strong",

  aliases: [
    "restaurant",
    "cafe",
    "coffee shop",
    "bakery",
    "bar",
    "bistro",
    "diner",
    "food truck",
    "catering",
    "caterer",
    "pizzeria",
    "pizza",
    "grill",
    "bbq",
    "barbecue",
    "cooking",
    "chef",
  ],

  description:
    "Experience-first food strategy emphasizing menu discovery, location, hours, ordering/reservation paths, and strong visual appetite appeal.",

  customerIntent: [
    "see menu",
    "find location",
    "check hours",
    "order",
    "reserve",
    "learn about the experience",
  ],

  primaryGoals: [
    "drive visits",
    "drive orders",
    "drive reservations",
    "show menu clearly",
  ],

  conversionMode: "reserve",

  conversionModes: [
    "reserve",
    "order",
    "visit",
    "contact",
  ],

  primaryCta:
    "View Menu",

  secondaryCta:
    "Order Now",

  ctaLabels: [
    "View Menu",
    "Order Now",
    "Reserve a Table",
    "Get Directions",
    "Contact Us",
  ],

  recommendedPages: [
    "home",
    "menu",
    "contact",
  ],

  optionalPages: [
    "booking",
    "gallery",
    "about",
    "events",
  ],

  prioritySections: [
    "hero",
    "menu",
    "gallery",
    "location",
    "hours",
    "booking",
    "cta",
  ],

  recommendedSections: [
    "hero",
    "featured-menu",
    "experience",
    "gallery",
    "hours",
    "location",
    "faq",
    "cta",
  ],

  serviceTerminology: {
    singular: "offering",
    plural: "offerings",
    action: "order",
    customer: "guest",
  },

  visualDirection: [
    "warm",
    "editorial",
    "premium",
    "bold",
  ],

  visualKeywords: [
    "appetizing",
    "warm",
    "immersive",
    "photographic",
    "inviting",
  ],

  trustSignals: [
    "real menu",
    "hours",
    "location",
    "ordering information",
    "reservation path",
  ],

  seoKeywords: [
    "restaurant",
    "menu",
    "food",
    "dining",
  ],

  localSeoKeywords: [
    "restaurant near me",
    "food near me",
    "restaurant [city]",
    "cafe [city]",
  ],

  faqTopics: [
    "hours",
    "reservations",
    "menu",
    "ordering",
    "location",
    "parking",
  ],

  schemaTypes: [
    "Restaurant",
    "FoodEstablishment",
    "Event",
  ],
});

/* -------------------------------------------------------------------------- */
/* AUTOMOTIVE                                                                 */
/* -------------------------------------------------------------------------- */

const AUTOMOTIVE = makePlaybook({
  id: "automotive",
  name: "Automotive",
  family: "automotive",
  confidence: "strong",

  aliases: [
    "auto repair",
    "car repair",
    "mechanic",
    "auto shop",
    "automotive",
    "body shop",
    "collision repair",
    "car detailing",
    "auto detailing",
    "tire shop",
    "tires",
    "oil change",
    "transmission",
    "brake repair",
    "car wash",
  ],

  description:
    "Problem-solving automotive strategy focused on services, symptoms/problems, estimates, booking, location, and trust.",

  customerIntent: [
    "solve a vehicle problem",
    "compare services",
    "request an estimate",
    "schedule service",
    "find a nearby shop",
  ],

  primaryGoals: [
    "generate service leads",
    "make booking easy",
    "explain services",
    "build trust",
  ],

  conversionMode: "book",

  conversionModes: [
    "book",
    "quote",
    "call",
    "contact",
  ],

  primaryCta:
    "Schedule Service",

  secondaryCta:
    "Get an Estimate",

  ctaLabels: [
    "Schedule Service",
    "Get an Estimate",
    "Call Now",
    "View Services",
    "Contact Us",
  ],

  recommendedPages: [
    "home",
    "services",
    "service-detail",
    "contact",
    "booking",
  ],

  optionalPages: [
    "gallery",
    "pricing",
    "faq",
    "about",
  ],

  prioritySections: [
    "hero",
    "services",
    "problems",
    "process",
    "trust",
    "booking",
    "cta",
  ],

  recommendedSections: [
    "hero",
    "services",
    "common-problems",
    "benefits",
    "process",
    "trust",
    "faq",
    "cta",
  ],

  serviceTerminology: {
    singular: "service",
    plural: "services",
    action: "service",
    customer: "customer",
  },

  visualDirection: [
    "bold",
    "technical",
    "modern",
    "trust",
  ],

  visualKeywords: [
    "precise",
    "powerful",
    "technical",
    "clean",
    "confident",
  ],

  trustSignals: [
    "clear services",
    "vehicle-service specificity",
    "contact information",
    "service process",
    "location",
  ],

  seoKeywords: [
    "auto repair",
    "automotive service",
    "car service",
    "vehicle repair",
  ],

  localSeoKeywords: [
    "auto repair near me",
    "mechanic near me",
    "car detailing near me",
    "auto shop [city]",
  ],

  faqTopics: [
    "services",
    "appointments",
    "estimates",
    "vehicle types",
    "hours",
    "location",
  ],

  schemaTypes: [
    "AutoRepair",
    "LocalBusiness",
    "Service",
  ],
});

/* -------------------------------------------------------------------------- */
/* HEALTH & WELLNESS                                                          */
/* -------------------------------------------------------------------------- */

const HEALTH = makePlaybook({
  id: "health-wellness",
  name: "Health & Wellness",
  family: "health-wellness",
  confidence: "strong",

  aliases: [
    "doctor",
    "dentist",
    "dental",
    "clinic",
    "medical",
    "healthcare",
    "therapist",
    "therapy",
    "counselor",
    "counseling",
    "chiropractor",
    "physical therapy",
    "wellness",
    "nutritionist",
    "optometrist",
    "optometry",
    "med spa",
  ],

  description:
    "Trust-sensitive appointment strategy emphasizing clarity, services, provider information, location, accessibility, and appropriate next steps.",

  customerIntent: [
    "understand services",
    "find an appropriate provider",
    "check availability",
    "book",
    "find location",
  ],

  primaryGoals: [
    "build trust",
    "generate appointments",
    "make services understandable",
    "reduce uncertainty",
  ],

  conversionMode: "book",

  conversionModes: [
    "book",
    "contact",
    "call",
    "request-info",
  ],

  primaryCta:
    "Book an Appointment",

  secondaryCta:
    "Learn About Services",

  ctaLabels: [
    "Book an Appointment",
    "Schedule a Visit",
    "Learn More",
    "Contact Us",
  ],

  recommendedPages: [
    "home",
    "services",
    "about",
    "contact",
    "booking",
    "faq",
  ],

  optionalPages: [
    "team",
    "resources",
    "locations",
  ],

  prioritySections: [
    "hero",
    "services",
    "providers",
    "process",
    "trust",
    "faq",
    "booking",
    "cta",
  ],

  recommendedSections: [
    "hero",
    "services",
    "benefits",
    "approach",
    "team",
    "trust",
    "faq",
    "booking",
    "cta",
  ],

  serviceTerminology: {
    singular: "service",
    plural: "services",
    action: "care",
    customer: "patient",
  },

  visualDirection: [
    "clean",
    "trust",
    "warm",
    "modern",
  ],

  visualKeywords: [
    "calm",
    "clear",
    "welcoming",
    "professional",
    "trustworthy",
  ],

  trustSignals: [
    "provider information",
    "clear services",
    "location",
    "hours",
    "contact path",
  ],

  seoKeywords: [
    "health",
    "wellness",
    "care",
    "appointments",
  ],

  localSeoKeywords: [
    "clinic near me",
    "doctor near me",
    "dentist near me",
    "healthcare [city]",
  ],

  faqTopics: [
    "appointments",
    "services",
    "location",
    "hours",
    "insurance",
    "what to expect",
  ],

  schemaTypes: [
    "HealthCareBusiness",
    "Organization",
    "Service",
  ],
});

/* -------------------------------------------------------------------------- */
/* REAL ESTATE                                                                */
/* -------------------------------------------------------------------------- */

const REAL_ESTATE = makePlaybook({
  id: "real-estate",
  name: "Real Estate",
  family: "real-estate",
  confidence: "strong",

  aliases: [
    "real estate",
    "realtor",
    "real estate agent",
    "broker",
    "property management",
    "property manager",
    "realty",
    "homes for sale",
    "commercial real estate",
  ],

  description:
    "Discovery and lead-generation strategy centered on properties, expertise, areas served, contact, and qualified enquiries.",

  customerIntent: [
    "find properties",
    "evaluate an agent",
    "understand areas",
    "request information",
    "schedule a conversation",
  ],

  primaryGoals: [
    "generate qualified leads",
    "show available inventory",
    "build local authority",
    "make enquiries easy",
  ],

  conversionMode: "contact",

  conversionModes: [
    "contact",
    "consult",
    "request-info",
    "book",
  ],

  primaryCta:
    "Find Your Next Property",

  secondaryCta:
    "Contact an Agent",

  ctaLabels: [
    "View Properties",
    "Find a Home",
    "Contact an Agent",
    "Schedule a Consultation",
  ],

  recommendedPages: [
    "home",
    "properties",
    "about",
    "contact",
  ],

  optionalPages: [
    "services",
    "locations",
    "team",
    "faq",
    "resources",
  ],

  prioritySections: [
    "hero",
    "properties",
    "areas",
    "expertise",
    "trust",
    "cta",
  ],

  recommendedSections: [
    "hero",
    "featured-properties",
    "areas-served",
    "process",
    "expertise",
    "trust",
    "faq",
    "cta",
  ],

  serviceTerminology: {
    singular: "service",
    plural: "services",
    action: "search",
    customer: "client",
  },

  visualDirection: [
    "premium",
    "editorial",
    "trust",
    "modern",
  ],

  visualKeywords: [
    "spacious",
    "premium",
    "architectural",
    "local",
    "refined",
  ],

  trustSignals: [
    "areas served",
    "agent information",
    "property information",
    "clear contact path",
  ],

  seoKeywords: [
    "real estate",
    "homes",
    "properties",
    "realty",
  ],

  localSeoKeywords: [
    "real estate [city]",
    "homes for sale [city]",
    "realtor [city]",
  ],

  faqTopics: [
    "buying",
    "selling",
    "areas",
    "properties",
    "consultation",
  ],

  schemaTypes: [
    "RealEstateAgent",
    "Organization",
    "Service",
  ],
});

/* -------------------------------------------------------------------------- */
/* FITNESS                                                                    */
/* -------------------------------------------------------------------------- */

const FITNESS = makePlaybook({
  id: "fitness",
  name: "Fitness & Sports",
  family: "fitness-sports",
  confidence: "strong",

  aliases: [
    "gym",
    "fitness",
    "personal trainer",
    "trainer",
    "crossfit",
    "yoga",
    "pilates",
    "martial arts",
    "boxing",
    "sports",
    "dance studio",
    "fitness studio",
  ],

  description:
    "Energetic conversion strategy focused on programs, classes, schedules, memberships, coaching, and getting started.",

  customerIntent: [
    "see programs",
    "check schedule",
    "understand membership",
    "book",
    "start training",
  ],

  primaryGoals: [
    "generate signups",
    "drive trials",
    "show programs",
    "build motivation",
  ],

  conversionMode: "book",

  conversionModes: [
    "book",
    "apply",
    "contact",
  ],

  primaryCta:
    "Get Started",

  secondaryCta:
    "View Programs",

  ctaLabels: [
    "Get Started",
    "Book a Session",
    "View Programs",
    "View Schedule",
    "Contact Us",
  ],

  recommendedPages: [
    "home",
    "services",
    "classes",
    "contact",
  ],

  optionalPages: [
    "pricing",
    "team",
    "faq",
    "gallery",
    "booking",
  ],

  prioritySections: [
    "hero",
    "programs",
    "benefits",
    "schedule",
    "trust",
    "cta",
  ],

  recommendedSections: [
    "hero",
    "programs",
    "benefits",
    "classes",
    "schedule",
    "about",
    "faq",
    "cta",
  ],

  serviceTerminology: {
    singular: "program",
    plural: "programs",
    action: "train",
    customer: "member",
  },

  visualDirection: [
    "energetic",
    "bold",
    "modern",
    "premium",
  ],

  visualKeywords: [
    "energetic",
    "powerful",
    "motivating",
    "active",
    "dynamic",
  ],

  trustSignals: [
    "program information",
    "schedule",
    "trainer information",
    "membership details",
  ],

  seoKeywords: [
    "fitness",
    "gym",
    "training",
    "classes",
  ],

  localSeoKeywords: [
    "gym near me",
    "fitness near me",
    "personal trainer [city]",
  ],

  faqTopics: [
    "membership",
    "classes",
    "schedule",
    "experience level",
    "booking",
  ],

  schemaTypes: [
    "SportsActivityLocation",
    "Organization",
    "Service",
  ],
});

/* -------------------------------------------------------------------------- */
/* CONSTRUCTION                                                               */
/* -------------------------------------------------------------------------- */

const CONSTRUCTION = makePlaybook({
  id: "construction",
  name: "Construction & Contracting",
  family: "construction",
  confidence: "strong",

  aliases: [
    "construction",
    "general contractor",
    "builder",
    "home builder",
    "remodeler",
    "renovation",
    "renovations",
    "deck builder",
    "kitchen remodeling",
    "bathroom remodeling",
  ],

  description:
    "Project-led strategy focused on capabilities, completed work when supplied, process, estimates, service areas, and qualified enquiries.",

  customerIntent: [
    "evaluate capability",
    "see relevant work",
    "understand services",
    "request an estimate",
  ],

  primaryGoals: [
    "generate project enquiries",
    "show capabilities",
    "build trust",
    "make estimates easy",
  ],

  conversionMode: "quote",

  conversionModes: [
    "quote",
    "contact",
    "consult",
  ],

  primaryCta:
    "Request an Estimate",

  secondaryCta:
    "View Our Work",

  ctaLabels: [
    "Request an Estimate",
    "Get a Quote",
    "View Our Work",
    "Contact Us",
  ],

  recommendedPages: [
    "home",
    "services",
    "portfolio",
    "about",
    "contact",
  ],

  optionalPages: [
    "gallery",
    "faq",
    "locations",
  ],

  prioritySections: [
    "hero",
    "services",
    "portfolio",
    "process",
    "trust",
    "cta",
  ],

  recommendedSections: [
    "hero",
    "services",
    "project-types",
    "portfolio",
    "process",
    "service-area",
    "faq",
    "cta",
  ],

  serviceTerminology: {
    singular: "service",
    plural: "services",
    action: "build",
    customer: "client",
  },

  visualDirection: [
    "bold",
    "technical",
    "trust",
    "premium",
  ],

  visualKeywords: [
    "craftsmanship",
    "structural",
    "precise",
    "strong",
    "professional",
  ],

  trustSignals: [
    "real projects",
    "services",
    "process",
    "service area",
    "business information",
  ],

  seoKeywords: [
    "construction",
    "contractor",
    "remodeling",
    "renovation",
  ],

  localSeoKeywords: [
    "contractor [city]",
    "remodeling [city]",
    "general contractor near me",
  ],

  faqTopics: [
    "estimates",
    "project timeline",
    "service area",
    "process",
    "project types",
  ],

  schemaTypes: [
    "LocalBusiness",
    "ProfessionalService",
    "Service",
  ],
});

/* -------------------------------------------------------------------------- */
/* TECHNOLOGY                                                                 */
/* -------------------------------------------------------------------------- */

const TECHNOLOGY = makePlaybook({
  id: "technology",
  name: "Technology",
  family: "technology",
  confidence: "strong",

  aliases: [
    "software",
    "saas",
    "technology",
    "tech company",
    "app",
    "web development",
    "software development",
    "developer",
    "it services",
    "managed it",
    "cybersecurity",
    "cloud services",
    "digital agency",
  ],

  description:
    "Product/value-led technology strategy focused on clarity, differentiation, capabilities, proof, and conversion.",

  customerIntent: [
    "understand the product",
    "understand capabilities",
    "evaluate fit",
    "request a demo",
    "contact sales",
  ],

  primaryGoals: [
    "explain complex value simply",
    "differentiate",
    "generate qualified leads",
    "drive demos or enquiries",
  ],

  conversionMode: "consult",

  conversionModes: [
    "consult",
    "contact",
    "request-info",
  ],

  primaryCta:
    "Get Started",

  secondaryCta:
    "Learn More",

  ctaLabels: [
    "Get Started",
    "Request a Demo",
    "Explore Solutions",
    "Learn More",
    "Contact Sales",
  ],

  recommendedPages: [
    "home",
    "services",
    "about",
    "contact",
  ],

  optionalPages: [
    "pricing",
    "resources",
    "portfolio",
    "faq",
  ],

  prioritySections: [
    "hero",
    "value",
    "solutions",
    "features",
    "process",
    "trust",
    "cta",
  ],

  recommendedSections: [
    "hero",
    "value-proposition",
    "solutions",
    "features",
    "how-it-works",
    "use-cases",
    "faq",
    "cta",
  ],

  serviceTerminology: {
    singular: "solution",
    plural: "solutions",
    action: "build",
    customer: "client",
  },

  visualDirection: [
    "modern",
    "technical",
    "premium",
    "bold",
  ],

  visualKeywords: [
    "futuristic",
    "precise",
    "modular",
    "clean",
    "high-tech",
  ],

  trustSignals: [
    "clear capabilities",
    "specific product information",
    "real integrations when supplied",
    "clear process",
    "transparent contact path",
  ],

  seoKeywords: [
    "technology",
    "software",
    "digital solutions",
    "technology services",
  ],

  localSeoKeywords: [
    "technology company [city]",
    "IT services [city]",
    "web development [city]",
  ],

  faqTopics: [
    "services",
    "process",
    "pricing",
    "technology",
    "integrations",
    "support",
  ],

  schemaTypes: [
    "Organization",
    "SoftwareApplication",
    "Service",
  ],
});

/* -------------------------------------------------------------------------- */
/* EDUCATION                                                                  */
/* -------------------------------------------------------------------------- */

const EDUCATION = makePlaybook({
  id: "education",
  name: "Education & Training",
  family: "education",
  confidence: "strong",

  aliases: [
    "school",
    "academy",
    "tutoring",
    "tutor",
    "training",
    "course",
    "courses",
    "education",
    "instructor",
    "learning",
    "daycare",
    "childcare",
  ],

  description:
    "Program-led education strategy emphasizing offerings, schedules, outcomes stated without guarantees, enrollment, and trust.",

  customerIntent: [
    "understand programs",
    "compare options",
    "check schedule",
    "learn enrollment requirements",
    "apply or contact",
  ],

  primaryGoals: [
    "generate enrollments",
    "explain programs",
    "make next steps clear",
  ],

  conversionMode: "apply",

  conversionModes: [
    "apply",
    "contact",
    "book",
    "request-info",
  ],

  primaryCta:
    "Get Started",

  secondaryCta:
    "Explore Programs",

  ctaLabels: [
    "Get Started",
    "Explore Programs",
    "Apply Now",
    "Schedule a Visit",
    "Contact Us",
  ],

  recommendedPages: [
    "home",
    "classes",
    "about",
    "contact",
    "faq",
  ],

  optionalPages: [
    "team",
    "events",
    "resources",
    "pricing",
  ],

  prioritySections: [
    "hero",
    "programs",
    "benefits",
    "process",
    "trust",
    "faq",
    "cta",
  ],

  recommendedSections: [
    "hero",
    "programs",
    "who-its-for",
    "approach",
    "schedule",
    "faq",
    "cta",
  ],

  serviceTerminology: {
    singular: "program",
    plural: "programs",
    action: "learn",
    customer: "student",
  },

  visualDirection: [
    "clean",
    "warm",
    "modern",
    "community",
  ],

  visualKeywords: [
    "welcoming",
    "clear",
    "engaging",
    "structured",
  ],

  trustSignals: [
    "program details",
    "instructor information",
    "schedule",
    "location",
    "enrollment steps",
  ],

  seoKeywords: [
    "education",
    "classes",
    "training",
    "courses",
  ],

  localSeoKeywords: [
    "classes [city]",
    "tutoring near me",
    "academy [city]",
  ],

  faqTopics: [
    "enrollment",
    "schedule",
    "pricing",
    "requirements",
    "age groups",
    "location",
  ],

  schemaTypes: [
    "EducationalOrganization",
    "Organization",
    "Event",
  ],
});

/* -------------------------------------------------------------------------- */
/* RETAIL                                                                     */
/* -------------------------------------------------------------------------- */

const RETAIL = makePlaybook({
  id: "retail",
  name: "Retail",
  family: "retail",
  confidence: "strong",

  aliases: [
    "retail",
    "store",
    "shop",
    "boutique",
    "clothing store",
    "fashion",
    "jewelry",
    "furniture",
    "gift shop",
    "specialty store",
  ],

  description:
    "Product-discovery strategy focused on products, categories, visual merchandising, availability, shopping and store information.",

  customerIntent: [
    "discover products",
    "compare products",
    "buy",
    "visit store",
    "contact",
  ],

  primaryGoals: [
    "drive product discovery",
    "drive purchases",
    "drive store visits",
  ],

  conversionMode: "order",

  conversionModes: [
    "order",
    "visit",
    "contact",
  ],

  primaryCta:
    "Shop Now",

  secondaryCta:
    "Explore Products",

  ctaLabels: [
    "Shop Now",
    "Explore Products",
    "View Collection",
    "Visit Store",
    "Contact Us",
  ],

  recommendedPages: [
    "home",
    "products",
    "contact",
  ],

  optionalPages: [
    "about",
    "gallery",
    "events",
    "faq",
  ],

  prioritySections: [
    "hero",
    "products",
    "collections",
    "benefits",
    "location",
    "cta",
  ],

  recommendedSections: [
    "hero",
    "featured-products",
    "collections",
    "why-us",
    "gallery",
    "location",
    "faq",
    "cta",
  ],

  serviceTerminology: {
    singular: "product",
    plural: "products",
    action: "shop",
    customer: "customer",
  },

  visualDirection: [
    "editorial",
    "premium",
    "bold",
    "modern",
  ],

  visualKeywords: [
    "curated",
    "visual",
    "stylish",
    "immersive",
    "clean",
  ],

  trustSignals: [
    "product information",
    "store information",
    "clear contact path",
  ],

  seoKeywords: [
    "shop",
    "store",
    "products",
    "collection",
  ],

  localSeoKeywords: [
    "shop near me",
    "store [city]",
    "boutique [city]",
  ],

  faqTopics: [
    "shipping",
    "returns",
    "availability",
    "store hours",
    "location",
  ],

  schemaTypes: [
    "Product",
    "Organization",
    "WebSite",
  ],
});

/* -------------------------------------------------------------------------- */
/* INDUSTRY REGISTRY                                                          */
/* -------------------------------------------------------------------------- */

const PLAYBOOKS: IndustryPlaybook[] = [
  HOME_SERVICES,
  PROFESSIONAL_SERVICES,
  BEAUTY,
  FOOD,
  AUTOMOTIVE,
  HEALTH,
  REAL_ESTATE,
  FITNESS,
  CONSTRUCTION,
  TECHNOLOGY,
  EDUCATION,
  RETAIL,
];

/* -------------------------------------------------------------------------- */
/* HIGH-SIGNAL INDUSTRY MATCHING                                              */
/* -------------------------------------------------------------------------- */

type MatchResult = {
  playbook: IndustryPlaybook;
  score: number;
  matchedTerms: string[];
};

function scorePlaybook(
  input: string,
  playbook: IndustryPlaybook,
): MatchResult {
  const normalized =
    normalize(input);

  const inputTokens =
    new Set(tokens(input));

  let score = 0;

  const matchedTerms: string[] =
    [];

  for (const alias of playbook.aliases) {
    const aliasNormalized =
      normalize(alias);

    if (
      !aliasNormalized
    ) {
      continue;
    }

    if (
      normalized ===
      aliasNormalized
    ) {
      score += 100;
      matchedTerms.push(alias);
      continue;
    }

    if (
      normalized.includes(
        aliasNormalized,
      )
    ) {
      score +=
        aliasNormalized.includes(
          " ",
        )
          ? 48
          : 28;

      matchedTerms.push(alias);
      continue;
    }

    const aliasTokens =
      tokens(aliasNormalized);

    const overlap =
      aliasTokens.filter(
        (token) =>
          inputTokens.has(token),
      ).length;

    if (
      overlap > 0
    ) {
      score +=
        overlap *
        (
          aliasTokens.length >
          1
            ? 9
            : 5
        );
    }
  }

  /*
   * Strategy terminology can reinforce an industry match without replacing
   * explicit aliases.
   */
  for (const keyword of [
    ...playbook.seoKeywords,
    ...playbook.localSeoKeywords,
  ]) {
    const keywordNormalized =
      normalize(keyword)
        .replace(
          /\[city\]/g,
          "",
        )
        .replace(
          /\[service\]/g,
          "",
        )
        .trim();

    if (
      keywordNormalized &&
      normalized.includes(
        keywordNormalized,
      )
    ) {
      score += 3;
    }
  }

  return {
    playbook,
    score,
    matchedTerms:
      unique(
        matchedTerms,
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* SPECIAL HIGH-CONFIDENCE DETECTION                                          */
/* -------------------------------------------------------------------------- */

function refineMatch(
  input: string,
  result: MatchResult,
): MatchResult {
  const text =
    normalize(input);

  /*
   * Some terms are ambiguous. Resolve them with surrounding language.
   */

  if (
    containsAny(text, [
      "car",
      "vehicle",
      "auto",
    ]) &&
    containsAny(text, [
      "repair",
      "mechanic",
      "brake",
      "oil",
      "transmission",
      "detailing",
      "tire",
      "collision",
    ])
  ) {
    if (
      result.playbook.id ===
        "automotive"
    ) {
      result.score += 35;
    }
  }

  if (
    containsAny(text, [
      "home",
      "house",
      "property",
    ]) &&
    containsAny(text, [
      "repair",
      "service",
      "installation",
      "remodel",
      "maintenance",
    ])
  ) {
    if (
      result.playbook.id ===
        "home-services" ||
      result.playbook.id ===
        "construction"
    ) {
      result.score += 20;
    }
  }

  if (
    containsAny(text, [
      "book",
      "appointment",
      "appointment",
    ]) &&
    containsAny(text, [
      "salon",
      "barber",
      "spa",
      "lashes",
      "nails",
      "beauty",
    ])
  ) {
    if (
      result.playbook.id ===
      "beauty"
    ) {
      result.score += 25;
    }
  }

  if (
    containsAny(text, [
      "menu",
      "restaurant",
      "cafe",
      "bakery",
      "food",
    ])
  ) {
    if (
      result.playbook.id ===
      "food-hospitality"
    ) {
      result.score += 30;
    }
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* CONFIDENCE                                                                 */
/* -------------------------------------------------------------------------- */

function confidenceFor(
  score: number,
): IndustryConfidence {
  if (score >= 100) {
    return "exact";
  }

  if (score >= 55) {
    return "strong";
  }

  if (score >= 25) {
    return "probable";
  }

  if (score >= 8) {
    return "broad";
  }

  return "generic";
}

/* -------------------------------------------------------------------------- */
/* PLAYBOOK RESOLUTION                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Resolve the best deterministic industry strategy.
 *
 * This is the primary public API consumed by the builder.
 */
export function playbookFor(
  industry: string | null | undefined,
): IndustryPlaybook {
  const input =
    normalize(industry);

  if (!input) {
    return GENERIC_PLAYBOOK;
  }

  const ranked =
    PLAYBOOKS.map(
      (playbook) =>
        refineMatch(
          input,
          scorePlaybook(
            input,
            playbook,
          ),
        ),
    ).sort(
      (a, b) =>
        b.score - a.score,
      );

  const best =
    ranked[0];

  if (
    !best ||
    best.score < 8
  ) {
    return {
      ...GENERIC_PLAYBOOK,
      confidence: "generic",
    };
  }

  const confidence =
    confidenceFor(
      best.score,
    );

  return {
    ...best.playbook,
    confidence,

    metadata: {
      ...(best.playbook.metadata ??
        {}),
      matchedTerms:
        best.matchedTerms,
      matchScore:
        best.score,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* DESCRIPTION-BASED RESOLUTION                                              */
/* -------------------------------------------------------------------------- */

/**
 * Useful when the user supplies a complete business description instead of
 * a clean industry label.
 */
export function playbookForBusiness(
  input: {
    name?: string | null;
    industry?: string | null;
    description?: string | null;
    services?: string[] | null;
  },
): IndustryPlaybook {
  const combined = [
    input.industry ?? "",
    input.description ?? "",
    ...(input.services ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  return playbookFor(
    combined,
  );
}

/* -------------------------------------------------------------------------- */
/* SERVICE-SPECIFIC REFINEMENT                                                */
/* -------------------------------------------------------------------------- */

/**
 * Returns the best playbook when the business has several service keywords.
 *
 * This prevents a broad industry label from overpowering a much more useful
 * service-specific signal.
 */
export function refinePlaybookByServices(
  playbook: IndustryPlaybook,
  services: string[],
): IndustryPlaybook {
  if (
    !services.length
  ) {
    return playbook;
  }

  const refined =
    playbookFor(
      [
        playbook.name,
        ...services,
      ].join(" "),
    );

  /*
   * Do not switch industries merely because one weak keyword matches.
   * A strong existing classification wins unless the refinement is clearly
   * stronger.
   */
  const refinedConfidenceRank =
    confidenceRank(
      refined.confidence,
    );

  const currentConfidenceRank =
    confidenceRank(
      playbook.confidence,
    );

  if (
    refined.id !==
      playbook.id &&
    refinedConfidenceRank <
      currentConfidenceRank
  ) {
    return playbook;
  }

  return refined;
}

function confidenceRank(
  confidence: IndustryConfidence,
): number {
  switch (confidence) {
    case "exact":
      return 5;
    case "strong":
      return 4;
    case "probable":
      return 3;
    case "broad":
      return 2;
    case "generic":
    default:
      return 1;
  }
}

/* -------------------------------------------------------------------------- */
/* PAGE STRATEGY                                                              */
/* -------------------------------------------------------------------------- */

export function recommendedPagesFor(
  playbook: IndustryPlaybook,
): PageKind[] {
  return unique([
    ...playbook.recommendedPages,
  ]).sort(
    (a, b) =>
      (
        playbook.pagePriority[b] ??
        0
      ) -
      (
        playbook.pagePriority[a] ??
        0
      ),
  );
}

export function optionalPagesFor(
  playbook: IndustryPlaybook,
): PageKind[] {
  return unique([
    ...playbook.optionalPages,
  ]).sort(
    (a, b) =>
      (
        playbook.pagePriority[b] ??
        0
      ) -
      (
        playbook.pagePriority[a] ??
        0
      ),
  );
}

/**
 * Pick page strategy from a natural-language page request.
 */
export function pageKindFor(
  request: string,
): PageKind {
  const text =
    normalize(request);

  if (
    containsAny(text, [
      "home",
      "homepage",
      "landing",
    ])
  ) {
    return "home";
  }

  if (
    containsAny(text, [
      "about",
      "who we are",
      "our story",
    ])
  ) {
    return "about";
  }

  if (
    containsAny(text, [
      "service",
      "services",
      "what we do",
    ])
  ) {
    return "services";
  }

  if (
    containsAny(text, [
      "pricing",
      "price",
      "rates",
      "packages",
    ])
  ) {
    return "pricing";
  }

  if (
    containsAny(text, [
      "contact",
      "reach us",
      "get in touch",
    ])
  ) {
    return "contact";
  }

  if (
    containsAny(text, [
      "book",
      "booking",
      "appointment",
      "schedule",
    ])
  ) {
    return "booking";
  }

  if (
    containsAny(text, [
      "faq",
      "questions",
    ])
  ) {
    return "faq";
  }

  if (
    containsAny(text, [
      "gallery",
      "photos",
      "images",
    ])
  ) {
    return "gallery";
  }

  if (
    containsAny(text, [
      "portfolio",
      "our work",
      "projects",
    ])
  ) {
    return "portfolio";
  }

  if (
    containsAny(text, [
      "menu",
      "food menu",
    ])
  ) {
    return "menu";
  }

  if (
    containsAny(text, [
      "product",
      "products",
      "shop",
      "store",
    ])
  ) {
    return "products";
  }

  if (
    containsAny(text, [
      "location",
      "locations",
      "areas",
      "service area",
    ])
  ) {
    return "locations";
  }

  if (
    containsAny(text, [
      "team",
      "staff",
      "people",
    ])
  ) {
    return "team";
  }

  if (
    containsAny(text, [
      "testimonial",
      "testimonials",
      "reviews",
    ])
  ) {
    return "testimonials";
  }

  if (
    containsAny(text, [
      "blog",
      "articles",
      "news",
    ])
  ) {
    return "blog";
  }

  if (
    containsAny(text, [
      "resource",
      "resources",
      "guides",
    ])
  ) {
    return "resources";
  }

  if (
    containsAny(text, [
      "class",
      "classes",
      "program",
      "programs",
      "schedule",
    ])
  ) {
    return "classes";
  }

  if (
    containsAny(text, [
      "event",
      "events",
    ])
  ) {
    return "events";
  }

  if (
    containsAny(text, [
      "property",
      "properties",
      "homes",
      "listings",
    ])
  ) {
    return "properties";
  }

  if (
    containsAny(text, [
      "inventory",
      "catalog",
      "catalogue",
    ])
  ) {
    return "inventory";
  }

  if (
    containsAny(text, [
      "application",
      "apply",
      "enroll",
      "enrollment",
    ])
  ) {
    return "application";
  }

  return "other";
}

/* -------------------------------------------------------------------------- */
/* SECTION STRATEGY                                                           */
/* -------------------------------------------------------------------------- */

export function recommendedSectionsFor(
  playbook: IndustryPlaybook,
): string[] {
  return unique([
    ...playbook.prioritySections,
    ...playbook.recommendedSections,
  ]).sort(
    (a, b) =>
      (
        playbook.sectionPriority[
          b
        ] ??
        0
      ) -
      (
        playbook.sectionPriority[
          a
        ] ??
        0
      ),
  );
}

export function shouldAvoidSection(
  playbook: IndustryPlaybook,
  section: string,
): boolean {
  const target =
    normalize(section);

  return playbook.avoidSections.some(
    (item) =>
      normalize(item) ===
      target,
  );
}

/* -------------------------------------------------------------------------- */
/* CTA INTELLIGENCE                                                           */
/* -------------------------------------------------------------------------- */

export function primaryCtaFor(
  playbook: IndustryPlaybook,
): string {
  return (
    playbook.primaryCta ||
    GENERIC_PLAYBOOK.primaryCta
  );
}

export function secondaryCtaFor(
  playbook: IndustryPlaybook,
): string {
  return (
    playbook.secondaryCta ||
    GENERIC_PLAYBOOK.secondaryCta
  );
}

export function ctaLabelsFor(
  playbook: IndustryPlaybook,
): string[] {
  return unique([
    playbook.primaryCta,
    playbook.secondaryCta,
    ...playbook.ctaLabels,
  ].filter(Boolean));
}

export function conversionModeFor(
  playbook: IndustryPlaybook,
): ConversionMode {
  return (
    playbook.conversionMode ??
    "contact"
  );
}

/**
 * Select a CTA appropriate for a requested context.
 */
export function ctaForContext(
  playbook: IndustryPlaybook,
  context: string,
): string {
  const text =
    normalize(context);

  if (
    containsAny(text, [
      "hero",
      "top",
      "first",
    ])
  ) {
    return primaryCtaFor(
      playbook,
    );
  }

  if (
    containsAny(text, [
      "contact",
      "footer",
      "bottom",
    ])
  ) {
    return (
      playbook.secondaryCta ||
      playbook.primaryCta
    );
  }

  const labels =
    ctaLabelsFor(
      playbook,
    );

  return (
    labels[0] ??
    "Get Started"
  );
}

/* -------------------------------------------------------------------------- */
/* SEO INTELLIGENCE                                                           */
/* -------------------------------------------------------------------------- */

export function seoTermsFor(
  playbook: IndustryPlaybook,
): string[] {
  return unique(
    playbook.seoKeywords
      .map(normalize)
      .filter(Boolean),
  );
}

export function localSeoTermsFor(
  playbook: IndustryPlaybook,
): string[] {
  return unique(
    playbook.localSeoKeywords
      .map(normalize)
      .filter(Boolean),
  );
}

/**
 * Replace supported placeholders without inventing values.
 */
export function personalizeSeoTerm(
  term: string,
  values: {
    city?: string | null;
    service?: string | null;
  },
): string {
  return term
    .replace(
      /\[city\]/gi,
      values.city
        ? values.city.trim()
        : "[city]",
    )
    .replace(
      /\[service\]/gi,
      values.service
        ? values.service.trim()
        : "[service]",
    );
}

export function seoTermsWithFacts(
  playbook: IndustryPlaybook,
  values: {
    city?: string | null;
    services?: string[];
  },
): string[] {
  const terms = [
    ...playbook.seoKeywords,
    ...playbook.localSeoKeywords,
  ];

  const services =
    values.services ?? [];

  return unique(
    terms
      .map((term) =>
        personalizeSeoTerm(
          term,
          {
            city:
              values.city,
            service:
              services[0] ??
              null,
          },
        ),
      )
      .concat(
        services
          .slice(0, 8)
          .map(
            (service) =>
              normalize(
                service,
              ),
          ),
      )
      .filter(
        (term) =>
          term &&
          !term.includes(
            "[city]",
          ) &&
          !term.includes(
            "[service]",
          ),
      ),
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ INTELLIGENCE                                                            */
/* -------------------------------------------------------------------------- */

export function faqTopicsFor(
  playbook: IndustryPlaybook,
): string[] {
  return unique(
    playbook.faqTopics
      .map(normalize)
      .filter(Boolean),
  );
}

/**
 * Build useful FAQ prompts without fabricating answers.
 */
export function faqPromptsFor(
  playbook: IndustryPlaybook,
): string[] {
  const prompts: string[] =
    [];

  for (const topic of
    playbook.faqTopics) {
    const normalized =
      normalize(topic);

    if (!normalized) {
      continue;
    }

    prompts.push(
      `What should customers know about ${normalized}?`,
    );
  }

  return unique(
    prompts,
  );
}

/* -------------------------------------------------------------------------- */
/* SCHEMA INTELLIGENCE                                                        */
/* -------------------------------------------------------------------------- */

export function schemaTypesFor(
  playbook: IndustryPlaybook,
): SchemaKind[] {
  return unique(
    playbook.schemaTypes,
  );
}

export function primarySchemaFor(
  playbook: IndustryPlaybook,
): SchemaKind {
  return (
    playbook.schemaTypes[0] ??
    "Organization"
  );
}

/* -------------------------------------------------------------------------- */
/* VISUAL INTELLIGENCE                                                        */
/* -------------------------------------------------------------------------- */

export function visualDirectionFor(
  playbook: IndustryPlaybook,
): VisualDirection[] {
  return unique([
    ...playbook.visualDirection,
  ]);
}

export function visualKeywordsFor(
  playbook: IndustryPlaybook,
): string[] {
  return unique([
    ...playbook.visualKeywords,
  ]);
}

/**
 * Produces a compact visual brief for the presentation engine.
 */
export function visualBriefFor(
  playbook: IndustryPlaybook,
): string {
  return [
    `Industry: ${playbook.name}`,
    `Family: ${playbook.family}`,
    `Direction: ${playbook.visualDirection.join(", ")}`,
    `Visual language: ${playbook.visualKeywords.join(", ")}`,
  ].join(" | ");
}

/* -------------------------------------------------------------------------- */
/* TRUST INTELLIGENCE                                                         */
/* -------------------------------------------------------------------------- */

export function trustSignalsFor(
  playbook: IndustryPlaybook,
): string[] {
  return unique([
    ...playbook.trustSignals,
  ]);
}

/**
 * Trust should be built from verifiable business facts—not invented proof.
 */
export function trustRulesFor(
  playbook: IndustryPlaybook,
): string[] {
  return [
    ...playbook.trustSignals,
    "Use only supplied credentials, certifications, awards, ratings, reviews, statistics, years-in-business claims, and guarantees.",
    "Never generate fake customer testimonials.",
    "Never generate fake review counts.",
    "Never generate fake business results.",
  ];
}

/* -------------------------------------------------------------------------- */
/* CONTENT INTELLIGENCE                                                       */
/* -------------------------------------------------------------------------- */

export function contentRulesFor(
  playbook: IndustryPlaybook,
): string[] {
  return unique([
    ...playbook.contentRules,
    "Use the business's real name when available.",
    "Use real services when available.",
    "Use real location information when available.",
    "Do not invent missing facts.",
    "Prefer specific copy over generic filler.",
    "Do not claim superiority without evidence.",
  ]);
}

/* -------------------------------------------------------------------------- */
/* MOBILE INTELLIGENCE                                                        */
/* -------------------------------------------------------------------------- */

export function mobileRulesFor(
  playbook: IndustryPlaybook,
): string[] {
  return unique([
    ...playbook.mobileRules,
    "Keep the primary conversion action visible.",
    "Avoid dense navigation.",
    "Avoid horizontal scrolling.",
    "Keep buttons comfortable to tap.",
    "Do not allow decorative effects to cover content.",
  ]);
}

/* -------------------------------------------------------------------------- */
/* NAVIGATION INTELLIGENCE                                                    */
/* -------------------------------------------------------------------------- */

export function navigationRulesFor(
  playbook: IndustryPlaybook,
): string[] {
  return unique([
    ...playbook.navigationRules,
    "Keep the most important page destinations obvious.",
    "Do not create dead navigation links.",
    "Avoid excessive top-level navigation items.",
    "Preserve a clear path back to the homepage.",
  ]);
}

/* -------------------------------------------------------------------------- */
/* SERVICE TERMINOLOGY                                                        */
/* -------------------------------------------------------------------------- */

export function serviceLabelFor(
  playbook: IndustryPlaybook,
  count = 1,
): string {
  if (
    count === 1
  ) {
    return (
      playbook.serviceTerminology
        .singular ||
      "service"
    );
  }

  return (
    playbook.serviceTerminology
      .plural ||
    "services"
  );
}

export function customerLabelFor(
  playbook: IndustryPlaybook,
): string {
  return (
    playbook.serviceTerminology
      .customer ||
    "customer"
  );
}

export function actionLabelFor(
  playbook: IndustryPlaybook,
): string {
  return (
    playbook.serviceTerminology
      .action ||
    "work"
  );
}

/* -------------------------------------------------------------------------- */
/* INDUSTRY FAMILY HELPERS                                                    */
/* -------------------------------------------------------------------------- */

export function isLocalBusinessFamily(
  playbook: IndustryPlaybook,
): boolean {
  return [
    "home-services",
    "beauty",
    "food-hospitality",
    "automotive",
    "health-wellness",
    "fitness-sports",
    "construction",
    "retail",
    "pet-services",
  ].includes(
    playbook.family,
  );
}

export function isAppointmentDriven(
  playbook: IndustryPlaybook,
): boolean {
  return (
    playbook.conversionModes.includes(
      "book",
    ) ||
    playbook.conversionMode ===
      "book"
  );
}

export function isQuoteDriven(
  playbook: IndustryPlaybook,
): boolean {
  return (
    playbook.conversionModes.includes(
      "quote",
    ) ||
    playbook.conversionMode ===
      "quote"
  );
}

export function isProductDriven(
  playbook: IndustryPlaybook,
): boolean {
  return (
    playbook.conversionModes.includes(
      "order",
    ) ||
    playbook.recommendedPages.includes(
      "products",
    )
  );
}

/* -------------------------------------------------------------------------- */
/* STRATEGY SUMMARY                                                           */
/* -------------------------------------------------------------------------- */

export type IndustryStrategySummary = {
  industry: string;
  family: IndustryFamily;
  confidence: IndustryConfidence;
  conversionMode: ConversionMode;
  primaryCta: string;
  secondaryCta: string;
  pages: PageKind[];
  sections: string[];
  visualDirection: VisualDirection[];
  schemaTypes: SchemaKind[];
  faqTopics: string[];
  seoKeywords: string[];
};

export function strategySummaryFor(
  playbook: IndustryPlaybook,
): IndustryStrategySummary {
  return {
    industry:
      playbook.name,

    family:
      playbook.family,

    confidence:
      playbook.confidence,

    conversionMode:
      playbook.conversionMode,

    primaryCta:
      playbook.primaryCta,

    secondaryCta:
      playbook.secondaryCta,

    pages:
      recommendedPagesFor(
        playbook,
      ),

    sections:
      recommendedSectionsFor(
        playbook,
      ),

    visualDirection:
      visualDirectionFor(
        playbook,
      ),

    schemaTypes:
      schemaTypesFor(
        playbook,
      ),

    faqTopics:
      faqTopicsFor(
        playbook,
      ),

    seoKeywords:
      seoTermsFor(
        playbook,
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* BUILDER DECISION HELPERS                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Determines whether an industry strategy should materially influence a
 * generated page.
 */
export function shouldUseIndustryStrategy(
  playbook: IndustryPlaybook,
): boolean {
  return (
    playbook.id !==
    GENERIC_PLAYBOOK.id
  );
}

/**
 * Determines whether local SEO should be emphasized.
 */
export function shouldUseLocalSeo(
  playbook: IndustryPlaybook,
  hasLocation: boolean,
): boolean {
  return (
    hasLocation &&
    (
      isLocalBusinessFamily(
        playbook,
      ) ||
      playbook.localSeoKeywords
        .length > 0
    )
  );
}

/**
 * Determines whether the builder should prioritize booking over a generic
 * contact CTA.
 */
export function shouldPrioritizeBooking(
  playbook: IndustryPlaybook,
): boolean {
  return isAppointmentDriven(
    playbook,
  );
}

/**
 * Determines whether estimate/quote conversion should be prioritized.
 */
export function shouldPrioritizeQuote(
  playbook: IndustryPlaybook,
): boolean {
  return isQuoteDriven(
    playbook,
  );
}

/* -------------------------------------------------------------------------- */
/* SAFE STRATEGY MERGING                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Merge an industry playbook with a more specific runtime strategy while
 * preserving all deterministic defaults.
 *
 * This is intentionally shallow and predictable.
 */
export function mergePlaybooks(
  base: IndustryPlaybook,
  override: Partial<IndustryPlaybook>,
): IndustryPlaybook {
  return {
    ...base,
    ...override,

    aliases:
      override.aliases ??
      base.aliases,

    customerIntent:
      override.customerIntent ??
      base.customerIntent,

    primaryGoals:
      override.primaryGoals ??
      base.primaryGoals,

    conversionModes:
      override.conversionModes ??
      base.conversionModes,

    ctaLabels:
      override.ctaLabels ??
      base.ctaLabels,

    recommendedPages:
      override.recommendedPages ??
      base.recommendedPages,

    optionalPages:
      override.optionalPages ??
      base.optionalPages,

    prioritySections:
      override.prioritySections ??
      base.prioritySections,

    recommendedSections:
      override.recommendedSections ??
      base.recommendedSections,

    avoidSections:
      override.avoidSections ??
      base.avoidSections,

    visualDirection:
      override.visualDirection ??
      base.visualDirection,

    visualKeywords:
      override.visualKeywords ??
      base.visualKeywords,

    trustSignals:
      override.trustSignals ??
      base.trustSignals,

    seoKeywords:
      override.seoKeywords ??
      base.seoKeywords,

    localSeoKeywords:
      override.localSeoKeywords ??
      base.localSeoKeywords,

    faqTopics:
      override.faqTopics ??
      base.faqTopics,

    schemaTypes:
      override.schemaTypes ??
      base.schemaTypes,

    contentRules:
      override.contentRules ??
      base.contentRules,

    conversionRules:
      override.conversionRules ??
      base.conversionRules,

    imageRules:
      override.imageRules ??
      base.imageRules,

    mobileRules:
      override.mobileRules ??
      base.mobileRules,

    accessibilityRules:
      override.accessibilityRules ??
      base.accessibilityRules,

    navigationRules:
      override.navigationRules ??
      base.navigationRules,

    pagePriority: {
      ...base.pagePriority,
      ...(override.pagePriority ??
        {}),
    },

    sectionPriority: {
      ...base.sectionPriority,
      ...(override.sectionPriority ??
        {}),
    },

    serviceTerminology: {
      ...base.serviceTerminology,
      ...(override.serviceTerminology ??
        {}),
    },

    metadata: {
      ...(base.metadata ?? {}),
      ...(override.metadata ?? {}),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* EXPORT REGISTRY                                                            */
/* -------------------------------------------------------------------------- */

export const INDUSTRY_PLAYBOOKS = {
  generic: GENERIC_PLAYBOOK,
  homeServices:
    HOME_SERVICES,
  professionalServices:
    PROFESSIONAL_SERVICES,
  beauty: BEAUTY,
  food:
    FOOD,
  automotive:
    AUTOMOTIVE,
  health:
    HEALTH,
  realEstate:
    REAL_ESTATE,
  fitness:
    FITNESS,
  construction:
    CONSTRUCTION,
  technology:
    TECHNOLOGY,
  education:
    EDUCATION,
  retail:
    RETAIL,
} as const;

/**
 * Stable list for diagnostics/tests.
 */
export function allIndustryPlaybooks(): IndustryPlaybook[] {
  return [
    ...PLAYBOOKS,
  ];
}