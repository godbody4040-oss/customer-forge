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
import { getFunnelDetails, getPlatformFunnel } from "@/lib/platform-funnel.functions";
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
  const funnelFn = useServerFn(getPlatformFunnel);
  const detailsFn = useServerFn(getFunnelDetails);
  const settingsFn = useServerFn(getPlatformSettings);
  const saveFn = useServerFn(setGaMeasurementId);

  const [days, setDays] = useState(30);
  const [showDetails, setShowDetails] = useState(false);
  const [gaId, setGaId] = useState("");

  const traffic = useQuery({
    queryKey: ["admin", "traffic", days],
    queryFn: () => trafficFn({ data: { days } }),
  });
  const funnel = useQuery({
    queryKey: ["admin", "funnel", days],
    queryFn: () => funnelFn({ data: { days } }),
  });
  const details = useQuery({
    queryKey: ["admin", "funnel-details", days],
    queryFn: () => detailsFn({ data: { days } }),
    enabled: showDetails,
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
        eyebrow="Funnel"
        title="Visitors → accounts → trials → paid customers"
        description="Every funnel number is read from the database: accounts from real sign-ups, trials from provisioned workspaces, paid customers from verified Stripe billing. Nothing is estimated."
      />

      <div className="flex flex-wrap gap-2">
        {[1, 7, 30, 90].map((option) => (
          <Button
            key={option}
            size="sm"
            variant={days === option ? "signal" : "outline"}
            onClick={() => setDays(option)}
          >
            {option === 1 ? "Today" : `Last ${option} days`}
          </Button>
        ))}
      </div>

      {funnel.isLoading ? (
        <LoadingRows rows={3} />
      ) : funnel.isError ? (
        <EmptyState
          title="Analytics unavailable"
          description="The funnel could not be read from the database. This is not zero — retry in a moment."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(funnel.data?.stages ?? []).map((stage) => (
            <MetricCard
              key={stage.key}
              label={stage.label}
              value={stage.count === null ? "Analytics unavailable" : number(stage.count)}
              hint={
                stage.count === null
                  ? "Query failed — this is not zero"
                  : stage.rate !== null
                    ? `${stage.rate}% ${stage.rateLabel ?? ""}`.trim()
                    : (stage.rateLabel ?? `Last ${funnel.data?.days} days`)
              }
              {...(stage.key === "paid" ? { tone: "signal" as const } : {})}
            />
          ))}
        </div>
      )}

      <Panel className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-[15px] font-semibold">Where each number comes from</p>
          <Button size="sm" variant="outline" onClick={() => setShowDetails((v) => !v)}>
            {showDetails ? "Hide records" : "Show records"}
          </Button>
        </div>
        {showDetails ? (
          details.isError ? (
            <p className="text-[12px] text-muted-foreground">
              Analytics unavailable — the underlying records could not be read.
            </p>
          ) : details.isLoading ? (
            <LoadingRows rows={3} />
          ) : (
            <div className="space-y-4 text-[12px]">
              <div>
                <p className="eyebrow">Accounts created</p>
                <ul className="divide-y divide-border">
                  {(details.data?.accounts ?? []).slice(0, 25).map((row) => (
                    <li key={row.id} className="flex justify-between gap-3 py-1.5">
                      <span className="truncate font-mono text-[11px]">{row.id}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {new Date(row.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC
                      </span>
                    </li>
                  ))}
                  {(details.data?.accounts ?? []).length === 0 ? (
                    <li className="py-1.5 text-muted-foreground">No accounts in this range.</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <p className="eyebrow">Trials</p>
                <ul className="divide-y divide-border">
                  {(details.data?.trials ?? []).slice(0, 25).map((row) => (
                    <li key={row.organizationId} className="flex justify-between gap-3 py-1.5">
                      <span className="truncate">{row.name ?? row.organizationId}</span>
                      <span className="shrink-0 text-muted-foreground">
                        ends {new Date(row.trialEndsAt).toISOString().slice(0, 10)} ·{" "}
                        {row.active ? "active" : row.status}
                      </span>
                    </li>
                  ))}
                  {(details.data?.trials ?? []).length === 0 ? (
                    <li className="py-1.5 text-muted-foreground">No trials in this range.</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <p className="eyebrow">Paid customers (verified Stripe)</p>
                <ul className="divide-y divide-border">
                  {(details.data?.paid ?? []).slice(0, 25).map((row) => (
                    <li key={row.organizationId} className="flex justify-between gap-3 py-1.5">
                      <span className="truncate">{row.name ?? row.organizationId}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {row.subscriptionId ?? "—"}
                      </span>
                    </li>
                  ))}
                  {(details.data?.paid ?? []).length === 0 ? (
                    <li className="py-1.5 text-muted-foreground">No paid customers yet.</li>
                  ) : null}
                </ul>
              </div>
            </div>
          )
        ) : (
          <p className="text-[12px] text-muted-foreground">
            Accounts are one record per sign-in identity, trials one record per workspace, paid
            customers one record per active Stripe subscription — so nobody can be counted twice.
          </p>
        )}
      </Panel>

      <SectionHeading
        eyebrow="Marketing traffic"
        title="Who reaches revoragrowthsystems.com"
        description="Browser-recorded page views and sessions. Sessions are distinct browsers, not verified unique people, and these events never decide who counts as a customer."
      />

      {traffic.isLoading ? (
        <LoadingRows rows={3} />
      ) : traffic.isError ? (
        <EmptyState
          title="Analytics unavailable"
          description="Traffic could not be read from the database right now."
        />
      ) : !report || report.views === 0 ? (
        <EmptyState
          title="No visits recorded yet"
          description="Every public page view is counted from the moment the site is live. Share the link, run the local SEO pages, and traffic will appear here."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Page views" value={number(report.views)} />
            <MetricCard label="Unique sessions" value={number(report.sessions)} />
            <MetricCard
              label="Reached the portal"
              value={`${number(report.portalSessions)} (${report.portalRate}%)`}
            />
            <MetricCard label="Signup starts (event)" value={number(report.signupStarts)} />
            <MetricCard
              label="Returns from Stripe (event)"
              value={number(report.checkoutReturns)}
              hint="Not a payment — see paid customers above"
            />
            <MetricCard label="Session → signup start" value={`${report.signupStartRate}%`} />
          </div>

          <Panel className="space-y-3">
            <p className="font-display text-[15px] font-semibold">Most visited pages</p>
            <ul className="divide-y divide-border text-[12px]">
              {report.topPages.map((page) => (
                <li key={page.path} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate font-mono text-[11px]">{page.path}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {number(page.views)} views · {number(page.sessions)} sessions
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
                    {number(source.sessions)} sessions · {number(source.signupStarts)} signup starts
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
