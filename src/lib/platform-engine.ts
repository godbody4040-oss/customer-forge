/**
 * Revora Universal Cross-Platform Code Engine.
 *
 * Turns a tenant's structured website into a portable build specification plus a
 * platform-aware implementation strategy, so the same business strategy can be
 * rebuilt on another environment (Lovable, Bolt, Replit, v0, Base44, Framer,
 * Webflow, Wix, Squarespace, Hostinger-class AI builders) without re-entering
 * business information — and without pretending a platform supports something it
 * does not.
 */

import type { ContentPage } from "./website-content";

export type PlatformId =
  | "lovable"
  | "bolt"
  | "replit"
  | "v0"
  | "base44"
  | "framer"
  | "webflow"
  | "wix"
  | "squarespace"
  | "hostinger";

export type PlatformKind = "fullstack-code" | "frontend-code" | "visual-cms" | "ai-site-builder";

export type CapabilityKey =
  | "react"
  | "nextjs"
  | "vite"
  | "typescript"
  | "tailwind"
  | "customCss"
  | "customJs"
  | "components"
  | "serverCode"
  | "apiRoutes"
  | "database"
  | "auth"
  | "uploads"
  | "cms"
  | "forms"
  | "webhooks"
  | "payments"
  | "email"
  | "sms"
  | "analytics"
  | "seoControls"
  | "structuredData"
  | "integrations"
  | "codeExport"
  | "customDomain";

export const CAPABILITY_LABELS: { key: CapabilityKey; label: string; group: string }[] = [
  { key: "react", label: "React", group: "Stack" },
  { key: "nextjs", label: "Next.js", group: "Stack" },
  { key: "vite", label: "Vite", group: "Stack" },
  { key: "typescript", label: "TypeScript", group: "Stack" },
  { key: "tailwind", label: "Tailwind CSS", group: "Styling" },
  { key: "customCss", label: "Custom CSS", group: "Styling" },
  { key: "customJs", label: "Custom JavaScript", group: "Styling" },
  { key: "components", label: "Reusable components", group: "Styling" },
  { key: "serverCode", label: "Server-side code", group: "Backend" },
  { key: "apiRoutes", label: "API routes", group: "Backend" },
  { key: "database", label: "Database", group: "Backend" },
  { key: "auth", label: "Authentication", group: "Backend" },
  { key: "uploads", label: "File uploads", group: "Backend" },
  { key: "cms", label: "CMS / collections", group: "Content" },
  { key: "forms", label: "Forms", group: "Content" },
  { key: "webhooks", label: "Webhooks", group: "Integrations" },
  { key: "payments", label: "Payments", group: "Integrations" },
  { key: "email", label: "Email sending", group: "Integrations" },
  { key: "sms", label: "SMS sending", group: "Integrations" },
  { key: "analytics", label: "Analytics", group: "Integrations" },
  { key: "seoControls", label: "SEO controls", group: "Search" },
  { key: "structuredData", label: "Structured data (JSON-LD)", group: "Search" },
  { key: "integrations", label: "External integrations", group: "Integrations" },
  { key: "codeExport", label: "Code / GitHub export", group: "Delivery" },
  { key: "customDomain", label: "Custom domain", group: "Delivery" },
];

type Caps = Partial<Record<CapabilityKey, boolean>>;

export type PlatformProfile = {
  id: PlatformId;
  label: string;
  kind: PlatformKind;
  summary: string;
  caps: Caps;
  /** Implementation approach to prefer on this platform. */
  prefer: string[];
  /** Things that fight the platform and must be avoided. */
  avoid: string[];
};

const NONE: CapabilityKey[] = [];

const on = (keys: CapabilityKey[], off: CapabilityKey[] = NONE): Caps => {
  const caps: Caps = {};
  for (const key of CAPABILITY_LABELS) caps[key.key] = false;
  for (const key of keys) caps[key] = true;
  for (const key of off) caps[key] = false;
  return caps;
};

export const PLATFORMS: PlatformProfile[] = [
  {
    id: "lovable",
    label: "Lovable",
    kind: "fullstack-code",
    summary: "Full-stack React + TypeScript with a managed backend, auth, storage and server functions.",
    caps: on([
      "react", "vite", "typescript", "tailwind", "customCss", "customJs", "components",
      "serverCode", "apiRoutes", "database", "auth", "uploads", "cms", "forms", "webhooks",
      "payments", "email", "sms", "analytics", "seoControls", "structuredData", "integrations",
      "codeExport", "customDomain",
    ]),
    prefer: [
      "TypeScript React components with a single source of truth for business data",
      "Server functions for anything holding a secret; row-level security on every table",
      "Route-level metadata plus JSON-LD generated from real records",
    ],
    avoid: ["Second routers or page frameworks", "Client-side secrets", "Mock data behind real-looking buttons"],
  },
  {
    id: "bolt",
    label: "Bolt.new",
    kind: "fullstack-code",
    summary: "Browser-based Vite/React app stack; backend and integrations come from services you connect.",
    caps: on([
      "react", "vite", "typescript", "tailwind", "customCss", "customJs", "components",
      "serverCode", "apiRoutes", "database", "auth", "forms", "webhooks", "payments",
      "email", "analytics", "seoControls", "structuredData", "integrations", "codeExport", "customDomain",
    ]),
    prefer: [
      "Vite + React + TypeScript with modular utilities",
      "Environment variables for keys, never inline credentials",
      "Connected database/auth provider rather than local mock state",
    ],
    avoid: ["Heavy dependency trees", "Assuming a Node-only package works in an edge runtime"],
  },
  {
    id: "replit",
    label: "Replit",
    kind: "fullstack-code",
    summary: "Full runtime with server, database, secrets and deployment available.",
    caps: on([
      "react", "nextjs", "vite", "typescript", "tailwind", "customCss", "customJs", "components",
      "serverCode", "apiRoutes", "database", "auth", "uploads", "forms", "webhooks", "payments",
      "email", "sms", "analytics", "seoControls", "structuredData", "integrations", "codeExport", "customDomain",
    ]),
    prefer: [
      "One server process serving the site and its API routes",
      "Replit secrets for credentials; a real database for leads and bookings",
      "Deployment target configured before handing the site to the client",
    ],
    avoid: ["Storing leads only in memory", "Long-running work inside a request"],
  },
  {
    id: "v0",
    label: "v0",
    kind: "frontend-code",
    summary: "Clean Next.js/React frontend generation; backend services are attached separately.",
    caps: on([
      "react", "nextjs", "typescript", "tailwind", "customCss", "customJs", "components",
      "serverCode", "apiRoutes", "forms", "seoControls", "structuredData", "integrations",
      "codeExport", "customDomain", "analytics",
    ]),
    prefer: [
      "Next.js App Router with server components for content and route metadata",
      "Typed props and a shared business-data module consumed by every page",
      "Route handlers for form submission once a backend is connected",
    ],
    avoid: ["Pretending a database exists before one is connected", "Client components for static content"],
  },
  {
    id: "base44",
    label: "Base44",
    kind: "fullstack-code",
    summary: "App platform with native data entities, auth and workflow capabilities.",
    caps: on([
      "react", "typescript", "customCss", "components", "serverCode", "database", "auth",
      "uploads", "cms", "forms", "webhooks", "email", "analytics", "seoControls",
      "integrations", "customDomain",
    ]),
    prefer: [
      "Native entities for leads, bookings, services and reviews",
      "Platform auth and permissions rather than hand-rolled sessions",
      "Native automations for follow-up messaging",
    ],
    avoid: ["Duplicating the platform's data layer in custom code"],
  },
  {
    id: "framer",
    label: "Framer",
    kind: "visual-cms",
    summary: "Design-first visual builder with CMS collections, interactions and native forms.",
    caps: on([
      "react", "customCss", "customJs", "components", "cms", "forms", "analytics",
      "seoControls", "structuredData", "integrations", "customDomain",
    ]),
    prefer: [
      "CMS collections for services, service areas, reviews and FAQs",
      "Components/variants for the design system instead of duplicated layers",
      "Native forms with a connected inbox or webhook, plus tel: and maps links",
    ],
    avoid: ["Rebuilding the layout in embedded code", "Absolute positioning for whole pages"],
  },
  {
    id: "webflow",
    label: "Webflow",
    kind: "visual-cms",
    summary: "Semantic visual builder with CMS collections, strong SEO controls and native forms.",
    caps: on([
      "customCss", "customJs", "components", "cms", "forms", "webhooks", "payments",
      "analytics", "seoControls", "structuredData", "integrations", "customDomain",
    ]),
    prefer: [
      "Collections + collection pages for services and service areas",
      "Class-based design system driven by CSS variables in a global embed",
      "Native forms with notification email plus webhook to the CRM",
    ],
    avoid: ["Framework code inside embeds", "Divs styled as buttons"],
  },
  {
    id: "wix",
    label: "Wix",
    kind: "visual-cms",
    summary: "Business-suite builder: native CMS, bookings, forms, automations and SEO panel.",
    caps: on([
      "customCss", "customJs", "components", "cms", "forms", "webhooks", "payments",
      "email", "sms", "analytics", "seoControls", "structuredData", "integrations", "customDomain",
    ]),
    prefer: [
      "Wix Bookings for real appointments and Wix Forms for quote requests",
      "CMS collections for services/areas/reviews with dynamic pages",
      "Native automations for confirmations and follow-up",
    ],
    avoid: ["Custom booking widgets that bypass the native calendar"],
  },
  {
    id: "squarespace",
    label: "Squarespace",
    kind: "visual-cms",
    summary: "Section-based builder with commerce, scheduling, forms and code injection.",
    caps: on([
      "customCss", "customJs", "cms", "forms", "payments", "email", "analytics",
      "seoControls", "structuredData", "integrations", "customDomain",
    ]),
    prefer: [
      "Native sections and blog/collection items for services and reviews",
      "Native form blocks with storage plus email notification",
      "Design-panel tokens, with code injection only for JSON-LD and small fixes",
    ],
    avoid: ["Layout rebuilt in code injection", "Fixed-width blocks that overflow on mobile"],
  },
  {
    id: "hostinger",
    label: "Hostinger / other AI builders",
    kind: "ai-site-builder",
    summary: "Template-driven AI builder with HTML/CSS/JS-level customisation and native forms.",
    caps: on([
      "customCss", "customJs", "forms", "email", "analytics", "seoControls",
      "structuredData", "integrations", "customDomain",
    ]),
    prefer: [
      "Semantic HTML5 sections, CSS variables for tokens, small vanilla JS modules",
      "Native form handling with an email destination the owner controls",
      "Progressive enhancement so the page works without JavaScript",
    ],
    avoid: ["Forcing React into the editor", "Claiming database or CRM features that do not exist"],
  },
];

export const platformProfile = (id: PlatformId): PlatformProfile =>
  PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0]!;

export const supports = (profile: PlatformProfile, key: CapabilityKey) => profile.caps[key] === true;

/** Stack decision derived from the capability matrix, not from assumptions. */
export function stackStrategy(profile: PlatformProfile): string[] {
  const lines: string[] = [];
  if (supports(profile, "nextjs")) {
    lines.push("Next.js + TypeScript, server components for content, route metadata for SEO.");
  } else if (supports(profile, "react") && supports(profile, "vite")) {
    lines.push("Vite + React + TypeScript with client-side routing and modular utilities.");
  } else if (supports(profile, "react")) {
    lines.push("React components in the platform's own runtime; keep data outside the view layer.");
  } else if (supports(profile, "cms")) {
    lines.push("Native visual components + CMS collections; no framework code.");
  } else {
    lines.push("Semantic HTML5, modern CSS and small vanilla JS modules; progressive enhancement.");
  }
  lines.push(
    supports(profile, "tailwind")
      ? "Tailwind utilities on top of design tokens."
      : "CSS custom properties for tokens, plus the platform's own styling controls.",
  );
  lines.push(
    supports(profile, "database")
      ? "Real records for leads, bookings, services, reviews and media."
      : supports(profile, "cms")
        ? "CMS collections as the single source of truth for services, areas, reviews and FAQs."
        : "One content file/section as the single source of truth; never repeat business facts per page.",
  );
  lines.push(
    supports(profile, "serverCode")
      ? "Secrets and third-party calls only in server code / environment variables."
      : "No credentials in the site; use the platform's native integrations for anything private.",
  );
  return lines;
}

export type LimitationRow = {
  feature: string;
  limitation: string;
  best: string;
  toEnable: string;
};

/** Honest report: what this platform cannot do, and the strongest alternative. */
export function limitationReport(profile: PlatformProfile): LimitationRow[] {
  const rows: LimitationRow[] = [];
  const add = (
    key: CapabilityKey,
    feature: string,
    limitation: string,
    best: string,
    toEnable: string,
  ) => {
    if (!supports(profile, key)) rows.push({ feature, limitation, best, toEnable });
  };

  add(
    "database",
    "Lead & booking records",
    "No database in this environment.",
    "Validated form that submits to the platform's native form storage and emails the owner.",
    "Connect a database or CRM (or use the platform's business suite) to store and pipeline leads.",
  );
  add(
    "serverCode",
    "Private API calls",
    "No server-side execution, so no credential can be kept secret.",
    "Native integrations and no-code automations only; nothing that needs a private key.",
    "Move the site to an environment with server functions, or proxy through an external service.",
  );
  add(
    "auth",
    "Client login area",
    "No authentication primitives.",
    "Public site plus a link to the owner's existing tools; no fake login screen.",
    "Add the platform's membership add-on or host the portal where auth exists.",
  );
  add(
    "payments",
    "Online payment / deposit",
    "No configured payment processor.",
    "Booking or quote request that ends in a human confirmation step.",
    "Connect the processor the business actually uses, then wire checkout to confirmation.",
  );
  add(
    "sms",
    "SMS follow-up",
    "No SMS capability.",
    "Email follow-up plus tap-to-call and tap-to-text links on mobile.",
    "Connect an SMS provider through an environment that can hold its credentials.",
  );
  add(
    "structuredData",
    "JSON-LD structured data",
    "Head/script injection unavailable.",
    "Strict semantic HTML, accurate headings and full contact details in the markup.",
    "Enable code injection or move to a platform that allows head scripts.",
  );
  add(
    "customJs",
    "Interactive quote calculator",
    "No custom JavaScript.",
    "Multi-step native form that collects the same answers and returns a human quote.",
    "Enable custom code, or embed the calculator from a platform that supports it.",
  );
  add(
    "cms",
    "Reusable content collections",
    "No CMS collections.",
    "Single content module/section reused across pages so facts are entered once.",
    "Use a platform with collections, or keep the content module in code.",
  );
  return rows;
}

export const RESPONSIVE_BREAKPOINTS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];

export const QUALITY_TARGETS = [
  "Design", "UX", "Mobile", "Desktop", "Functionality", "SEO",
  "Performance", "Accessibility", "Conversion", "Security", "Content",
];

export type DesignTokens = {
  colors: Record<string, string>;
  typography: { name: string; size: string; weight: string }[];
  spacing: Record<string, string>;
  fontFamily: string;
};

export function designTokens(input: {
  primary?: string | null;
  secondary?: string | null;
  accent?: string | null;
  font?: string | null;
}): DesignTokens {
  return {
    fontFamily: input.font?.trim() || "Space Grotesk (display) / Inter (body)",
    colors: {
      primary: input.primary?.trim() || "#C9A227",
      secondary: input.secondary?.trim() || "#1A1D23",
      accent: input.accent?.trim() || "#E8C766",
      background: "#0B0C0F",
      surface: "#14161B",
      text: "#F5F5F4",
      muted: "#A1A1A6",
      border: "#2A2D34",
      success: "#3FB27F",
      warning: "#E0A33E",
      error: "#D9534F",
    },
    typography: [
      { name: "Display", size: "clamp(2.5rem, 6vw, 4rem)", weight: "600" },
      { name: "H1", size: "clamp(2rem, 4.5vw, 3rem)", weight: "600" },
      { name: "H2", size: "clamp(1.5rem, 3vw, 2rem)", weight: "600" },
      { name: "H3", size: "1.25rem", weight: "600" },
      { name: "Body", size: "1rem", weight: "400" },
      { name: "Small", size: "0.875rem", weight: "400" },
      { name: "Caption", size: "0.75rem", weight: "500" },
    ],
    spacing: {
      xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "40px", "2xl": "64px", "3xl": "96px",
    },
  };
}

export function tokensCss(tokens: DesignTokens): string {
  const colors = Object.entries(tokens.colors)
    .map(([k, v]) => `  --color-${k}: ${v};`)
    .join("\n");
  const spacing = Object.entries(tokens.spacing)
    .map(([k, v]) => `  --space-${k}: ${v};`)
    .join("\n");
  return `:root {\n${colors}\n${spacing}\n}`;
}

export type PortableSpecInput = {
  platform: PlatformId;
  business: {
    name: string | null;
    tagline?: string | null;
    description?: string | null;
    phone?: string | null;
    email?: string | null;
    city?: string | null;
    state?: string | null;
    address?: string | null;
    serviceArea?: string | null;
    website?: string | null;
    reviewLink?: string | null;
  };
  services: { name: string; description?: string | null; price?: number | null; bookable?: boolean }[];
  seo: { title?: string | null; description?: string | null; headline?: string | null };
  pages: ContentPage[];
  tokens: DesignTokens;
};

export type PortableSpec = {
  generatedAt: string;
  targetPlatform: PlatformId;
  strategy: string[];
  business: PortableSpecInput["business"];
  services: PortableSpecInput["services"];
  seo: PortableSpecInput["seo"];
  designTokens: DesignTokens;
  responsiveBreakpoints: number[];
  pages: {
    slug: string;
    title: string;
    kind: string;
    noindex: boolean;
    seo: { title: string | null; description: string | null; canonical: string | null };
    sections: {
      kind: string;
      variant: string;
      heading: string | null;
      subheading: string | null;
      body: string | null;
      items: { kind: string; label: string | null; body: string | null; link: string | null }[];
    }[];
  }[];
  limitations: LimitationRow[];
};

/** Framework-agnostic build spec: same strategy, any platform. */
export function portableSpec(input: PortableSpecInput): PortableSpec {
  const profile = platformProfile(input.platform);
  return {
    generatedAt: new Date().toISOString(),
    targetPlatform: input.platform,
    strategy: stackStrategy(profile),
    business: input.business,
    services: input.services,
    seo: input.seo,
    designTokens: input.tokens,
    responsiveBreakpoints: RESPONSIVE_BREAKPOINTS,
    pages: input.pages
      .filter((page) => page.is_visible)
      .map((page) => ({
        slug: page.slug,
        title: page.title,
        kind: page.kind,
        noindex: page.noindex,
        seo: {
          title: page.seo_title,
          description: page.seo_description,
          canonical: page.seo_canonical,
        },
        sections: page.sections
          .filter((section) => section.is_visible)
          .map((section) => ({
            kind: section.kind,
            variant: section.variant,
            heading: section.heading,
            subheading: section.subheading,
            body: section.body,
            items: section.components
              .filter((c) => c.is_visible)
              .map((c) => ({
                kind: c.kind,
                label: c.label,
                body: c.body,
                link: c.link_url,
              })),
          })),
      })),
    limitations: limitationReport(profile),
  };
}

/** Copy-ready build brief for pasting into another AI builder. */
export function specBrief(spec: PortableSpec): string {
  const profile = platformProfile(spec.targetPlatform);
  const b = spec.business;
  const line = (label: string, value?: string | null) => (value ? `- ${label}: ${value}` : null);
  const out: (string | null)[] = [
    `# Build brief — ${b.name ?? "Business"} (target platform: ${profile.label})`,
    "",
    `Environment: ${profile.summary}`,
    "",
    "## Implementation strategy",
    ...spec.strategy.map((s) => `- ${s}`),
    "",
    "## Do not",
    ...profile.avoid.map((s) => `- ${s}`),
    "",
    "## Business facts (never invent anything beyond these)",
    line("Name", b.name),
    line("Tagline", b.tagline),
    line("About", b.description),
    line("Phone", b.phone),
    line("Email", b.email),
    line("Address", b.address),
    line("City/State", [b.city, b.state].filter(Boolean).join(", ") || null),
    line("Service area", b.serviceArea),
    line("Website", b.website),
    line("Review link", b.reviewLink),
    "",
    "## Services",
    ...(spec.services.length
      ? spec.services.map(
          (s) =>
            `- ${s.name}${s.price ? ` — from $${s.price}` : ""}${s.bookable ? " (bookable)" : ""}${
              s.description ? `: ${s.description}` : ""
            }`,
        )
      : ["- (none entered yet — ask the owner before writing service copy)"]),
    "",
    "## Design tokens",
    ...Object.entries(spec.designTokens.colors).map(([k, v]) => `- ${k}: ${v}`),
    `- Type: ${spec.designTokens.fontFamily}`,
    `- Spacing scale: ${Object.entries(spec.designTokens.spacing)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ")}`,
    "",
    "## Pages and sections",
    ...spec.pages.flatMap((page) => [
      `### /${page.slug || ""} — ${page.title}${page.noindex ? " (noindex)" : ""}`,
      ...(page.seo.title ? [`SEO title: ${page.seo.title}`] : []),
      ...(page.seo.description ? [`Meta description: ${page.seo.description}`] : []),
      ...page.sections.map(
        (section) =>
          `- ${section.kind} (${section.variant})${section.heading ? `: ${section.heading}` : ""}${
            section.items.length ? ` — ${section.items.length} item(s)` : ""
          }`,
      ),
    ]),
    "",
    "## Non-negotiables",
    `- Responsive at ${spec.responsiveBreakpoints.join(", ")}px`,
    "- Every CTA performs a real action (call, text, quote form, booking form, social profile)",
    "- Forms: validation, required fields, error/loading/success states, accessible labels",
    "- SEO: unique titles/descriptions, canonical, Open Graph, JSON-LD from real data only",
    "- Accessibility: semantic HTML, keyboard focus, alt text, reduced-motion support",
    "- No fake functionality and no invented business claims",
  ];
  if (spec.limitations.length) {
    out.push("", "## Platform limitations and fallbacks");
    for (const row of spec.limitations) {
      out.push(`- ${row.feature}: ${row.limitation} → ${row.best} (to enable: ${row.toEnable})`);
    }
  }
  return out.filter((v): v is string => v !== null).join("\n");
}
