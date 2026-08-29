import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  Calculator,
  Globe,
  LineChart,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/marketing/Chrome";
import { DashboardPreview } from "@/components/marketing/DashboardPreview";
import { TRUST_INDUSTRIES, WithoutWith } from "@/components/marketing/Journey";
import { LiveSystemDemo } from "@/components/marketing/LiveSystemDemo";
import { TrustSection } from "@/components/marketing/TrustSection";
import { FounderNote } from "@/components/marketing/SalesCTA";
import { ROICalculator } from "@/components/marketing/ROICalculator";
import { AfterYouStart, ValueSplit } from "@/components/marketing/OfferSections";
import { FAQ, FAQ_ITEMS } from "@/components/marketing/FAQ";
import { Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { INDUSTRIES } from "@/lib/domain";
import { GROWTH_SYSTEM, usd } from "@/lib/offer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Revora — Turn More Visitors Into Paying Customers" },
      {
        name: "description",
        content:
          "Revora is a done-for-you growth system for local businesses: website, lead capture, CRM, quotes, booking, follow-up, reviews, local SEO, analytics and AI automation. $750 setup, 30 days free, then $100/month.",
      },
      { property: "og:title", content: "Revora — Turn more visitors into paying customers" },
      {
        property: "og:description",
        content:
          "One system for local businesses: website, lead capture, CRM, quotes, booking, follow-up, reviews, local SEO, analytics and AI automation. Built, launched and managed for you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      },
    ],
  }),
  component: Landing,
});

const STACK = [
  "Website",
  "Lead capture",
  "CRM",
  "Quotes",
  "Booking",
  "Follow-up",
  "Reviews",
  "Local SEO",
  "Analytics",
  "AI automation",
];

const PROBLEMS = [
  { title: "Missed leads", body: "Customers reach out while you're on a job." },
  { title: "Slow follow-up", body: "Interest fades when nobody replies fast." },
  { title: "Lost quotes", body: "Estimates get sent, then forgotten by both sides." },
  { title: "Booking friction", body: "Customers have to call just to pick a time." },
  { title: "No visibility", body: "You can't tell which traffic actually pays." },
];

const ECOSYSTEM = [
  { icon: Globe, name: "Revora Sites", body: "Get discovered." },
  { icon: Users, name: "Revora CRM", body: "Never lose a lead." },
  { icon: Calculator, name: "Revora Quotes", body: "Price jobs instantly." },
  { icon: CalendarCheck, name: "Revora Bookings", body: "Scheduling without calls." },
  { icon: Sparkles, name: "Revora AI", body: "Handle the repetitive work." },
  { icon: Zap, name: "Revora Automations", body: "Follow up every time." },
  { icon: Star, name: "Revora Reviews", body: "Build public trust." },
  { icon: LineChart, name: "Revora Analytics", body: "Know what's working." },
] as const;

const FEATURES = [
  {
    icon: Globe,
    title: "Conversion-first website",
    body: "Industry template, your services and photos. Call, quote and book on every screen.",
  },
  {
    icon: Calculator,
    title: "Instant quote calculator",
    body: "Visitors get a real price range. You get a qualified lead with their answers attached.",
  },
  {
    icon: CalendarCheck,
    title: "Booking calendar",
    body: "Publish availability, take appointments while you work, confirm in two taps.",
  },
  {
    icon: Users,
    title: "Lead pipeline & CRM",
    body: "Every lead in one board from new to booked, with owed follow-ups surfaced first.",
  },
  {
    icon: Search,
    title: "Local SEO engine",
    body: "Service and city pages, structured data and a health score that says what to fix next.",
  },
  {
    icon: LineChart,
    title: "Analytics that answer 'is it working'",
    body: "Traffic, leads, bookings and conversion rate by source. No course required.",
  },
  {
    icon: MessageSquare,
    title: "Reviews & automated follow-up",
    body: "Ask for reviews after completed jobs and let automations nudge quiet leads.",
  },
];

function PrimaryCta({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${className}`}>
      <Button asChild variant="signal" size="lg">
        <Link to="/get-started">
          {GROWTH_SYSTEM.ctaShort} <ArrowRight className="size-4" />
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg">
        <a href="#see-it">{GROWTH_SYSTEM.ctaDemo}</a>
      </Button>
    </div>
  );
}

function PriceLine({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[12.5px] text-muted-foreground ${className}`}>
      <span className="font-medium text-foreground">{usd(GROWTH_SYSTEM.setupPrice)} one-time setup</span> ·{" "}
      <span className="font-medium text-primary">{GROWTH_SYSTEM.trialDays} days free</span> · then{" "}
      <span className="font-medium text-foreground">{usd(GROWTH_SYSTEM.monthlyPrice)}/month</span> ·
      Cancel anytime
    </p>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* HOOK */}
        <section className="hero-aura border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-start lg:gap-10 lg:py-20">
            <div className="reveal lg:pt-4">
              <Pill tone="signal">REVORA™ — Growth system for local businesses</Pill>
              <h1 className="mt-5 font-display text-[clamp(2.1rem,5vw,3.5rem)] leading-[1.04] font-semibold tracking-tight">
                Turn More Visitors Into{" "}
                <span className="gold-text">Paying Customers</span>.
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                One done-for-you system that combines{" "}
                <span className="text-foreground">
                  website, lead capture, CRM, quotes, booking, follow-up, reviews, local SEO,
                  analytics and AI automation
                </span>
                . We build it, connect it, launch it and keep optimizing it.
              </p>

              <PrimaryCta className="mt-8" />
              <PriceLine className="mt-4" />

              <ul className="mt-8 flex flex-wrap gap-1.5" aria-label="What Revora includes">
                {STACK.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-border bg-card px-3 py-1 text-[12px] text-muted-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>

              <dl className="mt-9 grid grid-cols-1 gap-x-6 gap-y-5 border-t border-border pt-6 sm:max-w-lg sm:grid-cols-3">
                {[
                  ["1 system", "Instead of five subscriptions"],
                  ["Done for you", "Built, launched and managed"],
                  ["1 inbox", "Calls, quotes and bookings"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="tnum font-display text-[19px] leading-tight font-semibold">
                      {value}
                    </dt>
                    <dd className="mt-1 text-[12px] leading-snug text-muted-foreground">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <DashboardPreview />
          </div>
        </section>

        {/* PROBLEM */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <p className="eyebrow">The real problem</p>
            <h2 className="mt-2 max-w-3xl font-display text-[clamp(1.5rem,3vw,2.1rem)] leading-tight font-semibold">
              You shouldn't lose customers because the process is broken.
            </h2>
            <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PROBLEMS.map((p) => (
                <Panel key={p.title} className="card-lift p-5">
                  <h3 className="font-display text-[13px] font-bold tracking-[0.12em] uppercase">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{p.body}</p>
                </Panel>
              ))}
            </div>
          </div>
        </section>

        {/* REVORA SOLUTION */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading
              eyebrow="The Revora solution"
              title="One platform. Every customer touchpoint."
            />
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ECOSYSTEM.map(({ icon: Icon, name, body }) => (
                <Panel key={name} className="card-lift p-5">
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3.5 font-display text-[13px] font-bold tracking-[0.12em] uppercase">
                    {name}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
                </Panel>
              ))}
            </div>
            <div className="mt-10">
              <WithoutWith />
            </div>
          </div>
        </section>

        {/* LIVE DEMO — the wow moment */}
        <section id="see-it" className="hero-aura scroll-mt-20 border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <LiveSystemDemo />
          </div>
        </section>

        {/* WHAT YOU GET */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading
              eyebrow="What you get"
              title="One engine, from first search to repeat customer"
            />
            <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <Panel key={title} className="card-lift p-5">
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3.5 font-display text-[15px] font-semibold">{title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
                </Panel>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <TrustSection />
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading eyebrow="Pricing" title={GROWTH_SYSTEM.headline} />
            <div className="panel mt-8 grid gap-0 overflow-hidden p-0 md:grid-cols-[1.1fr_1fr]">
              <div className="min-w-0 border-b border-border p-6 sm:p-7 md:border-r md:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-[18px] font-semibold">{GROWTH_SYSTEM.name}</h3>
                  <Pill tone="signal">Complete system</Pill>
                </div>
                <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-5">
                  <div>
                    <p className="tnum font-display text-[34px] leading-none font-semibold">
                      {usd(GROWTH_SYSTEM.setupPrice)}
                    </p>
                    <p className="mt-1.5 text-[13px] font-medium">Setup — paid today</p>
                    <p className="text-[12px] text-muted-foreground">{GROWTH_SYSTEM.setupLabel}</p>
                  </div>
                  <div>
                    <p className="tnum font-display text-[34px] leading-none font-semibold">
                      {usd(GROWTH_SYSTEM.monthlyPrice)}
                      <span className="text-[13px] font-normal text-muted-foreground">/month</span>
                    </p>
                    <p className="mt-1.5 text-[13px] font-medium">
                      Starts after {GROWTH_SYSTEM.trialDays} free days
                    </p>
                    <p className="max-w-xs text-[12px] text-muted-foreground">
                      {GROWTH_SYSTEM.monthlyLabel}
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  variant="signal"
                  size="lg"
                  className="mt-7 h-auto w-full py-3 text-center leading-snug whitespace-normal"
                >
                  <Link to="/get-started">{GROWTH_SYSTEM.ctaShort}</Link>
                </Button>
                <p className="mt-2.5 text-[12px] text-muted-foreground">
                  {GROWTH_SYSTEM.explainer}
                </p>
              </div>
              <div className="min-w-0 bg-background/40 p-6 sm:p-7">
                <p className="eyebrow">Everything included</p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-1">
                  {GROWTH_SYSTEM.includes.map((feature) => (
                    <li key={feature} className="flex gap-2 text-[13px] text-muted-foreground">
                      <span aria-hidden="true" className="text-primary">
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/pricing"
                  className="mt-5 inline-block text-[13px] text-primary hover:underline"
                >
                  Full pricing details
                </Link>
              </div>
            </div>
            <div className="mt-10">
              <ValueSplit />
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="scroll-mt-20 border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 pt-4 pb-16">
            <AfterYouStart />
          </div>
        </section>

        {/* Opportunity estimator */}
        <section id="roi" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading
              eyebrow="Opportunity estimator"
              title="See what a few more customers could mean"
            />
            <div className="mt-8">
              <ROICalculator />
            </div>
          </div>
        </section>

        {/* Industries */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading
              eyebrow="Industries"
              title="Templates tuned to how your trade sells"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/industries">
                    All industries <ArrowRight className="size-4" />
                  </Link>
                </Button>
              }
            />
            <ul className="mt-8 flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => (
                <li
                  key={i.name}
                  className="rounded-full border border-border bg-background px-3.5 py-1.5 text-[13px] text-muted-foreground"
                >
                  {i.name}
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
              <span className="text-foreground">Also built for:</span>{" "}
              {TRUST_INDUSTRIES.join(" · ")}.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading eyebrow="FAQ" title="Straight answers before you start" />
            <FAQ />
          </div>
        </section>

        {/* Founder */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <FounderNote />
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="hero-aura">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center">
            <h2 className="mx-auto max-w-2xl font-display text-[clamp(1.6rem,3.5vw,2.4rem)] leading-tight font-semibold">
              Turn your website into a growth system.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Stop losing customers between the first click and the final booking. Revora brings your
              website, leads, quotes, bookings, follow-up, reviews and analytics together in one
              place.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <PrimaryCta className="justify-center" />
              <PriceLine />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
