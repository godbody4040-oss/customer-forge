import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LoadingRows } from "@/components/app/Bits";
import { GrowthCommandCenter } from "@/components/app/GrowthCommandCenter";
import {
  useBusinessProfile,
  useSaveWebsiteSettings,
  useServices,
  useWebsiteSettings,
} from "@/lib/queries";
import { useRunSiteEngine, useScoreFacts, useSnapshotWebsiteVersion } from "@/lib/site-engine.hooks";
import { useWebsiteContent } from "@/lib/website-content.hooks";
import { useWorkspace } from "@/lib/use-tenant";
import { canManage } from "@/lib/domain";
import { readSeo } from "@/lib/site-seo";
import { readCopy } from "@/lib/site-engine";
import type { AutoFixKey, GrowthAuditInput } from "@/lib/growth-command";

export const Route = createFileRoute("/_authenticated/app/command")({
  head: () => ({
    meta: [
      { title: "AI Growth Command Center — Revora" },
      {
        name: "description",
        content:
          "Audit, improve, connect and repair your whole website and growth system from one place.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CommandCenterPage,
});

function CommandCenterPage() {
  const { data: ws } = useWorkspace();
  const org = ws?.workspace?.organization;
  const orgId = ws?.workspace?.organizationId;
  const manage = canManage(ws?.workspace?.role ?? "viewer");

  const profileQuery = useBusinessProfile(orgId);
  const settingsQuery = useWebsiteSettings(orgId);
  const { data: services } = useServices(orgId);
  const { data: pages } = useWebsiteContent(orgId);
  const facts = useScoreFacts(orgId);

  const saveSettings = useSaveWebsiteSettings(orgId);
  const runEngine = useRunSiteEngine(orgId);
  const snapshot = useSnapshotWebsiteVersion(orgId);
  const [busyFix, setBusyFix] = useState<AutoFixKey | null>(null);

  const profile = profileQuery.data as Record<string, unknown> | null | undefined;
  const settings = settingsQuery.data;
  const seo = readSeo(settings?.seo);
  const generation = (settings?.generation ?? null) as Record<string, unknown> | null;
  const copy = readCopy(generation?.["copy"]);

  if (profileQuery.isLoading || settingsQuery.isLoading) return <LoadingRows rows={5} />;

  const visibleSections = (pages ?? []).reduce(
    (sum, page) => sum + page.sections.filter((section) => section.is_visible).length,
    0,
  );
  const str = (key: string) => {
    const value = profile?.[key];
    return typeof value === "string" && value.trim() ? value : null;
  };
  const hours = profile?.["hours"];

  const input: GrowthAuditInput = {
    businessName: org?.name ?? null,
    description: str("description"),
    tagline: str("tagline"),
    phone: str("phone"),
    email: str("email"),
    city: str("city"),
    serviceArea: str("service_area"),
    logoUrl: str("logo_url"),
    hoursSet: Boolean(hours && typeof hours === "object" && Object.keys(hours).length > 0),
    headline: seo.headline ?? null,
    metaDescription: seo.meta_description ?? null,
    primaryCtaLabel: seo.primary_cta_label ?? null,
    hasCopy: !!copy,
    copyFaqCount: copy?.faqs?.length ?? 0,
    copyHeadline: copy?.heroHeadline ?? null,
    copyMetaDescription: copy?.metaDescription ?? null,
    copyPrimaryCta: copy?.primaryCta ?? null,
    servicesCount: facts.data?.servicesCount ?? (services ?? []).length,
    pricedServicesCount: facts.data?.pricedServicesCount ?? 0,
    bookableCount: facts.data?.bookableCount ?? 0,
    quoteFormCount: facts.data?.quoteFormCount ?? 0,
    mediaCount: facts.data?.mediaCount ?? 0,
    reviewCount: facts.data?.reviewCount ?? 0,
    socialLinks: facts.data?.socialLinks ?? 0,
    pagesCount: (pages ?? []).length,
    visibleSections,
    publishState: settings?.publish_state ?? "draft",
    domainStatus: settings?.domain_status ?? null,
    visitors: facts.data?.signals.visitors ?? 0,
    leads: facts.data?.signals.leads ?? 0,
    bookings: facts.data?.signals.bookings ?? 0,
    callClicks: facts.data?.signals.callClicks ?? 0,
  };

  const applyFix = async (key: AutoFixKey) => {
    if (!manage) return;
    setBusyFix(key);
    try {
      // Safe AI: keep a restorable version before Revora changes saved content.
      if (key !== "generate_site") {
        try {
          await snapshot.mutateAsync(`Before auto fix: ${key}`);
        } catch {
          /* snapshotting is best effort — never block the fix */
        }
      }
      if (key === "generate_site") await runEngine.mutateAsync();

      if (key === "apply_cta" && copy?.primaryCta) {
        await saveSettings.mutateAsync({ seo: { ...seo, primary_cta_label: copy.primaryCta } });
      }
      if (key === "apply_meta" && copy) {
        await saveSettings.mutateAsync({
          seo: {
            ...seo,
            meta_description: seo.meta_description || copy.metaDescription,
            headline: seo.headline || copy.heroHeadline,
          },
        });
      }
      if (key === "publish_site") {
        await saveSettings.mutateAsync({
          publish_state: "published",
          published: true,
          last_published_at: new Date().toISOString(),
        });
      }
    } finally {
      setBusyFix(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Revora AI</p>
        <h1 className="mt-1 font-display text-[24px] font-semibold">Growth Command Center</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
          One place to inspect, improve, connect and repair your entire website and business system. Every finding
          below is based on what is actually saved in your workspace.
        </p>
      </div>

      <GrowthCommandCenter
        input={input}
        canManage={manage}
        isRefreshing={facts.isFetching || settingsQuery.isFetching}
        busyFix={busyFix}
        onRefresh={() => {
          void facts.refetch();
          void settingsQuery.refetch();
          void profileQuery.refetch();
        }}
        onAutoFix={(key) => void applyFix(key)}
      />
    </div>
  );
}
