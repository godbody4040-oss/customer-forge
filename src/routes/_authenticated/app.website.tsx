import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { LoadingRows, MetricCard, Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useBusinessProfile,
  useSaveBusinessProfile,
  useSaveWebsiteSettings,
  useServices,
  useWebsiteSettings,
} from "@/lib/queries";
import { useWorkspace } from "@/lib/use-tenant";
import { TEMPLATES } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { readSeo } from "@/lib/site-seo";
import { canManage } from "@/lib/domain";
import { WebsiteReview } from "@/components/app/WebsiteReview";
import {
  AiCopyAssistant,
  RevoraScorePanel,
  SiteEnginePanel,
  VersionHistory,
} from "@/components/app/SiteEngine";
import { EDITABLE_COPY_FIELDS, growthRecommendations, readCopy, revoraScore } from "@/lib/site-engine";
import { useScoreFacts } from "@/lib/site-engine.hooks";

export const Route = createFileRoute("/_authenticated/app/website")({
  head: () => ({
    meta: [
      { title: "Website — Revora" },
      { name: "description", content: "Edit your public business website and check its SEO health." },
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
  const saveProfile = useSaveBusinessProfile(orgId);
  const saveSettings = useSaveWebsiteSettings(orgId);

  const profile = profileQuery.data;
  const settings = settingsQuery.data;
  const seo = readSeo(settings?.seo);
  const facts = useScoreFacts(orgId);
  const generation = (settings?.generation ?? null) as Record<string, unknown> | null;
  const copy = readCopy(generation?.["copy"]);
  const manage = canManage(ws?.workspace?.role ?? "viewer");
  const score = revoraScore({
    profile,
    seo,
    servicesCount: facts.data?.servicesCount ?? (services ?? []).length,
    pricedServicesCount: facts.data?.pricedServicesCount ?? 0,
    mediaCount: facts.data?.mediaCount ?? 0,
    reviewCount: facts.data?.reviewCount ?? 0,
    socialLinks: facts.data?.socialLinks ?? 0,
    quoteFormCount: facts.data?.quoteFormCount ?? 0,
    bookableCount: facts.data?.bookableCount ?? 0,
    hasCopy: !!copy,
  });
  const recommendations = growthRecommendations(
    score,
    facts.data?.signals ?? { visitors: 0, leads: 0, bookings: 0, callClicks: 0, formViews: 0 },
  );
  const copyFields = copy
    ? Object.fromEntries(
        EDITABLE_COPY_FIELDS.map((f) => [f.key, String((copy as Record<string, unknown>)[f.key] ?? "")]),
      )
    : {};
  const [template, setTemplate] = useState<string | null>(null);
  const activeTemplate = template ?? settings?.template ?? "default";

  const seoChecks = [
    { label: "Business name set", ok: !!org?.name },
    { label: "Headline written", ok: !!seo.headline },
    { label: "About section written", ok: !!profile?.description },
    { label: "Phone number added", ok: !!profile?.phone },
    { label: "Service area / city set", ok: !!profile?.city },
    { label: "At least 3 services listed", ok: (services ?? []).length >= 3 },
    { label: "Meta description set", ok: !!seo.meta_description },
  ];
  const score = Math.round((seoChecks.filter((c) => c.ok).length / seoChecks.length) * 100);

  if (profileQuery.isLoading || settingsQuery.isLoading) return <LoadingRows rows={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Public site</p>
          <h1 className="mt-1 font-display text-[24px] font-semibold">Website</h1>
        </div>
        {org ? (
          <Button asChild variant="outline">
            <Link to="/s/$slug" params={{ slug: org.slug }} target="_blank">
              View live site <ExternalLink className="size-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      <SiteEnginePanel organizationId={orgId} canManage={manage} hasCopy={!!copy} />

      <RevoraScorePanel score={score.score} factors={score.factors} recommendations={recommendations} />

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

      <VersionHistory organizationId={orgId} canManage={manage} />

      <WebsiteReview
        organizationId={orgId}
        slug={org?.slug}
        settings={settings}
        canManage={manage}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="SEO health"
          value={`${score}%`}
          hint={score >= 85 ? "Strong" : "Fix the items below"}
          tone={score >= 85 ? "signal" : "attention"}
          progress={score}
        />
        <MetricCard label="Services listed" value={String((services ?? []).length)} hint="on your site" />
        <MetricCard
          label="Template"
          value={TEMPLATES.find((t) => t.id === activeTemplate)?.name ?? "Universal"}
          hint="drives layout and CTAs"
        />
      </div>

      <Panel className="p-5">
        <SectionHeading eyebrow="Search visibility" title="What to fix next" />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {seoChecks.map((check) => (
            <li key={check.label} className="flex items-center gap-2.5 text-[13px]">
              <span aria-hidden="true" className={check.ok ? "text-primary" : "text-accent"}>
                {check.ok ? "✓" : "•"}
              </span>
              <span className={check.ok ? "text-muted-foreground" : ""}>{check.label}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="p-5">
        <SectionHeading eyebrow="Layout" title="Template" />
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTemplate(t.id);
                saveSettings.mutate({ template: t.id });
              }}
              className={cn(
                "cursor-pointer rounded-md border p-3.5 text-left transition-colors",
                activeTemplate === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-elevated",
              )}
            >
              <p className="text-[14px] font-medium">{t.name}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{t.focus}</p>
              {activeTemplate === t.id ? (
                <span className="mt-2 inline-block">
                  <Pill tone="signal">Active</Pill>
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionHeading eyebrow="Above the fold" title="Hero copy" />
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            saveSettings.mutate({
              seo: {
                ...seo,
                headline: String(form.get("headline") ?? "") || null,
                subheadline: String(form.get("subheadline") ?? "") || null,
                meta_description: String(form.get("meta") ?? "") || null,
                primary_cta_label: String(form.get("cta") ?? "") || null,
              },
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="w-headline">Headline</Label>
            <Input id="w-headline" name="headline" defaultValue={seo.headline ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w-sub">Subheadline</Label>
            <Textarea
              id="w-sub"
              name="subheadline"
              rows={2}
              defaultValue={seo.subheadline ?? ""}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="w-cta">Main button label</Label>
              <Input
                id="w-cta"
                name="cta"
                defaultValue={seo.primary_cta_label ?? ""}
                placeholder="Get my instant quote"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-meta">
                <span className="inline-flex items-center gap-1.5">
                  <Search className="size-3.5" aria-hidden="true" /> Search description
                </span>
              </Label>
              <Input
                id="w-meta"
                name="meta"
                maxLength={160}
                defaultValue={seo.meta_description ?? ""}
              />
            </div>
          </div>
          <Button type="submit" variant="signal" disabled={saveSettings.isPending}>
            Save hero
          </Button>
        </form>
      </Panel>

      <Panel className="p-5">
        <SectionHeading eyebrow="Trust" title="Business details" />
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            saveProfile.mutate({
              description: String(form.get("about") ?? "") || null,
              tagline: String(form.get("tagline") ?? "") || null,
              phone: String(form.get("phone") ?? "") || null,
              email: String(form.get("email") ?? "") || null,
              city: String(form.get("city") ?? "") || null,
              service_area: String(form.get("area") ?? "") || null,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="w-tagline">Tagline</Label>
            <Input id="w-tagline" name="tagline" defaultValue={profile?.tagline ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w-about">About your business</Label>
            <Textarea id="w-about" name="about" rows={5} defaultValue={profile?.description ?? ""} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="w-phone">Phone</Label>
              <Input id="w-phone" name="phone" defaultValue={profile?.phone ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-email">Email</Label>
              <Input id="w-email" name="email" type="email" defaultValue={profile?.email ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-city">City</Label>
              <Input id="w-city" name="city" defaultValue={profile?.city ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-area">Service area</Label>
              <Input id="w-area" name="area" defaultValue={profile?.service_area ?? ""} />
            </div>
          </div>
          <Button type="submit" variant="signal" disabled={saveProfile.isPending}>
            Save details
          </Button>
        </form>
      </Panel>
    </div>
  );
}
