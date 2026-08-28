import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, MapPin, Phone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/app/Bits";
import { BookingForm, QuoteCalculator } from "@/components/site/SiteForms";
import { getPublicSite, trackPublicEvent } from "@/lib/public-site.functions";
import { currency, dateShort } from "@/lib/format";
import { readSeo } from "@/lib/site-seo";

export const Route = createFileRoute("/s/$slug")({
  loader: async ({ params }) => {
    const site = await getPublicSite({ data: { slug: params.slug } });
    if (!site) throw notFound();
    return site;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Business not found" }, { name: "robots", content: "noindex" }],
      };
    }
    const name = loaderData.org.name;
    const city = loaderData.profile?.city;
    const title = `${name}${city ? ` — ${city}` : ""}`.slice(0, 60);
    const description = (
      readSeo(loaderData.settings?.seo).meta_description ??
      loaderData.profile?.tagline ??
      `Book ${name}${city ? ` in ${city}` : ""} online. See services, prices and reviews.`
    ).slice(0, 158);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: PublicSite,
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

function PublicSite() {
  const site = Route.useLoaderData();
  const track = useServerFn(trackPublicEvent);
  const { org, profile, settings, services, reviews, gallery, social } = site;
  const seo = readSeo(settings?.seo);

  useEffect(() => {
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
  }, [org.slug, track]);

  const rating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;
  const headline = seo.headline ?? `${org.name}${profile?.city ? ` in ${profile.city}` : ""}`;
  const sub =
    seo.subheadline ??
    profile?.tagline ??
    "Straight answers, honest pricing, and work booked in under two minutes.";
  const ctaLabel = seo.primary_cta_label ?? "Get my instant quote";

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
              <a href="#quote">{ctaLabel}</a>
            </Button>
          </div>
        </div>
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
                <a href="#quote">{ctaLabel}</a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#book">Book an appointment</a>
              </Button>
            </div>
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
            {site.quote ? (
              <QuoteCalculator site={site} />
            ) : (
              <BookingForm site={site} />
            )}
          </div>
        </div>
      </section>

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
                  {service.description ? (
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                  ) : null}
                  <p className="tnum mt-3.5 text-[15px] font-semibold text-primary">
                    {service.price !== null
                      ? `${service.starting_price ? "From " : ""}${currency(Number(service.price))}`
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

      {profile?.description ? (
        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl px-4 py-14">
            <p className="eyebrow">About</p>
            <h2 className="mt-1.5 font-display text-[28px] font-semibold">Why neighbors call us</h2>
            <p className="mt-5 text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">
              {profile.description}
            </p>
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
            {social?.google_url ? (
              <a href={social.google_url} className="hover:text-foreground">
                Google
              </a>
            ) : null}
            {social?.facebook_url ? (
              <a href={social.facebook_url} className="hover:text-foreground">
                Facebook
              </a>
            ) : null}
            {social?.instagram_url ? (
              <a href={social.instagram_url} className="hover:text-foreground">
                Instagram
              </a>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
