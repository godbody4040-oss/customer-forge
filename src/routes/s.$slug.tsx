import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, MapPin, Phone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/app/Bits";
import { BookingForm, QuoteCalculator } from "@/components/site/SiteForms";
import { getPublicSite, trackPublicEvent, type PublicSite } from "@/lib/public-site.functions";
import { currency, dateShort } from "@/lib/format";
import { readSeo } from "@/lib/site-seo";
import { readCopy } from "@/lib/site-engine";
import { SiteNav } from "@/routes/s.$slug.$page";
import { StickyCallBar } from "@/components/site/SiteSections";


export const Route = createFileRoute("/s/$slug")({
  loader: async ({ params }) => {
    const site = await getPublicSite({ data: { slug: params.slug } });
    if (!site) throw notFound();
    return site;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Business not found" }, { name: "robots", content: "noindex" }],
      };
    }
    const name = loaderData.org.name;
    const city = loaderData.profile?.city;
    const page = loaderData.content?.page ?? null;
    const generated = readCopy((loaderData.settings?.generation as { copy?: unknown } | null)?.copy);
    const title = (
      page?.seo_title ||
      generated?.metaTitle ||
      `${name}${city ? ` — ${city}` : ""}`
    ).slice(0, 60);
    const description = (
      page?.seo_description ||
      generated?.metaDescription ||
      readSeo(loaderData.settings?.seo).meta_description ||
      loaderData.profile?.tagline ||
      `Book ${name}${city ? ` in ${city}` : ""} online. See services, prices and reviews.`
    ).slice(0, 158);
    // Canonical and og:url point at this page itself unless the client set
    // their own canonical address (e.g. after moving to a custom domain).
    const url = page?.seo_canonical || `https://revoragrowthsystems.com/s/${params.slug}`;
    const shareImage = page?.og_image_url || loaderData.profile?.hero_image_url || null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: page?.og_title || title },
        { property: "og:description", content: page?.og_description || description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(shareImage && shareImage.startsWith("https://")
          ? [
              { property: "og:image", content: shareImage },
              { name: "twitter:image", content: shareImage },
            ]
          : []),
        ...(page?.noindex ? [{ name: "robots", content: "noindex" }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: PublicSiteRoute,
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <p className="text-[14px] text-muted-foreground">
        This business page couldn't load. Please refresh and try again.
      </p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="font-display text-[22px] font-semibold">Business not found</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          This web address isn't in use yet.
        </p>
      </div>
    </div>
  ),
});

function PublicSiteRoute() {
  return <PublicSiteView site={Route.useLoaderData()} />;
}

/**
 * The rendered business website. Shared by the live site and by time-limited
 * draft preview links, which pass `preview` so nothing is tracked as real traffic.
 */
export function PublicSiteView({
  site,
  preview = false,
}: {
  site: NonNullable<PublicSite>;
  preview?: boolean;
}) {
  const track = useServerFn(trackPublicEvent);
  const { org, profile, settings, services, reviews, gallery, social } = site;
  const seo = readSeo(settings?.seo);
  const generation = (settings?.generation ?? null) as { copy?: unknown } | null;
  const copy = readCopy(generation?.copy);

  useEffect(() => {
    if (preview) return;
    const params = new URLSearchParams(window.location.search);
    void track({
      data: {
        slug: org.slug,
        eventType: "page_view",
        path: window.location.pathname,
        source: params.get("utm_source") ?? (document.referrer ? "referral" : "direct"),
        campaign: params.get("utm_campaign"),
        device: window.innerWidth < 768 ? "mobile" : "desktop",
      },
    }).catch(() => undefined);
  }, [org.slug, track, preview]);

  const rating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;
  const headline = copy?.heroHeadline ?? seo.headline ?? `${org.name}${profile?.city ? ` in ${profile.city}` : ""}`;
  const sub =
    copy?.heroSubheadline ||
    seo.subheadline ||
    profile?.tagline ||
    "Straight answers, honest pricing, and work booked in under two minutes.";
  // Only point the primary CTA at the quote calculator when this tenant actually
  // has one configured; otherwise send visitors to the booking form instead of
  // rendering a second, duplicate booking form under #quote.
  const hasQuote = Boolean(site.quote);
  const quoteHref = hasQuote ? "#quote" : "#book";
  const ctaLabel =
    copy?.primaryCta || seo.primary_cta_label || (hasQuote ? "Get my instant quote" : "Book an appointment");
  const secondaryCta = copy?.secondaryCta || "Book an appointment";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: org.name,
    description: profile?.description ?? sub,
    telephone: profile?.phone ?? undefined,
    email: profile?.email ?? undefined,
    areaServed: profile?.service_area ?? profile?.city ?? undefined,
    address: profile?.city
      ? { "@type": "PostalAddress", addressLocality: profile.city }
      : undefined,
    aggregateRating:
      rating && reviews.length
        ? { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: reviews.length }
        : undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      {preview ? (
        <div className="bg-accent/12 px-4 py-2 text-center text-[12px] text-accent">
          Draft preview — this version is not live yet.
        </div>
      ) : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <div className="min-w-0">
            <p className="truncate font-display text-[16px] font-semibold">{org.name}</p>
            {profile?.city ? (
              <p className="text-[11px] text-muted-foreground">{profile.city}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {profile?.phone ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`tel:${profile.phone}`}
                  onClick={() =>
                    void track({ data: { slug: org.slug, eventType: "call_click" } }).catch(
                      () => undefined,
                    )
                  }
                >
                  <Phone className="size-4" /> Call
                </a>
              </Button>
            ) : null}
            <Button asChild variant="signal" size="sm">
              <a href={quoteHref}>{ctaLabel}</a>
            </Button>
          </div>
        </div>
        <SiteNav site={site} />
      </header>


      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {rating ? (
                <Pill tone="attention">
                  {rating.toFixed(1)} ★ · {reviews.length} reviews
                </Pill>
              ) : null}
              {profile?.service_area ? <Pill>Serving {profile.service_area}</Pill> : null}
            </div>
            <h1 className="mt-5 font-display text-[38px] leading-[1.05] font-semibold tracking-tight lg:text-[52px]">
              {headline}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{sub}</p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Button asChild variant="signal" size="lg">
                <a href={quoteHref}>{ctaLabel}</a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#book">{secondaryCta}</a>
              </Button>
            </div>
            {copy?.benefits.length ? (
              <ul className="mt-7 grid gap-2 sm:grid-cols-2">
                {copy.benefits.slice(0, 4).map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                    <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {benefit}
                  </li>
                ))}
              </ul>
            ) : null}
            <dl className="mt-9 grid gap-4 sm:grid-cols-3">
              {profile?.phone ? (
                <div>
                  <dt className="eyebrow flex items-center gap-1.5">
                    <Phone className="size-3.5" aria-hidden="true" /> Phone
                  </dt>
                  <dd className="mt-1 text-[13px]">{profile.phone}</dd>
                </div>
              ) : null}
              {profile?.email ? (
                <div>
                  <dt className="eyebrow flex items-center gap-1.5">
                    <Mail className="size-3.5" aria-hidden="true" /> Email
                  </dt>
                  <dd className="mt-1 truncate text-[13px]">{profile.email}</dd>
                </div>
              ) : null}
              {profile?.city ? (
                <div>
                  <dt className="eyebrow flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden="true" /> Area
                  </dt>
                  <dd className="mt-1 text-[13px]">{profile.service_area ?? profile.city}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div id="quote" className="scroll-mt-24">
            {site.quote ? <QuoteCalculator site={site} /> : null}
          </div>
        </div>
      </section>

      {copy?.intro ? (
        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl px-4 py-12 text-center">
            <p className="text-[16px] leading-relaxed text-muted-foreground">{copy.intro}</p>
          </div>
        </section>
      ) : null}

      {services.length ? (
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <p className="eyebrow">What we do</p>
            <h2 className="mt-1.5 font-display text-[28px] font-semibold">Services & pricing</h2>
            <ul className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <li key={service.id} className="panel flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-[15px] font-semibold">{service.name}</h3>
                    {service.featured ? <Pill tone="attention">Popular</Pill> : null}
                  </div>
                  {(() => {
                    const card = copy?.serviceCards.find((c) => c.name === service.name);
                    return card?.copy ? (
                      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">{card.copy}</p>
                    ) : null;
                  })()}
                  {service.description ? (
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                  ) : null}
                  <p className="tnum mt-3.5 text-[15px] font-semibold text-primary">
                    {service.price !== null
                      ? `${service.starting_price ? "From " : ""}${currency(Number(service.starting_price ?? service.price))}`
                      : "Price on request"}
                    {service.duration_minutes ? (
                      <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                        {service.duration_minutes} min
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {copy?.about || profile?.description ? (
        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl px-4 py-14">
            <p className="eyebrow">About</p>
            <h2 className="mt-1.5 font-display text-[28px] font-semibold">Why neighbors call us</h2>
            <p className="mt-5 text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">
              {copy?.about || profile?.description}
            </p>
            {copy?.areaCopy ? (
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">{copy.areaCopy}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {gallery.length ? (
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <p className="eyebrow">Recent work</p>
            <h2 className="mt-1.5 font-display text-[28px] font-semibold">Gallery</h2>
            <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {gallery.map((item) => (
                <li key={item.id} className="overflow-hidden rounded-md border border-border">
                  <img
                    src={item.url}
                    alt={item.alt_text ?? `${org.name} work sample`}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Extra sections added in the builder (FAQ, process, guarantees, custom blocks). */}
      {(site.content?.sections ?? [])
        .filter(
          (section) =>
            !["hero", "services", "about", "gallery", "reviews", "contact", "quote", "booking"].includes(
              section.kind,
            ) && (section.heading || section.body),
        )
        .map((section) => (
          <section key={section.id} className="border-b border-border">
            <div className="mx-auto max-w-3xl px-4 py-14">
              {section.heading ? (
                <h2 className="font-display text-[28px] font-semibold">{section.heading}</h2>
              ) : null}
              {section.subheading ? (
                <p className="mt-2 text-[15px] text-muted-foreground">{section.subheading}</p>
              ) : null}
              {section.body ? (
                <p className="mt-5 text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">
                  {section.body}
                </p>
              ) : null}
            </div>
          </section>
        ))}



      {reviews.length ? (
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <p className="eyebrow">Reviews</p>
            <h2 className="mt-1.5 font-display text-[28px] font-semibold">
              {rating ? `${rating.toFixed(1)} out of 5` : "What customers say"}
            </h2>
            <ul className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <li key={review.id} className="panel p-4">
                  <div className="flex items-center gap-0.5 text-accent" aria-label={`${review.rating} of 5`}>
                    {Array.from({ length: review.rating }).map((_, index) => (
                      <Star key={index} className="size-3.5 fill-current" aria-hidden="true" />
                    ))}
                  </div>
                  {review.comment ? (
                    <p className="mt-3 text-[13px] leading-relaxed">{review.comment}</p>
                  ) : null}
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    {review.author_name} · {dateShort(review.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {copy?.faqs.length ? (
        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl px-4 py-14">
            <p className="eyebrow">Questions</p>
            <h2 className="mt-1.5 font-display text-[28px] font-semibold">Frequently asked</h2>
            <dl className="mt-8 space-y-5">
              {copy.faqs.map((faq) => (
                <div key={faq.question}>
                  <dt className="text-[14px] font-medium">{faq.question}</dt>
                  <dd className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      <section id="book" className="scroll-mt-20 border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="eyebrow">Get on the schedule</p>
            <h2 className="mt-1.5 font-display text-[28px] font-semibold">
              Book {org.name} in two minutes
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Pick a service and a time that suits you. We'll confirm quickly — no phone tag, no
              waiting on a callback.
            </p>
            {profile?.phone ? (
              <p className="mt-6 text-[13px] text-muted-foreground">
                Prefer to talk?{" "}
                <a href={`tel:${profile.phone}`} className="text-primary underline">
                  {profile.phone}
                </a>
              </p>
            ) : null}
          </div>
          <BookingForm site={site} />
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {org.name}
            {profile?.city ? ` · ${profile.city}` : ""}
          </p>
          <div className="flex gap-4">
            {social?.google_business ? (
              <a href={social.google_business} className="hover:text-foreground">
                Google
              </a>
            ) : null}
            {social?.facebook ? (
              <a href={social.facebook} className="hover:text-foreground">
                Facebook
              </a>
            ) : null}
            {social?.instagram ? (
              <a href={social.instagram} className="hover:text-foreground">
                Instagram
              </a>
            ) : null}
          </div>
        </div>
      </footer>

      <StickyCallBar site={site} label={ctaLabel} />
    </div>

  );
}
