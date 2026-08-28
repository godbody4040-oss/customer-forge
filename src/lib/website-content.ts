/**
 * Revora structured website content model.
 *
 * A client's website is stored as pages → sections → components, derived from
 * the business information they already entered. Nothing here invents facts:
 * every heading, service card and proof block is built from supplied data, and
 * blocks with no data are simply left out.
 */

export type PageKind = "home" | "services" | "about" | "contact" | "custom";

export type SectionKind =
  | "hero"
  | "intro"
  | "services"
  | "benefits"
  | "gallery"
  | "reviews"
  | "area"
  | "faq"
  | "cta"
  | "contact"
  | "custom";

export type ContentComponent = {
  id: string;
  section_id: string;
  kind: string;
  label: string | null;
  body: string | null;
  media_url: string | null;
  link_url: string | null;
  link_label: string | null;
  settings: unknown;
  sort_order: number;
  is_visible: boolean;
};

export type ContentSection = {
  id: string;
  page_id: string;
  kind: string;
  variant: string;
  heading: string | null;
  subheading: string | null;
  body: string | null;
  settings: unknown;
  sort_order: number;
  is_visible: boolean;
  components: ContentComponent[];
};

export type ContentPage = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  sort_order: number;
  is_visible: boolean;
  seo_title: string | null;
  seo_description: string | null;
  sections: ContentSection[];
};

/** Section types a business owner can add, in plain language. */
export const SECTION_LIBRARY: { kind: SectionKind; label: string; help: string }[] = [
  { kind: "hero", label: "Headline banner", help: "The first thing visitors read, with your main button." },
  { kind: "intro", label: "Short introduction", help: "Two sentences on what you do and who you help." },
  { kind: "services", label: "Services", help: "One card per service you offer, pulled from your service list." },
  { kind: "benefits", label: "Why choose us", help: "Short reasons to pick you — only ones you supplied." },
  { kind: "gallery", label: "Photos of your work", help: "Uses the photos in your media library." },
  { kind: "reviews", label: "Customer reviews", help: "Shows published reviews only." },
  { kind: "area", label: "Areas you serve", help: "Where you work, for local search." },
  { kind: "faq", label: "Questions & answers", help: "Answers common questions before people call." },
  { kind: "cta", label: "Call to action", help: "A prompt to call, book or request a quote." },
  { kind: "contact", label: "Contact & hours", help: "Phone, email and opening hours." },
  { kind: "custom", label: "Your own section", help: "A heading and text you write yourself." },
];

export const sectionLabel = (kind: string) =>
  SECTION_LIBRARY.find((s) => s.kind === kind)?.label ?? "Section";

/** Fields the AI assistant and the editor are allowed to change on a section. */
export const SECTION_TEXT_FIELDS = ["heading", "subheading", "body"] as const;
export type SectionTextField = (typeof SECTION_TEXT_FIELDS)[number];

/* ------------------------------- Blueprint -------------------------------- */

export type BlueprintInput = {
  businessName: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  serviceArea: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  hasHours: boolean;
  photoCount: number;
  reviewCount: number;
  ctaLabel: string;
  services: { name: string; description?: string | null; price?: number | null; starting_price?: number | null }[];
  benefits: string[];
  faqs: { question: string; answer: string }[];
};

export type BlueprintSection = {
  kind: SectionKind;
  variant?: string;
  heading?: string | null;
  subheading?: string | null;
  body?: string | null;
  components?: {
    kind: string;
    label?: string | null;
    body?: string | null;
    link_url?: string | null;
    link_label?: string | null;
  }[];
};

export type BlueprintPage = {
  slug: string;
  title: string;
  kind: PageKind;
  seo_title?: string | null;
  seo_description?: string | null;
  sections: BlueprintSection[];
};

const place = (input: BlueprintInput) =>
  input.serviceArea || [input.city, input.state].filter(Boolean).join(", ") || null;

/**
 * Turns supplied business information into a page/section/component structure.
 * Sections without supporting data are omitted rather than filled with
 * placeholder claims.
 */
export function buildContentBlueprint(input: BlueprintInput): BlueprintPage[] {
  const area = place(input);
  const name = input.businessName || "Your business";
  const trade = input.industry || "local services";

  const serviceComponents = input.services.slice(0, 12).map((s) => ({
    kind: "service_card",
    label: s.name,
    body: s.description ?? null,
  }));

  const home: BlueprintSection[] = [
    {
      kind: "hero",
      heading: area ? `${trade} in ${area}` : `${trade} from ${name}`,
      subheading: input.description
        ? input.description.split(/(?<=\.)\s/)[0] ?? null
        : null,
      components: [{ kind: "button", label: input.ctaLabel, link_url: "#quote" }],
    },
  ];

  if (input.description) home.push({ kind: "intro", heading: `About ${name}`, body: input.description });
  if (serviceComponents.length)
    home.push({ kind: "services", heading: "What we do", components: serviceComponents });
  if (input.benefits.length)
    home.push({
      kind: "benefits",
      heading: "Why customers choose us",
      components: input.benefits.slice(0, 6).map((b) => ({ kind: "benefit", label: b })),
    });
  if (input.photoCount > 0) home.push({ kind: "gallery", heading: "Recent work" });
  if (input.reviewCount > 0) home.push({ kind: "reviews", heading: "What customers say" });
  if (area) home.push({ kind: "area", heading: `Serving ${area}` });
  if (input.faqs.length)
    home.push({
      kind: "faq",
      heading: "Questions we get asked",
      components: input.faqs.slice(0, 8).map((f) => ({ kind: "faq_item", label: f.question, body: f.answer })),
    });
  home.push({
    kind: "cta",
    heading: "Ready to get started?",
    components: [{ kind: "button", label: input.ctaLabel, link_url: "#quote" }],
  });
  if (input.phone || input.email || input.hasHours)
    home.push({ kind: "contact", heading: "Get in touch" });

  const pages: BlueprintPage[] = [
    {
      slug: "home",
      title: "Home",
      kind: "home",
      seo_title: area ? `${name} — ${trade} in ${area}` : `${name} — ${trade}`,
      seo_description: input.description?.slice(0, 155) ?? null,
      sections: home,
    },
  ];

  if (serviceComponents.length)
    pages.push({
      slug: "services",
      title: "Services",
      kind: "services",
      seo_title: area ? `Services — ${name}, ${area}` : `Services — ${name}`,
      sections: [
        { kind: "hero", heading: "Our services", subheading: area ? `Available across ${area}` : null },
        { kind: "services", heading: "Choose what you need", components: serviceComponents },
        {
          kind: "cta",
          heading: "Get your price",
          components: [{ kind: "button", label: input.ctaLabel, link_url: "#quote" }],
        },
      ],
    });

  if (input.description)
    pages.push({
      slug: "about",
      title: "About",
      kind: "about",
      seo_title: `About ${name}`,
      sections: [
        { kind: "hero", heading: `About ${name}` },
        { kind: "intro", body: input.description },
        ...(input.reviewCount > 0 ? [{ kind: "reviews" as SectionKind, heading: "Customer reviews" }] : []),
      ],
    });

  pages.push({
    slug: "contact",
    title: "Contact",
    kind: "contact",
    seo_title: `Contact ${name}`,
    sections: [
      { kind: "hero", heading: "Contact us", subheading: area ? `Serving ${area}` : null },
      { kind: "contact", heading: "How to reach us" },
      {
        kind: "cta",
        heading: "Prefer a written price?",
        components: [{ kind: "button", label: input.ctaLabel, link_url: "#quote" }],
      },
    ],
  });

  return pages;
}

/* ---------------------------------- QA ------------------------------------ */

export type QaCheck = {
  key: string;
  label: string;
  ok: boolean;
  severity: "blocker" | "warning";
  fix: string;
};

export type QaInput = {
  businessName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  serviceArea: string | null;
  description: string | null;
  servicesCount: number;
  pagesCount: number;
  visibleSectionsCount: number;
  metaDescription: string | null;
  headline: string | null;
  hasCopy: boolean;
  photoCount: number;
  captureCount: number;
  reviewState: string | null;
};

/**
 * Pre-launch quality assurance. Blockers must pass before the site can be
 * published — publishing never reports success until these clear.
 */
export function websiteQa(input: QaInput): { checks: QaCheck[]; blockers: QaCheck[]; passed: boolean } {
  const checks: QaCheck[] = [
    {
      key: "name",
      label: "Business name set",
      ok: !!input.businessName,
      severity: "blocker",
      fix: "Add your business name in step 1.",
    },
    {
      key: "contact",
      label: "A way to contact you",
      ok: !!(input.phone || input.email),
      severity: "blocker",
      fix: "Add a phone number or email in the contact step.",
    },
    {
      key: "location",
      label: "Location or service area set",
      ok: !!(input.city || input.serviceArea),
      severity: "blocker",
      fix: "Add your city or the area you cover — local search needs it.",
    },
    {
      key: "services",
      label: "At least one service listed",
      ok: input.servicesCount > 0,
      severity: "blocker",
      fix: "Add your services in step 2.",
    },
    {
      key: "structure",
      label: "Website structure generated",
      ok: input.pagesCount > 0 && input.visibleSectionsCount > 0,
      severity: "blocker",
      fix: "Run the builder so Revora can lay out your pages.",
    },
    {
      key: "headline",
      label: "Headline written",
      ok: !!input.headline,
      severity: "blocker",
      fix: "Generate or write your headline banner.",
    },
    {
      key: "capture",
      label: "Lead capture connected",
      ok: input.captureCount > 0,
      severity: "blocker",
      fix: "Turn on a quote form or bookable service so enquiries reach your CRM.",
    },
    {
      key: "meta",
      label: "Search description written",
      ok: !!input.metaDescription,
      severity: "warning",
      fix: "Add a search description so Google shows the right summary.",
    },
    {
      key: "about",
      label: "About text written",
      ok: !!input.description,
      severity: "warning",
      fix: "Describe your business in your own words — it builds trust.",
    },
    {
      key: "photos",
      label: "Photos uploaded",
      ok: input.photoCount > 0,
      severity: "warning",
      fix: "Upload photos of real work in the media library.",
    },
    {
      key: "copy",
      label: "Written content generated",
      ok: input.hasCopy,
      severity: "warning",
      fix: "Run the site engine to write your page content.",
    },
    {
      key: "approved",
      label: "You approved the website",
      ok: input.reviewState === "approved",
      severity: "blocker",
      fix: "Review your site and approve it before going live.",
    },
  ];
  const blockers = checks.filter((c) => c.severity === "blocker" && !c.ok);
  return { checks, blockers, passed: blockers.length === 0 };
}

/* ------------------------------ Wizard steps ------------------------------ */

export type WizardStepKey =
  | "business"
  | "services"
  | "brand"
  | "contact"
  | "proof"
  | "goals"
  | "structure"
  | "launch";

export const WIZARD_STEPS: { key: WizardStepKey; title: string; help: string }[] = [
  { key: "business", title: "Your business", help: "Name, trade and what you do." },
  { key: "services", title: "Services", help: "What you sell and roughly what it costs." },
  { key: "brand", title: "Look & photos", help: "Colours, style and pictures of real work." },
  { key: "contact", title: "Contact & hours", help: "How customers reach you." },
  { key: "proof", title: "Proof", help: "Experience and credentials you actually have." },
  { key: "goals", title: "Your goal", help: "What the website should get you." },
  { key: "structure", title: "Pages & sections", help: "Revora lays out your website." },
  { key: "launch", title: "Review & launch", help: "Checks, approval and publishing." },
];
