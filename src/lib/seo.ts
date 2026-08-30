/**
 * Shared search + social metadata helpers.
 *
 * Every public page self-references its own canonical URL and og:url so
 * crawlers and social platforms attribute the page's own title, description
 * and preview to the right address.
 */

import { GROWTH_SYSTEM } from "@/lib/offer";
import { REVORA } from "@/lib/brand";

export const SITE_URL = "https://revoragrowthsystems.com";

export function absoluteUrl(path: string) {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** og:url meta entry for a page path. */
export function ogUrl(path: string) {
  return { property: "og:url", content: absoluteUrl(path) } as const;
}

/** canonical link entry for a page path. */
export function canonicalLink(path: string) {
  return { rel: "canonical", href: absoluteUrl(path) } as const;
}

/** Sitewide publisher identity, referenced by page-level schemas. */
export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Revora Growth Systems",
  url: SITE_URL,
  description:
    "Revora builds local service businesses a complete customer acquisition system: website, lead capture, CRM, quotes, booking, follow-up, reviews, local SEO and analytics.",
  founder: { "@type": "Person", name: REVORA.founder.name },
  areaServed: "Worldwide",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "sales",
      email: REVORA.email,
      telephone: REVORA.phone,
      availableLanguage: ["English"],
    },
  ],
};

/** Sitewide site entity, including the in-site search action. */
export const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Revora Growth Systems",
  inLanguage: "en",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

/** The single canonical offer, expressed for search engines. */
export const GROWTH_SYSTEM_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: GROWTH_SYSTEM.name,
  brand: { "@type": "Brand", name: "Revora Growth Systems" },
  description:
    "A complete done-for-you customer acquisition system: lead-generating website, lead capture, CRM, instant quotes, online booking, automated follow-up, review requests, local SEO and analytics.",
  url: absoluteUrl("/pricing"),
  offers: [
    {
      "@type": "Offer",
      name: "One-time setup",
      price: GROWTH_SYSTEM.setupPrice,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: absoluteUrl("/pricing"),
    },
    {
      "@type": "Offer",
      name: "Platform subscription",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: absoluteUrl("/pricing"),
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: GROWTH_SYSTEM.monthlyPrice,
        priceCurrency: "USD",
        unitText: "MONTH",
        billingIncrement: 1,
      },
    },
  ],
};

/** Breadcrumbs help search engines understand deep pages. */
export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
