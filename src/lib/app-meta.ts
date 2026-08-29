/**
 * Centralized head metadata for private, signed-in workspace routes.
 *
 * Rules enforced here:
 * - Every private route is `noindex, nofollow` for all crawlers (including
 *   Google-specific and AI crawler tokens) in every route state.
 * - Canonical + og:url always self-reference the route on the project domain,
 *   so a shared link never attributes this page's content to another URL.
 * - OpenGraph / Twitter values always fall back to safe brand defaults, so a
 *   missing title, description or image can never render a broken card.
 */

export const SITE_ORIGIN = "https://revoragrowthsystems.com";
export const BRAND_NAME = "Revora";

export const META_FALLBACK_TITLE = "Revora — The Business Growth Operating System";
export const META_FALLBACK_DESCRIPTION =
  "Revora gives businesses one system to get discovered, capture opportunities, convert leads, book customers and automate follow-up.";

export type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

export interface PrivateMetaInput {
  /** Route path, always beginning with a slash. */
  path: string;
  title?: string;
  description?: string;
  /** Absolute https URL only; relative or placeholder values are ignored. */
  image?: string;
}

export interface PrivateMetaResult {
  meta: MetaTag[];
  links: { rel: string; href: string }[];
  /** Flat map used by the in-app meta preview and by regression tests. */
  resolved: {
    title: string;
    description: string;
    canonical: string;
    ogTitle: string;
    ogDescription: string;
    ogUrl: string;
    ogType: string;
    ogSiteName: string;
    twitterCard: string;
    twitterTitle: string;
    twitterDescription: string;
    robots: string;
    image: string | null;
  };
}

export const PRIVATE_ROBOTS = "noindex, nofollow, noarchive, nosnippet, noimageindex";

function clean(value: string | undefined, fallback: string) {
  const trimmed = (value ?? "").replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function normalizePath(path: string) {
  if (!path.startsWith("/")) return `/${path}`;
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

function absoluteImage(image: string | undefined): string | null {
  if (!image) return null;
  return /^https:\/\/[^\s]+$/i.test(image) ? image : null;
}

export function buildPrivateMeta(input: PrivateMetaInput): PrivateMetaResult {
  const title = clean(input.title, META_FALLBACK_TITLE);
  const description = clean(input.description, META_FALLBACK_DESCRIPTION);
  const canonical = `${SITE_ORIGIN}${normalizePath(input.path)}`;
  const image = absoluteImage(input.image);

  const resolved = {
    title,
    description,
    canonical,
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonical,
    ogType: "website",
    ogSiteName: BRAND_NAME,
    twitterCard: image ? "summary_large_image" : "summary",
    twitterTitle: title,
    twitterDescription: description,
    robots: PRIVATE_ROBOTS,
    image,
  };

  const meta: MetaTag[] = [
    { title: resolved.title },
    { name: "description", content: resolved.description },
    { property: "og:title", content: resolved.ogTitle },
    { property: "og:description", content: resolved.ogDescription },
    { property: "og:type", content: resolved.ogType },
    { property: "og:site_name", content: resolved.ogSiteName },
    { property: "og:url", content: resolved.ogUrl },
    { name: "twitter:card", content: resolved.twitterCard },
    { name: "twitter:title", content: resolved.twitterTitle },
    { name: "twitter:description", content: resolved.twitterDescription },
    { name: "robots", content: resolved.robots },
    { name: "googlebot", content: resolved.robots },
    { name: "bingbot", content: resolved.robots },
    { name: "GPTBot", content: "noindex, nofollow" },
  ];

  if (resolved.image) {
    meta.push(
      { property: "og:image", content: resolved.image },
      { name: "twitter:image", content: resolved.image },
    );
  }

  return {
    meta,
    links: [{ rel: "canonical", href: resolved.canonical }],
    resolved,
  };
}

export const REVIEWS_META = buildPrivateMeta({
  path: "/app/reviews",
  title: "Reviews & Reputation — Revora",
  description:
    "Collect 5-star reviews automatically after every completed job, reply fast, and publish the best testimonials straight to your website.",
});
