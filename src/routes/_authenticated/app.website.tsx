import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { LoadingRows } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import {
  useBusinessProfile,
  useSaveWebsiteSettings,
  useServices,
  useWebsiteSettings,
} from "@/lib/queries";
import { useWorkspace } from "@/lib/use-tenant";
import { canManage } from "@/lib/domain";
import { readSeo } from "@/lib/site-seo";
import { WebsiteReview } from "@/components/app/WebsiteReview";
import { BuilderWizard } from "@/components/app/BuilderWizard";
import { WebsiteStructure } from "@/components/app/WebsiteStructure";
import { LeadEngine } from "@/components/app/LeadEngine";
import { SiteChatbot } from "@/components/app/SiteChatbot";
import { LaunchChecks } from "@/components/app/LaunchChecks";
import { PreviewLinks } from "@/components/app/PreviewLinks";
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
import { websiteQa } from "@/lib/website-content";

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
        </div>
        {org ? (
          <Button asChild variant="outline">
            <Link to="/s/$slug" params={{ slug: org.slug }} target="_blank">
              Preview site <ExternalLink className="size-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      <SiteChatbot
        organizationId={orgId}
        canManage={manage}
        hasSections={visibleSections > 0}
        publishState={settings?.publish_state ?? "draft"}
        isPublishing={saveSettings.isPending}
        onPublishNow={() =>
          saveSettings.mutate({
            publish_state: "published",
            published: true,
            last_published_at: new Date().toISOString(),
          })
        }
      />

      <BuilderWizard
        organizationId={orgId}
        org={org}
        profile={profile}
        servicesCount={servicesCount}
        pricedCount={pricedCount}
        canManage={manage}
        structureSlot={
          <div className="space-y-6">
            <SiteEnginePanel organizationId={orgId} canManage={manage} hasCopy={!!copy} />
            <BriefReviewPanel organizationId={orgId} brief={brief} canManage={manage} />
            <MissingFactsPanel organizationId={orgId} gaps={readiness?.gaps ?? []} canManage={manage} />
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
