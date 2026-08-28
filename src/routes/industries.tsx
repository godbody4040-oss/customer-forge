import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/marketing/Chrome";
import { Button } from "@/components/ui/button";
import { INDUSTRIES, TEMPLATES } from "@/lib/domain";

export const Route = createFileRoute("/industries")({
  head: () => ({
    meta: [
      { title: "Industries we build for — Revora" },
      {
        name: "description",
        content:
          "Templates and quote calculators tuned for auto detailing, beauty, landscaping, cleaning, contracting, HVAC, roofing and more local trades.",
      },
      { property: "og:title", content: "Industries we build for — Revora" },
      {
        property: "og:description",
        content: "Every trade sells differently. Pick your industry and get a site tuned to it.",
      },
    ],
  }),
  component: Industries,
});

function Industries() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="eyebrow">Industries</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,4vw,2.8rem)] leading-tight font-semibold">
          Every trade sells differently
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          A detailer sells with before-and-after proof. A stylist sells with a portfolio and an open
          calendar. A roofer sells with trust and a fast quote. Your template starts where your trade
          actually converts.
        </p>

        <section className="mt-12">
          <h2 className="font-display text-[19px] font-semibold">Templates</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {TEMPLATES.filter((t) => t.id !== "default").map((t) => (
              <div key={t.id} className="panel p-5">
                <h3 className="font-display text-[15px] font-semibold">{t.name}</h3>
                <p className="mt-2 text-[13px] text-muted-foreground">{t.focus}</p>
                <p className="mt-3 text-[11px] tracking-wider uppercase text-primary">
                  Primary action: {t.primary === "book" ? "Book now" : "Get a quote"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-[19px] font-semibold">Trades we cover</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRIES.map((i) => (
              <li key={i.name} className="panel p-4">
                <p className="font-display text-[14px] font-semibold">{i.name}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  {i.emphasis}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className="panel mt-14 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-[17px] font-semibold">Don't see your trade?</h2>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              The universal template covers any local service business — you keep full control of
              services, pricing and quoting.
            </p>
          </div>
          <Button asChild variant="signal">
            <Link to="/auth" search={{ mode: "signup" }}>
              Start free
            </Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
