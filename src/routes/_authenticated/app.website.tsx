import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LoadingRows } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import {
  useBusinessProfile,
  useSaveBusinessProfile,
  useSaveWebsiteSettings,
  useServices,
  useWebsiteSettings,
} from "@/lib/queries";
import { useWorkspace } from "@/lib/use-tenant";
import { canManage } from "@/lib/domain";
import { readSeo } from "@/lib/site-seo";
import { trackConversion } from "@/lib/conversion";

import { WebsiteReview } from "@/components/app/WebsiteReview";
import { BuilderWizard } from "@/components/app/BuilderWizard";
import { WebsiteStructure } from "@/components/app/WebsiteStructure";
import { LeadEngine } from "@/components/app/LeadEngine";
import { AssistantShowcase } from "@/components/app/AssistantShowcase";
import { EffectStudio } from "@/components/app/EffectStudio";
import { ImageStudio } from "@/components/app/ImageStudio";
import { readBackdrop, writeBackdrop } from "@/lib/site-effects";
import { SiteChatbot } from "@/components/app/SiteChatbot";
import { UpgradeStudio } from "@/components/app/UpgradeStudio";
import { RevoraGenius } from "@/components/app/RevoraGenius";

import { LaunchChecks } from "@/components/app/LaunchChecks";
import { PreviewLinks, PreviewSiteButton } from "@/components/app/PreviewLinks";
import { VersionDiff } from "@/components/app/VersionDiff";
import { PlatformEngine } from "@/components/app/PlatformEngine";
import {
  AiCopyAssistant,
  RevoraScorePanel,
  SiteEnginePanel,
  VersionHistory,
} from "@/components/app/SiteEngine";
import { BuildReportPanel, BusinessBriefPanel } from "@/components/app/BuildBrief";
import { BriefReviewPanel, EngineSelfTestPanel, MissingFactsPanel } from "@/components/app/BriefReview";
import { readBrief, readReport } from "@/lib/site-brief";
import { EDITABLE_COPY_FIELDS, growthRecommendations, readCopy, revoraScore } from "@/lib/site-engine";
import { useBuildReadiness, useScoreFacts } from "@/lib/site-engine.hooks";
import { useWebsiteContent } from "@/lib/website-content.hooks";
import { websiteQa, type WizardStepKey } from "@/lib/website-content";

export const Route = createFileRoute("/_authenticated/app/website")({
  head: () => ({
    meta: [
      { title: "Website builder — Revora" },
      { name: "description", content: "Build, review and publish your business website step by step." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsitePage,
});

function WebsitePage() {
  const { data: ws } = useWorkspace();
  const org = ws?.workspace?.organization;
  const orgId = ws?.workspace?.organizationId;
  const profileQuery = useBusinessProfile(orgId);
  const settingsQuery = useWebsiteSettings(orgId);
  const { data: services } = useServices(orgId);
  const saveSettings = useSaveWebsiteSettings(orgId);
  const saveProfile = useSaveBusinessProfile(orgId);
  const { data: pages } = useWebsiteContent(orgId);

  const profile = profileQuery.data as Record<string, unknown> | null | undefined;
  const settings = settingsQuery.data;
  const seo = readSeo(settings?.seo);
  const { data: readiness } = useBuildReadiness(orgId);
  const facts = useScoreFacts(orgId);
  const generation = (settings?.generation ?? null) as Record<string, unknown> | null;
  const copy = readCopy(generation?.["copy"]);
  const brief = readBrief(generation?.["brief"]);
  const buildReport = readReport(generation?.["report"]);
  const manage = canManage(ws?.workspace?.role ?? "viewer");
  const [jump, setJump] = useState<{ step: WizardStepKey; anchor?: string; nonce: number } | null>(null);
  const requiredCount = (readiness?.requiredGaps ?? []).length;

  const servicesCount = facts.data?.servicesCount ?? (services ?? []).length;
  const pricedCount = facts.data?.pricedServicesCount ?? 0;
  const captureCount = (facts.data?.quoteFormCount ?? 0) + (facts.data?.bookableCount ?? 0);
  const visibleSections = (pages ?? []).reduce(
    (sum, page) => sum + page.sections.filter((section) => section.is_visible).length,
    0,
  );

  const siteScore = revoraScore({
    profile: profileQuery.data,
    seo,
    servicesCount,
    pricedServicesCount: pricedCount,
    mediaCount: facts.data?.mediaCount ?? 0,
    reviewCount: facts.data?.reviewCount ?? 0,
    socialLinks: facts.data?.socialLinks ?? 0,
    quoteFormCount: facts.data?.quoteFormCount ?? 0,
    bookableCount: facts.data?.bookableCount ?? 0,
    hasCopy: !!copy,
  });
  const recommendations = growthRecommendations(
    siteScore,
    facts.data?.signals ?? { visitors: 0, leads: 0, bookings: 0, callClicks: 0, formViews: 0 },
  );

  const qa = websiteQa({
    businessName: org?.name ?? null,
    phone: (profile?.["phone"] as string) ?? null,
    email: (profile?.["email"] as string) ?? null,
    city: (profile?.["city"] as string) ?? null,
    serviceArea: (profile?.["service_area"] as string) ?? null,
    description: (profile?.["description"] as string) ?? null,
    servicesCount,
    pagesCount: (pages ?? []).length,
    visibleSectionsCount: visibleSections,
    metaDescription: seo.meta_description ?? null,
    headline: seo.headline ?? copy?.heroHeadline ?? null,
    hasCopy: !!copy,
    photoCount: facts.data?.mediaCount ?? 0,
    captureCount,
    reviewState: settings?.review_state ?? null,
  });

  const copyFields = copy
    ? Object.fromEntries(
        EDITABLE_COPY_FIELDS.map((f) => [f.key, String((copy as Record<string, unknown>)[f.key] ?? "")]),
      )
    : {};

  if (profileQuery.isLoading || settingsQuery.isLoading) return <LoadingRows rows={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Website builder</p>
          <h1 className="mt-1 font-display text-[24px] font-semibold">Build your website</h1>
          <p className="mt-1.5 max-w-2xl text-[13px] text-muted-foreground">
            This page turns your business facts into a <span className="text-primary">lead generator</span> — pages
            that ask for the enquiry on every screen, not a brochure. Work top to bottom: ask the assistant, answer
            anything Revora is missing, build the pages, then run the launch checks.
          </p>
        </div>
        {org ? (
          <PreviewSiteButton
            organizationId={orgId}
            slug={org.slug}
            publishState={settingsQuery.data?.publish_state ?? null}
          />
        ) : null}
      </div>

      <AssistantShowcase />

      <section className="panel p-4">
        <p className="eyebrow">Jump to what you need</p>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
          {[
            {
              label: "Website assistant",
              why: "Ask for any change in plain words. Revora shows the plan first.",
              go: () => setJump({ step: "business", anchor: "website-assistant", nonce: Date.now() }),
              key: true,
            },
            {
              label: requiredCount ? `Required answers (${requiredCount})` : "Your answers",
              why: requiredCount
                ? "These blanks are the only thing stopping your build."
                : "Everything Revora needs is answered.",
              go: () => setJump({ step: "structure", anchor: "required-answers", nonce: Date.now() }),
              key: requiredCount > 0,
            },
            {
              label: "Launch checks",
              why: "What must be true before your site can bring in work.",
              go: () => setJump({ step: "launch", nonce: Date.now() }),
              key: false,
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.go}
              className="cursor-pointer rounded-md border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-elevated focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span
                className={`text-[13px] font-medium ${item.key ? "text-primary" : "text-foreground"}`}
              >
                {item.label}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{item.why}</span>
            </button>
          ))}
        </div>
      </section>

      <SiteChatbot
        organizationId={orgId}
        canManage={manage}
        hasSections={visibleSections > 0}
        publishState={settings?.publish_state ?? "draft"}
        isPublishing={saveSettings.isPending}
        onPublishNow={() => {
          trackConversion("site_published", { metadata: { organization_id: orgId ?? "" } });
          saveSettings.mutate({
            publish_state: "published",
            published: true,
            last_published_at: new Date().toISOString(),
          });
        }}

      />

      <RevoraGenius
        organizationId={orgId}
        canManage={manage}
        pages={pages ?? []}
        facts={{
          businessName: org?.name ?? null,
          industry: org?.industry ?? null,
          city: (profile?.["city"] as string) ?? null,
          state: (profile?.["state"] as string) ?? null,
          serviceArea: (profile?.["service_area"] as string) ?? null,
          phone: (profile?.["phone"] as string) ?? null,
          email: (profile?.["email"] as string) ?? null,
          guarantee: (profile?.["guarantee"] as string) ?? null,
          services: (services ?? []).map((s) => ({ name: s.name, price: s.starting_price ?? null })),
          reviewCount: facts.data?.reviewCount ?? 0,
          mediaCount: facts.data?.mediaCount ?? 0,
          headline: seo.headline ?? copy?.heroHeadline ?? null,
          metaDescription: seo.meta_description ?? null,
          backdrop: readBackdrop(generation ?? null),
        }}
      />

      <UpgradeStudio
        organizationId={orgId}
        canManage={manage}
        pages={pages ?? []}
        facts={{
          businessName: org?.name ?? null,
          city: (profile?.["city"] as string) ?? null,
          state: (profile?.["state"] as string) ?? null,
          serviceArea: (profile?.["service_area"] as string) ?? null,
          phone: (profile?.["phone"] as string) ?? null,
          email: (profile?.["email"] as string) ?? null,
          guarantee: (profile?.["guarantee"] as string) ?? null,
          services: (services ?? []).map((s) => ({ name: s.name, price: s.starting_price ?? null })),
          reviewCount: facts.data?.reviewCount ?? 0,
          mediaCount: facts.data?.mediaCount ?? 0,
          headline: seo.headline ?? copy?.heroHeadline ?? null,
          metaDescription: seo.meta_description ?? null,
          backdrop: readBackdrop(generation ?? null),
          industry: (org?.industry as string | undefined) ?? null,
          primaryColor: (profile?.["primary_color"] as string) ?? null,

        }}
      />


      {requiredCount > 0 && manage ? (
        <section className="panel border-accent/40 bg-accent/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium">
                {requiredCount} answer{requiredCount === 1 ? "" : "s"} needed before Revora can build
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Answer them once — they're reused across your pages, buttons, forms, CRM and search settings.
              </p>
            </div>
            <Button
              variant="signal"
              size="sm"
              onClick={() => setJump({ step: "structure", anchor: "required-answers", nonce: Date.now() })}
            >
              Answer them now
            </Button>
          </div>
        </section>
      ) : null}

      <BuilderWizard
        organizationId={orgId}
        org={org}
        profile={profile}
        servicesCount={servicesCount}
        pricedCount={pricedCount}
        canManage={manage}
        jumpTo={jump}
        structureSlot={
          <div className="space-y-6">
            <SiteEnginePanel organizationId={orgId} canManage={manage} hasCopy={!!copy} />
            <EffectStudio
              organizationId={orgId}
              canManage={manage}
              backdrop={readBackdrop(generation ?? null)}
              onBackdrop={(backdrop) =>
                saveSettings.mutate({ generation: writeBackdrop(generation ?? null, backdrop) })
              }
            />
            <ImageStudio
              organizationId={orgId}
              canManage={manage}
              businessName={org?.name ?? null}
              industry={(profile?.["industry"] as string) ?? null}
              city={(profile?.["city"] as string) ?? null}
              primaryColor={(profile?.["primary_color"] as string) ?? null}
              accentColor={(profile?.["accent_color"] as string) ?? null}
              services={(services ?? []).map((service) => ({ name: String(service.name ?? "") }))}
              mediaCount={facts.data?.mediaCount ?? 0}
              hasHeroImage={!!(profile?.["hero_image_url"] as string)}
              onSetHero={(path) => saveProfile.mutate({ hero_image_url: path })}
            />
            <MissingFactsPanel organizationId={orgId} gaps={readiness?.gaps ?? []} canManage={manage} />
            <BriefReviewPanel organizationId={orgId} brief={brief} canManage={manage} />
            <BusinessBriefPanel brief={brief} />
            <LeadEngine organizationId={orgId} canManage={manage} />
            <WebsiteStructure organizationId={orgId} canManage={manage} />
            <AiCopyAssistant
              organizationId={orgId}
              fields={copyFields}
              canManage={manage}
              onApply={(patch) =>
                saveSettings.mutate({
                  generation: { ...(generation ?? {}), copy: { ...(copy ?? {}), ...patch } },
                })
              }
            />
          </div>
        }

        launchSlot={
          <div className="space-y-6">
            <RevoraScorePanel
              score={siteScore.score}
              factors={siteScore.factors}
              recommendations={recommendations}
            />
            <BuildReportPanel report={buildReport} />
            <EngineSelfTestPanel organizationId={orgId} />
            <WebsiteReview
              organizationId={orgId}
              slug={org?.slug}
              settings={settings}
              canManage={manage}
            />
            <LaunchChecks
              checks={qa.checks}
              blockers={qa.blockers}
              passed={qa.passed}
              publishState={settings?.publish_state ?? "draft"}
              lastPublishedAt={settings?.last_published_at ?? null}
              slug={org?.slug}
              canManage={manage}
              isPublishing={saveSettings.isPending}
              onPublish={() => {
                if (!qa.passed) return;
                saveSettings.mutate({
                  publish_state: "published",
                  published: true,
                  last_published_at: new Date().toISOString(),
                });
              }}
              onUnpublish={() =>
                saveSettings.mutate({ publish_state: "unpublished", published: false })
              }
            />
            <PreviewLinks organizationId={orgId} canManage={manage} />
            <VersionHistory organizationId={orgId} canManage={manage} />
            <VersionDiff organizationId={orgId} />
            <PlatformEngine
              businessName={org?.name ?? null}
              slug={org?.slug ?? null}
              profile={profile}
              services={(services ?? []).map((s) => ({
                name: s.name,
                description: s.description,
                price: s.starting_price,
                bookable: s.bookable,
              }))}
              seo={{
                title: seo.headline ?? null,
                description: seo.meta_description ?? null,
                headline: seo.headline ?? copy?.heroHeadline ?? null,
              }}
              pages={pages ?? []}
              publishState={settings?.publish_state ?? "draft"}
              canManage={manage}
              isPublishing={saveSettings.isPending}
              onPublish={() =>
                saveSettings.mutate({
                  publish_state: "published",
                  published: true,
                  last_published_at: new Date().toISOString(),
                })
              }
            />
          </div>
        }
      />
    </div>
  );
}
