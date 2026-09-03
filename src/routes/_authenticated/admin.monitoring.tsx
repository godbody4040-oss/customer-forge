import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, BellRing } from "lucide-react";
import {
  EmptyState,
  ErrorNote,
  LoadingRows,
  MetricCard,
  Panel,
  Pill,
  SectionHeading,
} from "@/components/app/Bits";
import { getErrorFeed } from "@/lib/monitoring.functions";

export const Route = createFileRoute("/_authenticated/admin/monitoring")({
  head: () => ({
    meta: [
      { title: "Monitoring — Revora admin" },
      {
        name: "description",
        content: "Production crashes, API failures and job errors across the platform.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminMonitoring,
});

const when = (value: string) =>
  new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

const tone = (level: string) =>
  level === "fatal" || level === "error" ? "danger" : level === "warning" ? "attention" : "signal";

function AdminMonitoring() {
  const load = useServerFn(getErrorFeed);
  const feed = useQuery({
    queryKey: ["admin-error-feed"],
    queryFn: () => load({}),
    refetchInterval: 60_000,
  });

  const data = feed.data;

  return (
    <div className="space-y-4">
      <SectionHeading
        icon={<Activity className="size-4" />}
        title="Monitoring & alerts"
        description="Every server crash, failed API call, webhook error and background job failure recorded in the last 7 days."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Errors (24h)" value={String(data?.totals.last24h ?? 0)} />
        <MetricCard label="Errors (7d)" value={String(data?.totals.last7d ?? 0)} />
        <MetricCard
          label="Forwarded to Sentry"
          value={data?.sentryConfigured ? String(data.totals.forwarded) : "off"}
          hint={
            data?.sentryConfigured
              ? "Alerts are delivered through your Sentry project."
              : "Add a SENTRY_DSN to route alerts to Sentry. In-app tracking is already live."
          }
        />
      </div>

      <Panel>
        <SectionHeading
          icon={<BellRing className="size-4" />}
          title="Grouped issues"
          description="Ranked by how often the same failure happened."
        />
        {feed.isLoading ? <LoadingRows /> : null}
        {feed.error ? <ErrorNote message={(feed.error as Error).message} /> : null}
        {!feed.isLoading && !data?.groups.length ? (
          <EmptyState
            icon={<Activity className="size-5" />}
            title="No errors recorded"
            description="Nothing has failed in the last 7 days. New failures appear here within a minute."
          />
        ) : null}
        <div className="space-y-2">
          {(data?.groups ?? []).map((group) => (
            <div
              key={group.fingerprint}
              className="rounded-lg border border-border bg-card/40 p-3 text-[13px]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={tone(group.level)}>{group.level}</Pill>
                <Pill tone="info">{group.source}</Pill>
                <span className="font-medium">{group.count}×</span>
                <span className="text-muted-foreground">last {when(group.lastSeen)}</span>
              </div>
              <p className="mt-1 break-words">{group.message}</p>
              {group.route ? (
                <p className="text-muted-foreground">at {group.route}</p>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionHeading
          icon={<AlertTriangle className="size-4" />}
          title="Most recent"
          description="Newest events first, exactly as recorded."
        />
        <div className="space-y-1.5">
          {(data?.recent ?? []).map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-card/30 px-3 py-2 text-[12.5px]"
            >
              <Pill tone={tone(row.level)}>{row.level}</Pill>
              <span className="text-muted-foreground">{when(row.createdAt)}</span>
              <span className="min-w-0 flex-1 truncate">{row.message}</span>
              {row.statusCode ? <Pill tone="info">{row.statusCode}</Pill> : null}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
