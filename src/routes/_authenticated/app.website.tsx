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
import { BuilderShell, type BuilderSection } from "@/components/app/BuilderShell";
import { WebsiteStructure } from "@/components/app/WebsiteStructure";
import { LeadEngine } from "@/components/app/LeadEngine";
import { WebsiteProject } from "@/components/app/WebsiteProject";
import {
  EnvironmentBanner,
  ProductionLaunchModal,
  ProductionReadinessPanel,
} from "@/components/app/ProductionLaunch";
import { useLaunchFlow, useProductionReadiness, useProductionStatus } from "@/lib/production.hooks";
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
  // Deep links from audit findings land on the exact builder area that fixes them.
  validateSearch: (search: Record<string, unknown>) => ({
    section: typeof search["section"] === "string" ? (search["section"] as string) : undefined,
  }),
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
  const [section, setSection] = useState("overview");
  const requiredCount = (readiness?.requiredGaps ?? []).length;

  // One server-verified launch path for every publish button on this page.
  const { data: production } = useProductionStatus(orgId);
  const { data: productionReadiness } = useProductionReadiness(orgId);
  const launchFlow = useLaunchFlow(orgId);

  const servicesCount = facts.data?.servicesCount ?? (services ?? []).length;
  const pricedCount = facts.data?.pricedServicesCount ?? 0;
  const captureCount = (facts.data?.quoteFormCount ?? 0) + (facts.data?.bookableCount ?? 0);
  const visibleSections = (pages ?? []).reduce(
    (sum, page) => sum + page.sections.filter((s) => s.is_visible).length,
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

  const geniusFacts = {
    businessName: org?.name ?? null,
    industry: (org?.industry as string | undefined) ?? null,
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
  };

  /** Small pointer used inside the guided wizard's structure/launch steps so the
   * real panels live in one place (the workspace sections) instead of twice. */
  const pointer = (label: string, why: string, key: string) => (
    <section className="panel p-4">
      <p className="text-[13px] font-medium">{label}</p>
      <p className="mt-1 text-[12px] text-muted-foreground">{why}</p>
      <Button className="mt-3" size="sm" variant="signal" onClick={() => setSection(key)}>
        Open {label.toLowerCase()}
      </Button>
    </section>
  );

  const sections: BuilderSection[] = [
    {
      key: "overview",
      label: "Overview",
      hint: "Your project at a glance",
      node: (
        <div className="space-y-5">
          <EnvironmentBanner status={production} />
          <WebsiteProject
            organizationId={orgId}
            businessName={org?.name ?? null}
            industry={(org?.industry as string | undefined) ?? (profile?.["industry"] as string) ?? null}
            slug={org?.slug ?? null}
            city={(profile?.["city"] as string) ?? null}
            publishState={settings?.publish_state ?? "draft"}
            lastPublishedAt={settings?.last_published_at ?? null}
            customDomain={settings?.custom_domain ?? null}
            subdomain={settings?.subdomain ?? null}
            domainStatus={settings?.domain_status ?? null}
            pagesCount={(pages ?? []).length}
            visibleSections={visibleSections}
            score={siteScore.score}
            onEdit={() => setSection("pages")}
            onLaunchChecks={() => setSection("launch")}
          />
          {requiredCount > 0 && manage ? (
            <section className="panel border-accent/40 bg-accent/5 p-4">
              <p className="text-[13px] font-medium">
                {requiredCount} answer{requiredCount === 1 ? "" : "s"} needed before Revora can build
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Answer them once — they're reused across your pages, buttons, forms, CRM and search settings.
              </p>
              <Button
                className="mt-3"
                variant="signal"
                size="sm"
                onClick={() => {
                  setSection("answers");
                  setJump({ step: "business", nonce: Date.now() });
                }}
              >
                Answer them now
              </Button>
            </section>
          ) : null}
          <RevoraScorePanel
            score={siteScore.score}
            factors={siteScore.factors}
            recommendations={recommendations}
          />
        </div>
      ),
    },
    {
      key: "assistant",
      label: "Ask Revora",
      hint: "Describe a change, review the plan",
      node: (
        <div className="space-y-5">
          <SiteChatbot
            organizationId={orgId}
            canManage={manage}
            hasSections={visibleSections > 0}
            publishState={settings?.publish_state ?? "draft"}
            isPublishing={launchFlow.isLaunching || saveSettings.isPending}
            onPublishNow={() => {
              trackConversion("site_published", { metadata: { organization_id: orgId ?? "" } });
              launchFlow.launch();
            }}
          />
          <AssistantShowcase />
          <RevoraGenius
            organizationId={orgId}
            canManage={manage}
            pages={pages ?? []}
            facts={geniusFacts}
          />
        </div>
      ),
    },
    {
      key: "pages",
      label: "Pages & content",
      hint: "Pages, sections, copy, lead capture",
      node: (
        <div className="space-y-5">
          <SiteEnginePanel organizationId={orgId} canManage={manage} hasCopy={!!copy} />
          <WebsiteStructure organizationId={orgId} canManage={manage} />
          <LeadEngine organizationId={orgId} canManage={manage} />
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
          <BusinessBriefPanel brief={brief} />
        </div>
      ),
    },
    {
      key: "design",
      label: "Design & media",
      hint: "Visual direction, effects, images",
      node: (
        <div className="space-y-5">
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
        </div>
      ),
    },
    {
      key: "upgrades",
      label: "Upgrades",
      hint: "Elite additions Revora recommends",
      node: (
        <UpgradeStudio
          organizationId={orgId}
          canManage={manage}
          pages={pages ?? []}
          facts={{
            ...geniusFacts,
            primaryColor: (profile?.["primary_color"] as string) ?? null,
          }}
        />
      ),
    },
    {
      key: "answers",
      label: "Business answers",
      hint: "Guided questions, autosaved",
      ...(requiredCount ? { badge: requiredCount } : {}),
      node: (
        <div className="space-y-5">
          <MissingFactsPanel organizationId={orgId} gaps={readiness?.gaps ?? []} canManage={manage} />
          <BriefReviewPanel organizationId={orgId} brief={brief} canManage={manage} />
          <BuilderWizard
            organizationId={orgId}
            org={org}
            profile={profile}
            servicesCount={servicesCount}
            pricedCount={pricedCount}
            canManage={manage}
            jumpTo={jump}
            structureSlot={pointer(
              "Pages & content",
              "Your pages, sections, copy and lead capture live in the Pages section of the builder.",
              "pages",
            )}
            launchSlot={pointer(
              "Launch",
              "Readiness checks, previews and going live are handled in the Launch section.",
              "launch",
            )}
          />
        </div>
      ),
    },
    {
      key: "launch",
      label: "Launch",
      hint: "Checks, preview, go live",
      node: (
        <div className="space-y-5">
          <ProductionReadinessPanel
            readiness={productionReadiness}
            status={production}
            onLaunch={launchFlow.launch}
            isLaunching={launchFlow.isLaunching}
            canManage={manage}
            result={launchFlow.result}
          />
          <LaunchChecks
            checks={qa.checks}
            blockers={qa.blockers}
            passed={qa.passed}
            publishState={settings?.publish_state ?? "draft"}
            lastPublishedAt={settings?.last_published_at ?? null}
            slug={org?.slug}
            canManage={manage}
            isPublishing={launchFlow.isLaunching || saveSettings.isPending}
            onPublish={() => launchFlow.launch()}
            onUnpublish={() => saveSettings.mutate({ publish_state: "unpublished", published: false })}
          />
          <WebsiteReview organizationId={orgId} slug={org?.slug} settings={settings} canManage={manage} />
          <PreviewLinks organizationId={orgId} canManage={manage} />
          <BuildReportPanel report={buildReport} />
          <EngineSelfTestPanel organizationId={orgId} />
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
            isPublishing={launchFlow.isLaunching || saveSettings.isPending}
            onPublish={() => launchFlow.launch()}
          />
        </div>
      ),
    },
    {
      key: "versions",
      label: "Versions",
      hint: "History, compare, restore",
      node: (
        <div className="space-y-5">
          <VersionHistory organizationId={orgId} canManage={manage} />
          <VersionDiff organizationId={orgId} />
        </div>
      ),
    },
  ];

  const publishState = settings?.publish_state ?? "draft";

  return (
    <>
      <BuilderShell
        projectName={org?.name ? `${org.name} · website` : "Your website"}
        statusLabel={
          publishState === "published" ? "Live" : publishState === "unpublished" ? "Unpublished" : "Draft"
        }
        statusTone={publishState === "published" ? "live" : "draft"}
        saveLabel={
          saveSettings.isPending || saveProfile.isPending
            ? "Saving…"
            : settings?.last_published_at && publishState === "published"
              ? "Changes saved"
              : "Changes save automatically"
        }
        activeKey={section}
        onActiveKeyChange={setSection}
        sections={sections}
        actions={
          <>
            {org ? (
              <PreviewSiteButton
                organizationId={orgId}
                slug={org.slug}
                publishState={publishState}
              />
            ) : null}
            {manage ? (
              <Button
                size="sm"
                variant="signal"
                disabled={launchFlow.isLaunching}
                onClick={() => {
                  trackConversion("site_published", { metadata: { organization_id: orgId ?? "" } });
                  launchFlow.launch();
                }}
              >
                {launchFlow.isLaunching ? "Launching…" : "Launch"}
              </Button>
            ) : null}
          </>
        }
      />

      <ProductionLaunchModal
        open={launchFlow.lockedOpen}
        onClose={launchFlow.closeLocked}
        reason={launchFlow.result?.reason ?? null}
      />
    </>
  );
}
