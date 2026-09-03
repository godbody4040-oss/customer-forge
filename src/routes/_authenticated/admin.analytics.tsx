import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import {
  EmptyState,
  LoadingRows,
  MetricCard,
  Panel,
  Pill,
  SectionHeading,
} from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTrafficReport } from "@/lib/conversion.functions";
import { getPlatformSettings, setGaMeasurementId } from "@/lib/platform-settings.functions";
import { number } from "@/lib/format";
import { SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [{ title: "Analytics — Revora admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const qc = useQueryClient();
  const trafficFn = useServerFn(getTrafficReport);
  const settingsFn = useServerFn(getPlatformSettings);
  const saveFn = useServerFn(setGaMeasurementId);

  const [days, setDays] = useState(30);
  const [gaId, setGaId] = useState("");

  const traffic = useQuery({
    queryKey: ["admin", "traffic", days],
    queryFn: () => trafficFn({ data: { days } }),
  });
  const settings = useQuery({
    queryKey: ["admin", "platform-settings"],
    queryFn: () => settingsFn({}),
  });

  useEffect(() => {
    if (settings.data) setGaId(settings.data.gaMeasurementId ?? "");
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: { measurementId: gaId } }),
    onSuccess: (result) => {
      toast.success(
        result.measurementId
          ? `Google Analytics connected (${result.measurementId}). It starts collecting on the next page load.`
          : "Google Analytics disconnected. Revora's own tracking keeps running.",
      );
      void qc.invalidateQueries({ queryKey: ["admin", "platform-settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const report = traffic.data;

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Traffic"
        title="Who reaches revoragrowthsystems.com"
        description="Real page views and sessions recorded on the public site, plus how many reach the portal and convert."
      />

      <div className="flex flex-wrap gap-2">
        {[7, 30, 90].map((option) => (
          <Button
            key={option}
            size="sm"
            variant={days === option ? "signal" : "outline"}
            onClick={() => setDays(option)}
          >
            Last {option} days
          </Button>
        ))}
      </div>

      {traffic.isLoading ? (
        <LoadingRows rows={3} />
      ) : !report || report.views === 0 ? (
        <EmptyState
          title="No visitors recorded yet"
          description="Every public page view is counted from the moment the site is live. Share the link, run the local SEO pages, and traffic will appear here."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Page views" value={number(report.views)} />
            <MetricCard label="Unique visitors" value={number(report.visitors)} />
            <MetricCard
              label="Reached the portal"
              value={`${number(report.portalVisitors)} (${report.portalRate}%)`}
            />
            <MetricCard label="Signups completed" value={number(report.signups)} />
            <MetricCard label="Paid checkouts" value={number(report.paid)} />
            <MetricCard label="Visitor → signup" value={`${report.leadRate}%`} />
          </div>

          <Panel className="space-y-3">
            <p className="font-display text-[15px] font-semibold">Most visited pages</p>
            <ul className="divide-y divide-border text-[12px]">
              {report.topPages.map((page) => (
                <li key={page.path} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate font-mono text-[11px]">{page.path}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {number(page.views)} views · {number(page.visitors)} visitors
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="space-y-3">
            <p className="font-display text-[15px] font-semibold">Where they come from</p>
            <ul className="divide-y divide-border text-[12px]">
              {report.topSources.map((source) => (
                <li key={source.source} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate">{source.source}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {number(source.visitors)} visitors · {number(source.signups)} signups ·{" "}
                    {number(source.paid)} paid
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}

      <Panel className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-[15px] font-semibold">Google Analytics 4</p>
          <Pill tone={settings.data?.gaMeasurementId ? "signal" : "info"}>
            {settings.data?.gaMeasurementId ? "Connected" : "Not connected"}
          </Pill>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Paste the measurement ID from your GA4 property (Admin → Data streams → Web). Until a real
          ID is saved, no Google script loads at all. Revora's own tracking above runs either way,
          so ad blockers can't hide your numbers.
        </p>
        <div className="space-y-2">
          <Label htmlFor="ga-id">Measurement ID</Label>
          <Input
            id="ga-id"
            value={gaId}
            onChange={(event) => setGaId(event.target.value)}
            placeholder="G-XXXXXXXXXX"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="signal"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">
              Open Google Analytics <ExternalLink className="ml-1 size-3.5" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </Panel>

      <Panel className="space-y-3">
        <p className="font-display text-[15px] font-semibold">Google Search Console</p>
        <p className="text-[12px] text-muted-foreground">
          {SITE_URL} is verified and its sitemap has been submitted, so Google is crawling the
          public pages. Search Console shows the queries people used to find you — impressions and
          clicks appear there within a few days of indexing.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Search Console <ExternalLink className="ml-1 size-3.5" aria-hidden="true" />
            </a>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <a href={`${SITE_URL}/sitemap.xml`} target="_blank" rel="noopener noreferrer">
              View sitemap
            </a>
          </Button>
        </div>
      </Panel>
    </div>
  );
}
