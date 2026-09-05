/**
 * REVORA INDUSTRY INTELLIGENCE — what a good site looks like per trade.
 *
 * This is the knowledge that used to live inside a language model's head. It is
 * plain data: for each industry, the pages that earn work, the sections in the
 * order a buyer decides in, the action to push, the words that trade actually
 * uses, the trust elements that matter and a visual direction.
 *
 * It contains NO facts about any specific business. Nothing here claims a
 * review, an award, a licence, a price or a year — those only ever come from
 * the workspace's own data.
 *
 * Pure, deterministic, zero network calls, zero cost.
 */

/** The action a visitor should take on this kind of site. */
export type PrimaryAction = "call" | "quote" | "book" | "lead" | "visit" | "consult";

export type IndustryPlaybook = {
  /** Stable key. */
  slug: string;
  /** How the owner would say it. */
  label: string;
  /** Words that mean this industry in plain speech. */
  aliases: string[];
  /** Pages worth having, most important first. `home` is always implied. */
  pages: { kind: string; title: string; slug: string; why: string }[];
  /** Section kinds for the home page, in decision order. */
  homeSections: string[];
  /** Section kinds for a service/landing page. */
  servicePageSections: string[];
  /** What visitors should be pushed to do. */
  action: PrimaryAction;
  /** Button wording that suits the trade. */
  ctaLabels: { primary: string; secondary: string };
  /** How this trade names its work — used in headings, never as a claim. */
  terminology: string[];
  /** Reassurance themes worth a section — wording still comes from the owner. */
  trust: string[];
  /** Search phrasing pattern parts. */
  seo: { qualifier: string; intent: string };
  /** Visual direction: hex tokens applied through the existing theme system. */
  visual: { primary: string; secondary: string; accent: string; font: string; backdrop: string };
  /** Questions this trade's customers ask before committing. */
  faqSeeds: string[];
};

const URGENT_TRADE = {
  homeSections: [
    "hero",
    "trust_bar",
    "services",
    "process",
    "area",
    "reviews",
    "faq",
    "cta",
    "sticky_cta",
    "contact",
  ],
  servicePageSections: ["hero", "services", "benefits", "process", "faq", "cta", "contact"],
  servicePages: [
    { kind: "services", title: "Services", slug: "services", why: "One page per job wins search." },
    { kind: "about", title: "About", slug: "about", why: "Who is turning up at the door." },
    { kind: "contact", title: "Contact", slug: "contact", why: "Phone, hours and a form." },
  ],
};

const CONSIDERED = {
  homeSections: [
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
  ],
  servicePageSections: ["hero", "intro", "services", "benefits", "gallery", "faq", "cta"],
};

const playbook = (
  slug: string,
  label: string,
  aliases: string[],
  action: PrimaryAction,
  ctaLabels: { primary: string; secondary: string },
  terminology: string[],
  trust: string[],
  seo: { qualifier: string; intent: string },
  visual: IndustryPlaybook["visual"],
  faqSeeds: string[],
  shape: {
    homeSections: string[];
    servicePageSections: string[];
    pages?: IndustryPlaybook["pages"];
  },
): IndustryPlaybook => ({
  slug,
  label,
  aliases,
  action,
  ctaLabels,
  terminology,
  trust,
  seo,
  visual,
  faqSeeds,
  pages: shape.pages ?? URGENT_TRADE.servicePages,
  homeSections: shape.homeSections,
  servicePageSections: shape.servicePageSections,
});

/**
 * Twenty industries, each with a real point of view. Adding one is data only —
 * no code path changes.
 */
export const INDUSTRY_PLAYBOOKS: IndustryPlaybook[] = [
  playbook(
    "plumbing",
    "Plumbing",
    ["plumber", "plumbers", "plumbing", "drain", "drains", "leak", "boiler", "pipework"],
    "call",
    { primary: "Call now", secondary: "Get a price" },
    ["repairs", "emergency callouts", "installations", "drain clearing", "leak detection"],
    ["Licensed and insured", "Same-day availability", "Upfront pricing", "Local team"],
    { qualifier: "emergency", intent: "plumber near me" },
    {
      primary: "#0b6bcb",
      secondary: "#0f172a",
      accent: "#f59e0b",
      font: "sans",
      backdrop: "none",
    },
    [
      "How quickly can you get here?",
      "Do you charge a callout fee?",
      "Do you work evenings and weekends?",
    ],
    URGENT_TRADE,
  ),
  playbook(
    "hvac",
    "Heating & air conditioning",
    ["hvac", "heating", "cooling", "air con", "aircon", "air conditioning", "furnace", "ac repair"],
    "book",
    { primary: "Book a visit", secondary: "Call now" },
    ["repairs", "installations", "maintenance plans", "tune-ups", "system replacement"],
    ["Licensed technicians", "Manufacturer-trained", "Written quotes", "Maintenance plans"],
    { qualifier: "same-day", intent: "ac repair near me" },
    {
      primary: "#0891b2",
      secondary: "#0b1220",
      accent: "#f97316",
      font: "sans",
      backdrop: "none",
    },
    ["How long does a replacement take?", "Do you service my brand?", "Do you offer service plans?"],
    URGENT_TRADE,
  ),
  playbook(
    "roofing",
    "Roofing",
    ["roof", "roofer", "roofers", "roofing", "shingle", "gutter", "flat roof"],
    "quote",
    { primary: "Get my free quote", secondary: "Call now" },
    ["repairs", "replacements", "inspections", "storm damage", "gutter work"],
    ["Licensed and insured", "Free inspections", "Workmanship guarantee", "Storm response"],
    { qualifier: "storm damage", intent: "roof repair near me" },
    {
      primary: "#1d4ed8",
      secondary: "#111827",
      accent: "#eab308",
      font: "sans",
      backdrop: "none",
    },
    ["Will you handle my insurance claim?", "How long does a new roof take?", "Is the quote free?"],
    URGENT_TRADE,
  ),
  playbook(
    "electrical",
    "Electrical",
    ["electric", "electrical", "electrician", "electricians", "rewire", "panel", "wiring"],
    "call",
    { primary: "Call an electrician", secondary: "Get a price" },
    ["repairs", "rewiring", "panel upgrades", "safety inspections", "EV chargers"],
    ["Licensed and insured", "Certified work", "Safety checks", "Tidy finish"],
    { qualifier: "certified", intent: "electrician near me" },
    {
      primary: "#f59e0b",
      secondary: "#0f172a",
      accent: "#22d3ee",
      font: "sans",
      backdrop: "none",
    },
    ["Are you licensed?", "Can you certify the work?", "How soon can you come out?"],
    URGENT_TRADE,
  ),
  playbook(
    "landscaping",
    "Landscaping",
    ["landscape", "landscaping", "lawn", "garden", "gardening", "yard", "tree", "turf"],
    "quote",
    { primary: "Get my quote", secondary: "See our work" },
    ["design", "maintenance", "planting", "hardscaping", "seasonal clean-ups"],
    ["Insured crews", "Tidy site", "Seasonal plans", "Local references"],
    { qualifier: "local", intent: "landscaping near me" },
    {
      primary: "#15803d",
      secondary: "#052e16",
      accent: "#facc15",
      font: "serif",
      backdrop: "none",
    },
    ["Do you offer regular maintenance?", "Do you clear waste?", "How is a quote worked out?"],
    CONSIDERED,
  ),
  playbook(
    "cleaning",
    "Cleaning",
    ["clean", "cleaning", "cleaner", "cleaners", "janitorial", "housekeeping", "maid"],
    "book",
    { primary: "Book a clean", secondary: "Get a price" },
    ["regular cleans", "deep cleans", "move-out cleans", "commercial cleaning"],
    ["Vetted staff", "Insured", "Satisfaction promise", "Own supplies"],
    { qualifier: "trusted", intent: "cleaning service near me" },
    {
      primary: "#0ea5e9",
      secondary: "#0f172a",
      accent: "#a3e635",
      font: "sans",
      backdrop: "none",
    },
    ["Do I need to be home?", "Do you bring supplies?", "Can I book weekly?"],
    URGENT_TRADE,
  ),
  playbook(
    "construction",
    "Construction",
    ["construction", "builder", "builders", "building", "groundwork", "contractor"],
    "consult",
    { primary: "Request a consultation", secondary: "See projects" },
    ["new builds", "extensions", "groundworks", "project management"],
    ["Licensed and insured", "Fixed schedules", "Site safety", "Project references"],
    { qualifier: "licensed", intent: "construction company near me" },
    {
      primary: "#334155",
      secondary: "#0b1220",
      accent: "#f59e0b",
      font: "sans",
      backdrop: "none",
    },
    ["How do you price a project?", "Who manages the site?", "How long will it take?"],
    CONSIDERED,
  ),
  playbook(
    "remodeling",
    "Remodelling",
    ["remodel", "remodeling", "remodelling", "renovation", "kitchen", "bathroom", "refurbishment"],
    "consult",
    { primary: "Book a design call", secondary: "See our work" },
    ["kitchens", "bathrooms", "whole-home remodels", "design and build"],
    ["Insured", "Fixed quotes", "Own trades", "Portfolio"],
    { qualifier: "design-led", intent: "kitchen remodel near me" },
    {
      primary: "#7c3aed",
      secondary: "#160f2e",
      accent: "#f5d0a9",
      font: "serif",
      backdrop: "none",
    },
    ["How long will my kitchen be out of use?", "Do you handle design?", "Is the quote fixed?"],
    CONSIDERED,
  ),
  playbook(
    "painting",
    "Painting & decorating",
    ["paint", "painting", "painter", "painters", "decorating", "decorator"],
    "quote",
    { primary: "Get my quote", secondary: "See our work" },
    ["interior painting", "exterior painting", "commercial work", "wallpapering"],
    ["Insured", "Dust-free prep", "Tidy finish", "Colour advice"],
    { qualifier: "professional", intent: "painters near me" },
    {
      primary: "#2563eb",
      secondary: "#0f172a",
      accent: "#fb7185",
      font: "sans",
      backdrop: "none",
    },
    ["Do you move furniture?", "How many coats?", "How long will it take?"],
    CONSIDERED,
  ),
  playbook(
    "automotive",
    "Automotive",
    ["auto", "automotive", "mechanic", "garage", "car repair", "detailing", "tyre", "tire", "mot"],
    "book",
    { primary: "Book my car in", secondary: "Call the garage" },
    ["servicing", "diagnostics", "repairs", "detailing", "tyres"],
    ["Qualified technicians", "Parts warranty", "Courtesy updates", "Transparent pricing"],
    { qualifier: "trusted", intent: "car service near me" },
    {
      primary: "#dc2626",
      secondary: "#0b0f19",
      accent: "#f8fafc",
      font: "sans",
      backdrop: "none",
    },
    ["How long will it take?", "Do you use genuine parts?", "Can I wait while you work?"],
    URGENT_TRADE,
  ),
  playbook(
    "real_estate",
    "Real estate",
    ["real estate", "realtor", "estate agent", "property", "letting", "homes for sale"],
    "consult",
    { primary: "Request a valuation", secondary: "Browse listings" },
    ["sales", "lettings", "valuations", "property management"],
    ["Local market knowledge", "Clear fees", "Full marketing", "Regular updates"],
    { qualifier: "local", intent: "estate agent near me" },
    {
      primary: "#0f766e",
      secondary: "#04211f",
      accent: "#d4af37",
      font: "serif",
      backdrop: "none",
    },
    ["What are your fees?", "How do you market a property?", "How long do sales take?"],
    CONSIDERED,
  ),
  playbook(
    "legal",
    "Legal",
    ["law", "legal", "lawyer", "solicitor", "attorney", "law firm", "conveyancing"],
    "consult",
    { primary: "Request a consultation", secondary: "Call the office" },
    ["case types", "consultations", "representation", "advice"],
    ["Regulated practice", "Clear fees", "Confidential", "Direct contact"],
    { qualifier: "experienced", intent: "lawyer near me" },
    {
      primary: "#1e3a8a",
      secondary: "#0b1220",
      accent: "#d4af37",
      font: "serif",
      backdrop: "none",
    },
    ["How are fees charged?", "Is the first call free?", "Who will handle my case?"],
    CONSIDERED,
  ),
  playbook(
    "medical",
    "Medical",
    ["medical", "clinic", "doctor", "physio", "physiotherapy", "chiropractor", "health"],
    "book",
    { primary: "Book an appointment", secondary: "Call the clinic" },
    ["consultations", "treatments", "assessments", "follow-up care"],
    ["Registered clinicians", "Private rooms", "Short waits", "Clear pricing"],
    { qualifier: "registered", intent: "clinic near me" },
    {
      primary: "#0d9488",
      secondary: "#08201f",
      accent: "#60a5fa",
      font: "sans",
      backdrop: "none",
    },
    ["Do I need a referral?", "How long is an appointment?", "Do you take insurance?"],
    CONSIDERED,
  ),
  playbook(
    "dental",
    "Dental",
    ["dental", "dentist", "orthodontic", "implants", "hygienist", "teeth"],
    "book",
    { primary: "Book a check-up", secondary: "Call the practice" },
    ["check-ups", "hygiene", "cosmetic treatments", "implants", "emergency appointments"],
    ["Registered dentists", "Gentle care", "Clear pricing", "Payment plans"],
    { qualifier: "gentle", intent: "dentist near me" },
    {
      primary: "#0284c7",
      secondary: "#0b1b2b",
      accent: "#f472b6",
      font: "sans",
      backdrop: "none",
    },
    ["Are you taking new patients?", "What does a check-up cost?", "Do you offer payment plans?"],
    CONSIDERED,
  ),
  playbook(
    "restaurant",
    "Restaurant & food",
    ["restaurant", "cafe", "coffee", "bakery", "food", "catering", "bar", "takeaway", "pizzeria"],
    "visit",
    { primary: "Book a table", secondary: "See the menu" },
    ["menu", "opening hours", "bookings", "private events", "catering"],
    ["Fresh daily", "Local suppliers", "Dietary options", "Family friendly"],
    { qualifier: "best", intent: "restaurant near me" },
    {
      primary: "#b91c1c",
      secondary: "#1c0a0a",
      accent: "#f5d0a9",
      font: "serif",
      backdrop: "none",
    },
    ["Do you take bookings?", "Do you cater for allergies?", "Is there parking?"],
    {
      homeSections: ["hero", "intro", "services", "gallery", "reviews", "area", "cta", "contact"],
      servicePageSections: ["hero", "services", "gallery", "faq", "cta", "contact"],
      pages: [
        { kind: "custom", title: "Menu", slug: "menu", why: "The page everyone opens first." },
        { kind: "about", title: "About", slug: "about", why: "The story behind the room." },
        { kind: "contact", title: "Visit us", slug: "visit", why: "Address, hours and parking." },
      ],
    },
  ),
  playbook(
    "beauty",
    "Beauty & salon",
    ["beauty", "salon", "hair", "barber", "nails", "spa", "lashes", "aesthetics"],
    "book",
    { primary: "Book now", secondary: "See treatments" },
    ["treatments", "appointments", "packages", "gift vouchers"],
    ["Trained therapists", "Hygienic rooms", "Patch testing", "Aftercare"],
    { qualifier: "luxury", intent: "salon near me" },
    {
      primary: "#be185d",
      secondary: "#1b0713",
      accent: "#f5d0a9",
      font: "serif",
      backdrop: "none",
    },
    ["How do I book?", "How long is a treatment?", "Do you sell gift vouchers?"],
    CONSIDERED,
  ),
  playbook(
    "fitness",
    "Fitness",
    ["gym", "fitness", "personal trainer", "training", "yoga", "pilates", "crossfit", "coach"],
    "lead",
    { primary: "Start free trial", secondary: "See timetable" },
    ["memberships", "classes", "personal training", "programmes"],
    ["Qualified coaches", "Small groups", "Flexible membership", "Beginner friendly"],
    { qualifier: "beginner-friendly", intent: "gym near me" },
    {
      primary: "#ea580c",
      secondary: "#0b0f19",
      accent: "#22d3ee",
      font: "sans",
      backdrop: "none",
    },
    ["Is there a joining fee?", "Can I cancel any time?", "Do you have beginner classes?"],
    CONSIDERED,
  ),
  playbook(
    "professional_services",
    "Professional services",
    [
      "accountant",
      "accounting",
      "bookkeeping",
      "consultant",
      "consulting",
      "marketing",
      "agency",
      "it support",
      "insurance",
      "financial",
    ],
    "consult",
    { primary: "Book a call", secondary: "See services" },
    ["services", "packages", "onboarding", "reporting"],
    ["Qualified team", "Fixed monthly fees", "Clear reporting", "Direct contact"],
    { qualifier: "trusted", intent: "accountant near me" },
    {
      primary: "#1d4ed8",
      secondary: "#0b1220",
      accent: "#22c55e",
      font: "sans",
      backdrop: "none",
    },
    ["How are fees structured?", "How does onboarding work?", "Who is my main contact?"],
    CONSIDERED,
  ),
  playbook(
    "home_services",
    "Home services",
    [
      "home service",
      "home services",
      "handyman",
      "pest",
      "locksmith",
      "flooring",
      "windows",
      "fencing",
      "pressure washing",
      "gutter cleaning",
      "appliance repair",
      "moving",
      "removals",
    ],
    "quote",
    { primary: "Get my quote", secondary: "Call now" },
    ["repairs", "installations", "maintenance", "callouts"],
    ["Insured", "Fixed prices", "Tidy work", "Local team"],
    { qualifier: "local", intent: "home services near me" },
    {
      primary: "#2563eb",
      secondary: "#0f172a",
      accent: "#f59e0b",
      font: "sans",
      backdrop: "none",
    },
    ["How soon can you come?", "Is the quote free?", "Do you clean up after?"],
    URGENT_TRADE,
  ),
  playbook(
    "local_business",
    "Local business",
    ["local business", "shop", "store", "retail", "photography", "pet", "tutoring", "events"],
    "lead",
    { primary: "Get in touch", secondary: "See what we do" },
    ["what we do", "how it works", "getting started"],
    ["Local and independent", "Personal service", "Clear pricing", "Easy to reach"],
    { qualifier: "local", intent: "near me" },
    {
      primary: "#4f46e5",
      secondary: "#0f172a",
      accent: "#f59e0b",
      font: "sans",
      backdrop: "none",
    },
    ["Where are you based?", "What are your hours?", "How do I get started?"],
    CONSIDERED,
  ),
];

/** The fallback playbook: safe, conversion-shaped, industry-neutral. */
export const GENERIC_PLAYBOOK =
  INDUSTRY_PLAYBOOKS.find((entry) => entry.slug === "local_business")!;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]+/g, " ");

/**
 * Matches free text — an industry column, a request, or both — onto a playbook.
 * Longest alias wins so "air conditioning" beats "air". Unknown text returns the
 * generic playbook rather than nothing, so the builder never stalls.
 */
export function playbookFor(...hints: (string | null | undefined)[]): IndustryPlaybook {
  const haystack = normalize(hints.filter(Boolean).join(" "));
  if (!haystack.trim()) return GENERIC_PLAYBOOK;

  let best: { playbook: IndustryPlaybook; score: number } | null = null;
  for (const entry of INDUSTRY_PLAYBOOKS) {
    for (const alias of [entry.label, ...entry.aliases, entry.slug.replace(/_/g, " ")]) {
      const needle = normalize(alias).trim();
      if (!needle) continue;
      if (!haystack.includes(needle)) continue;
      const score = needle.length;
      if (!best || score > best.score) best = { playbook: entry, score };
    }
  }
  return best?.playbook ?? GENERIC_PLAYBOOK;
}

/** True when the text names an industry Revora has a playbook for. */
export function mentionsIndustry(text: string) {
  return playbookFor(text) !== GENERIC_PLAYBOOK || /\blocal business\b/i.test(text);
}
