/**
 * A single structured page of a published business website
 * (`/s/:slug/:page`) — service pages, area pages, pricing, booking, FAQ and
 * anything else the builder laid out. Each one carries its own metadata and its
 * own lead-capture blocks.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteSection, StickyCallBar } from "@/components/site/SiteSections";
import { SiteBackdrop } from "@/components/site/SiteBackdrop";
import { readComposition } from "@/lib/visual-composition";
import { readBackdrop } from "@/lib/site-effects";
import { getPublicSite, trackPublicEvent, type PublicSite } from "@/lib/public-site.functions";
import { readSeo } from "@/lib/site-seo";
import { readCopy } from "@/lib/site-engine";

export const Route = createFileRoute("/s/$slug/$page")({
  loader: async ({ params }) => {
    const site = await getPublicSite({ data: { slug: params.slug, pageSlug: params.page } });
    if (!site || !site.content) throw notFound();
    return site;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData?.content) {
      return { meta: [{ title: "Page not found" }, { name: "robots", content: "noindex" }] };
    }
    const page = loaderData.content.page;
    const name = loaderData.org.name;
    const title = (page.seo_title || `${page.title} — ${name}`).slice(0, 60);
    const description = (
      page.seo_description ||
      loaderData.profile?.tagline ||
      `${page.title} from ${name}. See what's included and get a price.`
    ).slice(0, 158);
    const url = page.seo_canonical || `https://revoragrowthsystems.com/s/${params.slug}/${params.page}`;
    const shareImage = page.og_image_url || loaderData.profile?.hero_image_url || null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: page.og_title || title },
        { property: "og:description", content: page.og_description || description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(shareImage && shareImage.startsWith("https://")
          ? [
              { property: "og:image", content: shareImage },
              { name: "twitter:image", content: shareImage },
            ]
          : []),
        ...(page.noindex ? [{ name: "robots", content: "noindex" }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: SitePageRoute,
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <p className="text-[14px] text-muted-foreground">This page couldn't load. Please refresh and try again.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="font-display text-[22px] font-semibold">Page not found</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">This page isn't published yet.</p>
      </div>
    </div>
  ),
});

function SitePageRoute() {
  return <SitePageView site={Route.useLoaderData()} />;
}

export function SitePageView({ site, preview = false }: { site: NonNullable<PublicSite>; preview?: boolean }) {
  const track = useServerFn(trackPublicEvent);
  const { org, profile, settings } = site;
  const seo = readSeo(settings?.seo);
  const copy = readCopy((settings?.generation as { copy?: unknown } | null)?.copy);
  const ctaLabel = copy?.primaryCta || seo.primary_cta_label || (site.quote ? "Get my price" : "Book now");
  const page = site.content!.page;

  useEffect(() => {
    if (preview) return;
    void track({
      data: {
        slug: org.slug,
        eventType: "page_view",
        path: window.location.pathname,
        source: document.referrer ? "referral" : "direct",
        device: window.innerWidth < 768 ? "mobile" : "desktop",
      },
    }).catch(() => undefined);
  }, [org.slug, track, preview]);

  return (
    <div className="min-h-screen bg-background">
      <SiteBackdrop
        backdrop={readBackdrop(site.settings?.generation ?? null)}
        composition={readComposition(site.settings?.generation ?? null)}
      />
      <div className="relative z-[1]">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <Link to="/s/$slug" params={{ slug: org.slug }} className="min-w-0">
            <p className="truncate font-display text-[16px] font-semibold">{org.name}</p>
            {profile?.city ? <p className="text-[11px] text-muted-foreground">{profile.city}</p> : null}
          </Link>
          <div className="flex items-center gap-2">
            {profile?.phone ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`tel:${profile.phone}`}
                  onClick={() =>
                    void track({ data: { slug: org.slug, eventType: "call_click" } }).catch(() => undefined)
                  }
                >
                  <Phone className="size-4" /> Call
                </a>
              </Button>
            ) : null}
            <Button asChild variant="signal" size="sm">
              <a href={site.quote ? "#quote" : "#book"}>{ctaLabel}</a>
            </Button>
          </div>
        </div>
        <SiteNav site={site} current={page.slug} />
      </header>

      {site.content!.sections.map((section) => (
        <SiteSection key={section.id} site={site} section={section} />
      ))}

      <footer className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-[12px] text-muted-foreground">
          © {new Date().getFullYear()} {org.name}
          {profile?.city ? ` · ${profile.city}` : ""}
        </p>
      </footer>

      <StickyCallBar site={site} label={ctaLabel} />
      </div>
    </div>
  );
}

/** Links to every published page, so visitors and search engines find them. */
export function SiteNav({ site, current }: { site: NonNullable<PublicSite>; current?: string }) {
  const pages = (site.nav ?? []).filter((p) => p.kind !== "thanks" && p.slug !== "home");
  if (!pages.length) return null;
  return (
    <nav aria-label="Site pages" className="border-t border-border">
      <ul className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-4 py-2.5 text-[12px]">
        <li>
          <Link to="/s/$slug" params={{ slug: site.org.slug }} className="whitespace-nowrap text-muted-foreground hover:text-foreground">
            Home
          </Link>
        </li>
        {pages.map((p) => (
          <li key={p.slug}>
            <Link
              to="/s/$slug/$page"
              params={{ slug: site.org.slug, page: p.slug }}
              className={`whitespace-nowrap hover:text-foreground ${
                current === p.slug ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
