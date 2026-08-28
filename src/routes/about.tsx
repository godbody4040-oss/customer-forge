import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/marketing/Chrome";
import { FounderNote, SalesCTA } from "@/components/marketing/SalesCTA";
import { Panel } from "@/components/app/Bits";
import { REVORA } from "@/lib/brand";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Revora — Built to help businesses grow" },
      {
        name: "description",
        content:
          "Revora is a business growth platform that helps companies get discovered, capture opportunities, convert leads, manage customers and automate follow-up.",
      },
      { property: "og:title", content: "About Revora" },
      {
        property: "og:description",
        content: "Revora is a business growth platform founded by Adam.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <p className="eyebrow">About Revora</p>
            <h1 className="mt-2 font-display text-[clamp(2rem,4vw,2.8rem)] leading-tight font-semibold">
              Built to help businesses <span className="gold-text">grow</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Revora is a business growth platform designed to help companies get discovered,
              capture opportunities, convert leads, manage customers, automate follow-up, and
              understand what's driving their growth.
            </p>
          </div>
        </section>

        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <p className="eyebrow">Founder</p>
            <Panel className="mt-4 flex items-center gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-[15px] font-semibold text-primary">
                A
              </span>
              <div>
                <p className="font-display text-[15px] font-semibold">{REVORA.founder.name}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{REVORA.founder.role}</p>
              </div>
            </Panel>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <FounderNote />
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SalesCTA />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
