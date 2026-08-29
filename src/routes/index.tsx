import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
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
import { CustomerJourney, TRUST_INDUSTRIES, WithoutWith } from "@/components/marketing/Journey";
import { FounderNote } from "@/components/marketing/SalesCTA";
import { ROICalculator } from "@/components/marketing/ROICalculator";
import { FAQ, FAQ_ITEMS } from "@/components/marketing/FAQ";
import { Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { getPlans } from "@/lib/plans.functions";
import { INDUSTRIES } from "@/lib/domain";
import { currency } from "@/lib/format";

const plansQuery = queryOptions({ queryKey: ["plans"], queryFn: () => getPlans() });

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(plansQuery),
  head: () => ({
    meta: [
      { title: "Revora — Turn Website Visitors Into Paying Customers" },
      {
        name: "description",
        content:
          "Revora gives local businesses one system to capture leads, send quotes, book customers, automate follow-up, collect reviews and see what drives growth. 1-day free trial.",
      },
      { property: "og:title", content: "Revora — Turn website visitors into paying customers" },
      {
        property: "og:description",
        content:
          "Lead capture, CRM, quotes, online booking, automated follow-up, reviews and growth analytics in one dashboard for local service businesses.",
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


const ECOSYSTEM = [
  { icon: Globe, name: "Revora Sites", body: "Get discovered." },
  { icon: Users, name: "Revora CRM", body: "Never lose a lead." },
  { icon: Calculator, name: "Revora Quotes", body: "Turn interest into opportunities." },
  { icon: CalendarCheck, name: "Revora Bookings", body: "Make scheduling effortless." },
  { icon: Sparkles, name: "Revora AI", body: "Assist with the repetitive work." },
  { icon: Zap, name: "Revora Automations", body: "Follow up consistently." },
  { icon: Star, name: "Revora Reviews", body: "Build trust." },
  { icon: LineChart, name: "Revora Analytics", body: "Know what's working." },
] as const;

const PROBLEMS = [
  { title: "Missed leads", body: "Customers contact you while you're busy on a job." },
  {
    title: "Slow follow-up",
    body: "Interested customers move on when nobody responds quickly.",
  },
  { title: "Lost quotes", body: "Quotes get sent and then forgotten by both sides." },
  {
    title: "Booking friction",
    body: "Customers have to call or message you just to schedule a time.",
  },
  {
    title: "No visibility",
    body: "You don't know which traffic sources actually generate business.",
  },
];

const FEATURES = [
  {
    icon: Globe,
    title: "Conversion-first website",
    body: "Industry template, your services, your photos. Call, quote and book buttons on every screen.",
  },
  {
    icon: Calculator,
    title: "Instant quote calculator",
    body: "Visitors answer a few questions and get a real price range. You get a qualified lead with the answers attached.",
  },
  {
    icon: CalendarCheck,
    title: "Booking calendar",
    body: "Publish your availability, take appointments while you work, confirm or reschedule in two taps.",
  },
  {
    icon: Users,
    title: "Lead pipeline & CRM",
    body: "Every lead in one board from new to booked, with the follow-ups you owe surfaced first.",
  },
  {
    icon: Search,
    title: "Local SEO engine",
    body: "Service and city pages, structured data and a health score that tells you exactly what to fix next.",
  },
  {
    icon: LineChart,
    title: "Analytics that answer 'is it working'",
    body: "Traffic, leads, bookings and conversion rate by source. No dashboards you need a course to read.",
  },
  {
    icon: MessageSquare,
    title: "Reviews & follow-up",
    body: "Ask for reviews after completed jobs, and let automations nudge quiet leads for you.",
  },
];

const STEPS = [
  { n: "01", title: "Tell us your trade", body: "Pick your industry and what a win looks like: calls, quotes or bookings." },
  { n: "02", title: "Add services and photos", body: "Prices or 'starting at', your work, your area. Fifteen minutes, once." },
  { n: "03", title: "Publish your site", body: "You get a live address you can put on your truck, your card and your ads." },
  { n: "04", title: "Work the board", body: "Leads arrive with context. Quote, book, follow up, get the review." },
];

function Landing() {
  const { data: plans } = useSuspenseQuery(plansQuery);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="hero-aura border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-start lg:gap-10 lg:py-20">
            <div className="lg:pt-4">
              <Pill tone="signal">REVORA™ — The Business Growth Operating System</Pill>
              <h1 className="mt-5 font-display text-[clamp(2.1rem,5vw,3.5rem)] leading-[1.04] font-semibold tracking-tight">
                Turn more website visitors into{" "}
                <span className="gold-text">paying customers</span>.
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                Revora gives local businesses one system to capture leads, send quotes, book
                customers, automate follow-up, collect reviews and understand what is driving
                growth.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button asChild variant="signal" size="lg">
                  <Link to="/get-started">
                    {GROWTH_SYSTEM.ctaShort} <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>
              <p className="mt-4 text-[12px] text-muted-foreground">
                {usdExact(GROWTH_SYSTEM.setupPrice)} one-time setup • {usdExact(GROWTH_SYSTEM.monthlyPrice)}/month •
                Cancel anytime
              </p>

              <dl className="mt-10 grid grid-cols-1 gap-x-6 gap-y-5 border-t border-border pt-6 sm:max-w-lg sm:grid-cols-3">
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

        {/* Product ecosystem */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading
              eyebrow="The Revora platform"
              title="One platform. Every customer touchpoint."
            />
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ECOSYSTEM.map(({ icon: Icon, name, body }) => (
                <Panel key={name} className="card-lift group relative overflow-hidden p-5">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-px bg-primary/0 transition-colors group-hover:bg-primary/50"
                  />
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3.5 font-display text-[13px] font-bold tracking-[0.12em] uppercase">
                    {name}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
                </Panel>
              ))}
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <p className="eyebrow">The real problem</p>
            <h2 className="mt-2 max-w-3xl font-display text-[clamp(1.5rem,3vw,2.1rem)] leading-tight font-semibold">
              Your business shouldn't lose customers because the process is broken.
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
            <p className="mt-6 text-[14px] text-foreground">
              Revora connects the entire customer journey.
            </p>
          </div>
        </section>
        {/* Customer journey */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading
              eyebrow="From search to customer"
              title="Every step connected, nothing left to memory"
            />
            <CustomerJourney />
          </div>
        </section>

        {/* Without vs with */}
        <section className="border-b border-border">

          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading
              eyebrow="The difference"
              title="More leads. More bookings. Less chaos."
            />
            <WithoutWith />
          </div>
        </section>

        {/* See it for your business */}
        <section className="hero-aura border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center">
            <h2 className="font-display text-[clamp(1.5rem,3vw,2.2rem)] leading-tight font-semibold">
              See what your business could look like.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Enter a few details and see how Revora can turn your online presence into a
              customer-acquisition system.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild variant="signal" size="lg">
                <Link to="/demo">
                  See it for my business <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/s/$slug" params={{ slug: "elite-mobile-detailing" }}>
                  Walk the live demo
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading eyebrow="What you get" title="One engine, from first search to paid invoice" />
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

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading eyebrow="How it works" title="Live this week, not next quarter" />
            <ol className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <li key={s.n} className="panel card-lift flex flex-col p-5">
                  <span className="tnum font-display text-[13px] font-semibold text-primary">
                    {s.n}
                  </span>
                  <h3 className="mt-3 font-display text-[15px] font-semibold">{s.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        {/* Industries */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading
              eyebrow="Industries"
              title="Templates tuned to how your trade actually sells"
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
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] text-muted-foreground"
                >
                  {i.name}
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
              <span className="text-foreground">Also built for:</span>{" "}
              {TRUST_INDUSTRIES.join(" · ")}. Customer stories are published here only once they're
              real and verified with the business owner.
            </p>
          </div>
        </section>

        {/* Pricing — one offer only */}
        <section id="pricing" className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading eyebrow="Pricing" title={GROWTH_SYSTEM.headline} />
            <div className="panel card-lift mt-8 grid gap-0 overflow-hidden p-0 md:grid-cols-[1.1fr_1fr]">
              <div className="border-b border-border p-6 sm:p-7 md:border-r md:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-[18px] font-semibold">{GROWTH_SYSTEM.name}</h3>
                  <Pill tone="signal">Complete system</Pill>
                </div>
                <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-5">
                  <div>
                    <p className="tnum font-display text-[34px] leading-none font-semibold">
                      {usdExact(GROWTH_SYSTEM.setupPrice)}
                    </p>
                    <p className="mt-1.5 text-[13px] font-medium">Setup</p>
                    <p className="text-[12px] text-muted-foreground">{GROWTH_SYSTEM.setupLabel}</p>
                  </div>
                  <div>
                    <p className="tnum font-display text-[34px] leading-none font-semibold">
                      {usdExact(GROWTH_SYSTEM.monthlyPrice)}
                      <span className="text-[13px] font-normal text-muted-foreground">/month</span>
                    </p>
                    <p className="mt-1.5 text-[13px] font-medium">Ongoing</p>
                    <p className="max-w-xs text-[12px] text-muted-foreground">{GROWTH_SYSTEM.monthlyLabel}</p>
                  </div>
                </div>
                <Button asChild variant="signal" size="lg" className="mt-7 w-full">
                  <Link to="/get-started">{GROWTH_SYSTEM.ctaPrimary}</Link>
                </Button>
                <p className="mt-2.5 text-[12px] text-muted-foreground">{GROWTH_SYSTEM.ctaSecondary}</p>
              </div>
              <div className="bg-background/40 p-6 sm:p-7">
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
              </div>
            </div>
            <p className="mt-5 text-[12px] text-muted-foreground">
              {GROWTH_SYSTEM.explainer}{" "}
              <Link to="/pricing" className="text-primary hover:underline">
                Pricing details
              </Link>
              .
            </p>
          </div>
        </section>


        {/* ROI estimator */}
        <section id="roi" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading
              eyebrow="Opportunity estimator"
              title="See what a few more customers could mean for your business"
            />
            <div className="mt-8">
              <ROICalculator />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHeading eyebrow="FAQ" title="Straight answers before you start" />
            <FAQ />
          </div>
        </section>

        {/* Founder mission */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <FounderNote />
          </div>
        </section>

        {/* Final CTA */}
        <section className="hero-aura bg-card">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center">
            <h2 className="mx-auto max-w-2xl font-display text-[clamp(1.6rem,3.5vw,2.4rem)] leading-tight font-semibold">
              Turn your website into a growth system.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Stop losing leads between the first click and the final booking. Revora brings your
              website, leads, quotes, bookings, follow-up, reviews and analytics together in one
              place.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild variant="signal" size="lg">
                <Link to="/get-started">
                  {GROWTH_SYSTEM.ctaShort} <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
            <p className="mt-5 text-[12px] text-muted-foreground">
              {usdExact(GROWTH_SYSTEM.setupPrice)} setup, then {usdExact(GROWTH_SYSTEM.monthlyPrice)}/month. Cancel anytime.
            </p>

          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}
