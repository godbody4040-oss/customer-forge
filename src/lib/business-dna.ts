/**
 * REVORA BUSINESS DNA — the one authoritative understanding of a client's
 * business that every AI subsystem reads from.
 *
 * Two hard rules, enforced by this module rather than by prompt wording:
 *
 * 1. Every field is either derived from a fact the client actually supplied, or
 *    it is listed in `unknown` / `needed`. Nothing is invented.
 * 2. Claim classes that could get a real business in trouble — reviews, awards,
 *    licences, certifications, guarantees, statistics, prices, extra locations —
 *    are listed in `prohibited` and can be screened out of generated copy with
 *    `screenClaims()`.
 *
 * The module is pure and browser-safe so the builder, the generator, Pre-Flight
 * and self-healing all reason from the same object.
 */

export type UrgencyLevel = "emergency" | "soon" | "planned" | "researching";

export type PricingModel = "quote_per_job" | "starting_prices" | "fixed_price" | "unstated";

export type BusinessDna = {
  /* identity — supplied facts only */
  name: string;
  industry: string | null;
  subIndustry: string | null;
  services: string[];
  city: string | null;
  region: string | null;
  country: string | null;
  serviceArea: string | null;
  phone: string | null;
  email: string | null;

  /* derived understanding */
  positioning: string;
  targetCustomer: string;
  customerProblems: string[];
  urgency: UrgencyLevel;
  objections: string[];
  differentiators: string[];
  personality: string;
  visualPersonality: string;

  /* what the site must make happen */
  desiredAction: string;
  primaryCta: string;
  secondaryCta: string;
  needsBooking: boolean;
  needsQuote: boolean;
  qualifyingFields: string[];
  pricingModel: PricingModel;
  trustRequirements: string[];

  /* strategy */
  geoStrategy: "single_location" | "service_area" | "multi_area" | "online";
  seoStrategy: string[];
  contentStrategy: string[];
  conversionStrategy: string[];
  seasonality: string | null;

  /* honesty ledger */
  supplied: string[];
  unknown: string[];
  /** Plain-language asks for the owner, in priority order. */
  needed: string[];
  prohibited: string[];
  /** 0–100: how much of the DNA rests on supplied facts rather than defaults. */
  confidence: number;
};

export type DnaFacts = {
  businessName?: string | null;
  industry?: string | null;
  services?: string[] | null;
  description?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  serviceArea?: string | null;
  phone?: string | null;
  email?: string | null;
  yearsInBusiness?: number | null;
  certifications?: string | null;
  awards?: string | null;
  testimonialCount?: number | null;
  reviewLink?: string | null;
  photoCount?: number | null;
  /** Real service prices, when the client entered them. */
  hasPrices?: boolean | null;
  bookableServices?: number | null;
  /** Website goals the client picked during onboarding. */
  goals?: string[] | null;
  conversionGoal?: string | null;
  hasHours?: boolean | null;
};

export const PROHIBITED_CLAIMS = [
  "reviews or ratings you didn't supply",
  "awards",
  "licences",
  "certifications",
  "statistics or percentages",
  "guarantees or warranties",
  "prices",
  "extra locations",
  "professional credentials",
  "customer quotes",
  "business milestones",
] as const;

/** Claim-shaped language that must never be generated from thin air. */
const CLAIM_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b\d{1,3}(\.\d)?\s*(star|stars|\/\s*5)\b/i, reason: "star rating" },
  { pattern: /\b(award[- ]?winning|award winner|voted best|#\s?1\b|number one)\b/i, reason: "award" },
  { pattern: /\b(licen[cs]ed|certified|accredited|insured and bonded)\b/i, reason: "credential" },
  { pattern: /\b\d{1,3}\s?%/, reason: "statistic" },
  { pattern: /\b(guarantee[d]?|warrant(y|ied)|money[- ]back)\b/i, reason: "guarantee" },
  { pattern: /\b\d{2,3}\+?\s*(five[- ]star|happy customers|clients served|reviews)\b/i, reason: "customer count" },
  { pattern: /\b(cheapest|lowest price|best in|leading|award)\b/i, reason: "superlative claim" },
];

export type ClaimIssue = { text: string; reason: string };

/**
 * Screens generated copy for claims the client never supplied. Facts the client
 * did supply (awards, certifications, real testimonials) are allowed through.
 */
export function screenClaims(text: string, facts: DnaFacts): ClaimIssue[] {
  const allowCredentials = Boolean(facts.certifications?.trim());
  const allowAwards = Boolean(facts.awards?.trim());
  const allowRatings = (facts.testimonialCount ?? 0) > 0;
  const out: ClaimIssue[] = [];
  for (const { pattern, reason } of CLAIM_PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;
    if (reason === "credential" && allowCredentials) continue;
    if (reason === "award" && allowAwards) continue;
    if ((reason === "star rating" || reason === "customer count") && allowRatings) continue;
    out.push({ text: match[0], reason });
  }
  return out;
}

const clean = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : null;

const EMERGENCY_TRADES = /(plumb|electric|hvac|heating|roof|locksmith|water damage|restoration|towing|glass|garage door|pest)/i;
const APPOINTMENT_TRADES = /(salon|barber|spa|nail|lash|clean|detail|dog|groom|massage|dental|tattoo|photograph|fitness|tutor|therap)/i;
const PROJECT_TRADES = /(landscap|remodel|renovat|build|construct|paint|fenc|concrete|kitchen|bath|solar|floor|window|deck|pav)/i;

function urgencyOf(industry: string | null): UrgencyLevel {
  if (!industry) return "researching";
  if (EMERGENCY_TRADES.test(industry)) return "emergency";
  if (APPOINTMENT_TRADES.test(industry)) return "soon";
  if (PROJECT_TRADES.test(industry)) return "planned";
  return "researching";
}

/** Builds the Business DNA. Same facts in, same DNA out. */
export function businessDna(facts: DnaFacts): BusinessDna {
  const name = clean(facts.businessName) ?? "This business";
  const industry = clean(facts.industry);
  const trade = industry ?? "local services";
  const services = (facts.services ?? [])
    .map((service) => clean(service))
    .filter((service): service is string => Boolean(service))
    .slice(0, 24);
  const city = clean(facts.city);
  const region = clean(facts.region);
  const country = clean(facts.country);
  const serviceArea = clean(facts.serviceArea);
  const area = serviceArea ?? city;
  const urgency = urgencyOf(industry);
  const bookable = facts.bookableServices ?? 0;
  const hasPrices = facts.hasPrices === true;

  const supplied: string[] = [];
  const unknown: string[] = [];
  const needed: string[] = [];
  const mark = (label: string, present: boolean, ask?: string) => {
    if (present) supplied.push(label);
    else {
      unknown.push(label);
      if (ask) needed.push(ask);
    }
  };

  mark("business name", Boolean(clean(facts.businessName)), "Add your business name.");
  mark("industry", Boolean(industry), "Tell Revora what trade you're in.");
  mark("services", services.length > 0, "List the services you actually offer.");
  mark("service area", Boolean(area), "Add the town or area you cover.");
  mark("phone", Boolean(clean(facts.phone)), "Add the phone number customers should call.");
  mark("email", Boolean(clean(facts.email)), "Add the email that should receive enquiries.");
  mark("opening hours", facts.hasHours === true, "Set your opening hours.");
  mark("photos of real work", (facts.photoCount ?? 0) > 0, "Upload a few photos of your own work.");
  mark("customer reviews", (facts.testimonialCount ?? 0) > 0 || Boolean(clean(facts.reviewLink)), "Add real reviews, or a link to where customers leave them.");
  mark("pricing", hasPrices, "Add starting prices, or leave pricing to quotes.");

  const problems = services.length
    ? services.slice(0, 4).map((service) => `Needs ${service.toLowerCase()} handled properly`)
    : ["Needs a trustworthy local provider who answers"];
  if (urgency === "emergency") problems.unshift("Has an urgent problem right now");

  const objections = [
    "Will they actually turn up when they say?",
    hasPrices ? "Is the price they show the price I pay?" : "What is this going to cost me?",
    "Have they done this exact job before?",
    "How quickly can they get to me?",
  ].slice(0, 4);

  const differentiators: string[] = [];
  if (facts.yearsInBusiness && facts.yearsInBusiness > 0)
    differentiators.push(`${facts.yearsInBusiness} years trading`);
  if (clean(facts.certifications)) differentiators.push(facts.certifications!.trim().slice(0, 80));
  if (clean(facts.awards)) differentiators.push(facts.awards!.trim().slice(0, 80));
  if (bookable > 0) differentiators.push("Online booking, no phone tag");
  if (hasPrices) differentiators.push("Prices published up front");

  const trustRequirements = [
    "Real photos of completed work",
    "A phone number and email that reach a human",
    "Clear service list with what's included",
    "Reviews from real customers",
  ];

  const primaryCta =
    urgency === "emergency"
      ? "Call now"
      : bookable > 0
        ? "Book a time"
        : "Get a quote";
  const secondaryCta = bookable > 0 ? "Get a quote" : "See services";
  const needsBooking = bookable > 0 || urgency === "soon";
  const needsQuote = urgency !== "soon" || !bookable;

  const goals = (facts.goals ?? []).map((goal) => clean(goal)).filter((g): g is string => Boolean(g));
  const desiredAction =
    clean(facts.conversionGoal) === "calls"
      ? "Get the phone ringing"
      : clean(facts.conversionGoal) === "bookings"
        ? "Fill the calendar with booked jobs"
        : clean(facts.conversionGoal) === "quotes"
          ? "Collect qualified quote requests"
          : goals[0] ?? (urgency === "emergency" ? "Get the phone ringing" : "Collect qualified quote requests");

  const geoStrategy: BusinessDna["geoStrategy"] = serviceArea
    ? serviceArea.includes(",") || /\band\b|&/.test(serviceArea)
      ? "multi_area"
      : "service_area"
    : city
      ? "single_location"
      : "online";

  const seoStrategy = [
    area ? `${trade} in ${area}` : `${trade} search terms`,
    ...services.slice(0, 4).map((service) => (area ? `${service} ${area}` : service)),
    "Business name searches",
  ];

  const contentStrategy = [
    "One page per service, written from the client's own service list",
    "Answer the price question before the customer has to ask",
    "Show real work, not stock imagery, wherever photos exist",
    needsBooking ? "Booking available on every page" : "Quote form available on every page",
  ];

  const conversionStrategy = [
    `${primaryCta} above the fold and in the footer`,
    "Phone number tappable on mobile at all times",
    needsQuote ? "Short quote form: only fields that qualify the job" : "Booking in three taps",
    "Objection-handling section before the final CTA",
  ];

  const total = supplied.length + unknown.length;
  const confidence = total ? Math.round((supplied.length / total) * 100) : 0;

  return {
    name,
    industry,
    subIndustry: services[0] ?? null,
    services,
    city,
    region,
    country,
    serviceArea,
    phone: clean(facts.phone),
    email: clean(facts.email),
    positioning: area
      ? `${name} provides ${trade.toLowerCase()} for customers in ${area}.`
      : `${name} provides ${trade.toLowerCase()}.`,
    targetCustomer: area
      ? `People in ${area} who need ${trade.toLowerCase()} and want a straight answer fast.`
      : `People who need ${trade.toLowerCase()} and want a straight answer fast.`,
    customerProblems: problems,
    urgency,
    objections,
    differentiators,
    personality:
      urgency === "emergency"
        ? "Calm, immediate, no fluff"
        : urgency === "planned"
          ? "Considered, detailed, reassuring"
          : "Warm, practical, easy to deal with",
    visualPersonality:
      urgency === "emergency"
        ? "High contrast, phone-first, unmissable action"
        : urgency === "planned"
          ? "Spacious, photographic, craft-led"
          : "Clean, friendly, booking-led",
    desiredAction,
    primaryCta,
    secondaryCta,
    needsBooking,
    needsQuote,
    qualifyingFields: [
      "Name",
      "Phone",
      services.length ? "Which service" : "What you need",
      area ? "Where you are" : "Your postcode or area",
      urgency === "planned" ? "Rough size of the job" : "When you need it",
    ],
    pricingModel: hasPrices ? "starting_prices" : "quote_per_job",
    trustRequirements,
    geoStrategy,
    seoStrategy,
    contentStrategy,
    conversionStrategy,
    seasonality: null,
    supplied,
    unknown,
    needed: needed.slice(0, 6),
    prohibited: [...PROHIBITED_CLAIMS],
    confidence,
  };
}

/** Compact, prompt-safe rendering of the DNA for AI passes. */
export function dnaBrief(dna: BusinessDna): string {
  const lines = [
    `BUSINESS: ${dna.name}`,
    `TRADE: ${dna.industry ?? "unstated"}`,
    `SERVICES: ${dna.services.length ? dna.services.join(", ") : "unstated"}`,
    `AREA: ${dna.serviceArea ?? dna.city ?? "unstated"}`,
    `POSITIONING: ${dna.positioning}`,
    `BUYER: ${dna.targetCustomer}`,
    `URGENCY: ${dna.urgency}`,
    `GOAL: ${dna.desiredAction}`,
    `PRIMARY CTA: ${dna.primaryCta} / SECONDARY: ${dna.secondaryCta}`,
    `OBJECTIONS: ${dna.objections.join(" | ")}`,
    `TONE: ${dna.personality}`,
    `UNKNOWN — never guess: ${dna.unknown.length ? dna.unknown.join(", ") : "none"}`,
    `NEVER CLAIM: ${dna.prohibited.join(", ")}`,
  ];
  return lines.join("\n");
}
