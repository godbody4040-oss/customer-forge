import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteFooter, SiteHeader } from "@/components/marketing/Chrome";
import { Pill } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { getPlans } from "@/lib/plans.functions";
import { currency } from "@/lib/format";

const plansQuery = queryOptions({ queryKey: ["plans"], queryFn: () => getPlans() });

export const Route = createFileRoute("/pricing")({
  loader: ({ context }) => context.queryClient.ensureQueryData(plansQuery),
  head: () => ({
    meta: [
      { title: "Pricing — Revora" },
      {
        name: "description",
        content:
          "Simple monthly pricing for local service businesses: website, instant quotes, booking, CRM and analytics. 1-day free trial, no card required.",
      },
      { property: "og:title", content: "Pricing — Revora" },
      {
        property: "og:description",
        content: "Plans from Starter to Pro. Everything you need to turn local searches into booked jobs.",
      },
    ],
  }),
  component: Pricing,
});

const FAQ = [
  {
    q: "Do I need a card to start?",
    a: "No. The 1-day trial is free and gives you the full platform, including a live website address.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Start on your Revora address, then point your own domain at it whenever you're ready.",
  },
  {
    q: "What if I have more than one location?",
    a: "Pro supports multiple businesses under one login, each with its own site, calendar and pipeline.",
  },
  {
    q: "Can I cancel?",
    a: "Any time, from billing settings. You keep access until the end of the period you've paid for.",
  },
];

function Pricing() {
  const { data: plans } = useSuspenseQuery(plansQuery);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="hero-aura mx-auto max-w-6xl px-4 py-16">
        <p className="eyebrow">Pricing</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,4vw,2.8rem)] leading-tight font-semibold">
          One tool instead of five subscriptions
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Website, instant quoting, booking, CRM, reviews and analytics in one place. Pick the plan
          that matches how much you're growing.
        </p>

        <div className="mt-10 grid items-stretch gap-3 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`panel card-lift flex h-full flex-col p-6 ${plan.is_featured ? "border-primary/40" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">{plan.name}</h2>
                {plan.is_featured ? <Pill tone="signal">Most popular</Pill> : null}
              </div>
              <p className="tnum mt-5 font-display text-[34px] leading-none font-semibold">
                {currency(Number(plan.monthly_price))}
                <span className="text-[13px] font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                or {currency(Number(plan.annual_price))}/yr — two months free
              </p>
              <p className="mt-3 text-[13px] text-muted-foreground">{plan.tagline}</p>
              <ul className="mt-5 flex-1 space-y-2 border-t border-border pt-5">
                {((plan.features as string[] | null) ?? []).map((f) => (
                  <li key={f} className="flex gap-2 text-[13px] text-muted-foreground">
                    <span aria-hidden="true" className="text-primary">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={plan.is_featured ? "signal" : "outline"}
                className="mt-6 w-full"
              >
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start 1-day trial
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <section className="mt-16" id="faq">
          <h2 className="font-display text-[19px] font-semibold">Questions owners actually ask</h2>
          <dl className="mt-5 grid gap-3 md:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.q} className="panel card-lift p-5">
                <dt className="font-display text-[14px] font-semibold">{item.q}</dt>
                <dd className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-16">
          <SalesCTA />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
