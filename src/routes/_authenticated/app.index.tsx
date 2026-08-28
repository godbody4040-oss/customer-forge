import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { MetricCard, Panel, Pill, SectionHeading, LoadingRows, EmptyState } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/use-tenant";
import {
  useAnalytics,
  useAppointments,
  useBusinessProfile,
  useLeads,
  useServices,
} from "@/lib/queries";
import { currency, dateShort, relative, timeShort } from "@/lib/format";
import { leadStatusMeta } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Local Lead Engine" },
      { name: "description", content: "Your leads, bookings and conversion at a glance." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const WEEK = 7 * 86_400_000;

function Dashboard() {
  const { data: ws } = useWorkspace();
  const orgId = ws?.workspace?.organizationId;
  const org = ws?.workspace?.organization;
  const leadsQuery = useLeads(orgId);
  const apptsQuery = useAppointments(orgId);
  const analyticsQuery = useAnalytics(orgId, 30);
  const servicesQuery = useServices(orgId);
  const profileQuery = useBusinessProfile(orgId);

  const leads = leadsQuery.data ?? [];
  const appts = apptsQuery.data ?? [];
  const events = analyticsQuery.data ?? [];

  const stats = useMemo(() => {
    const now = Date.now();
    const thisWeek = leads.filter((l) => now - new Date(l.created_at).getTime() < WEEK);
    const lastWeek = leads.filter((l) => {
      const age = now - new Date(l.created_at).getTime();
      return age >= WEEK && age < WEEK * 2;
    });
    const views = events.filter((e) => e.event_type === "page_view").length;
    const booked = leads.filter((l) => l.status === "booked" || l.status === "completed");
    const pipeline = leads
      .filter((l) => !["completed", "lost"].includes(l.status))
      .reduce((sum, l) => sum + Number(l.estimated_value ?? 0), 0);
    const needsAttention = leads.filter(
      (l) => (l.status === "new" || l.status === "contacted") && !l.last_contacted_at,
    );
    const upcoming = appts
      .filter((a) => new Date(a.starts_at).getTime() > now && a.status !== "cancelled")
      .slice(0, 5);
    const delta =
      lastWeek.length === 0
        ? thisWeek.length > 0
          ? 100
          : 0
        : Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100);
    return {
      thisWeek: thisWeek.length,
      delta,
      views,
      conversion: views > 0 ? (leads.length / views) * 100 : 0,
      booked: booked.length,
      pipeline,
      needsAttention,
      upcoming,
    };
  }, [leads, appts, events]);

  const checklist = [
    { done: !!profileQuery.data?.phone, label: "Add your phone number", to: "/app/settings" },
    { done: (servicesQuery.data ?? []).length > 0, label: "Add your services", to: "/app/services" },
    { done: !!profileQuery.data?.about, label: "Write your About section", to: "/app/website" },
    { done: !!org?.conversion_goal, label: "Pick your main conversion goal", to: "/app/settings" },
  ];
  const remaining = checklist.filter((c) => !c.done);

  if (leadsQuery.isLoading || !orgId) return <LoadingRows rows={5} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Business command center</p>
        <h1 className="mt-1 font-display text-[24px] font-semibold">
          {org?.name ?? "Your business"}
        </h1>
      </div>

      <div className="panel-inset panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="eyebrow">New leads · last 7 days</p>
            <p className="tnum mt-1.5 font-display text-[42px] leading-none font-semibold">
              {stats.thisWeek}
            </p>
            <p className={`mt-2 text-xs ${stats.delta >= 0 ? "text-primary" : "text-destructive"}`}>
              {stats.delta >= 0 ? "▲" : "▼"} {Math.abs(stats.delta)}% vs previous week
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow">Open pipeline value</p>
            <p className="tnum mt-1.5 font-display text-[22px] font-semibold">
              {currency(stats.pipeline)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Bookings" value={String(stats.booked)} hint="leads that turned into work" tone="signal" />
        <MetricCard
          label="Conversion"
          value={`${stats.conversion.toFixed(1)}%`}
          hint="visitor → lead (30d)"
          tone="attention"
          progress={stats.conversion * 10}
        />
        <MetricCard
          label="Needs follow-up"
          value={String(stats.needsAttention.length)}
          hint={stats.needsAttention.length ? "nobody has replied yet" : "all caught up"}
          tone={stats.needsAttention.length ? "attention" : "signal"}
        />
        <MetricCard label="Website visitors" value={String(stats.views)} hint="last 30 days" />
      </div>

      {remaining.length ? (
        <Panel className="p-5">
          <SectionHeading eyebrow="Finish setup" title={`${remaining.length} steps left`} />
          <ul className="mt-4 space-y-2">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5 text-[13px]">
                  {item.done ? (
                    <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span className={item.done ? "text-muted-foreground line-through" : ""}>
                    {item.label}
                  </span>
                </span>
                {item.done ? null : (
                  <Button asChild variant="ghost" size="sm">
                    <Link to={item.to}>Fix</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel className="p-5">
          <SectionHeading
            eyebrow="Do this first"
            title="Leads waiting on you"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/app/leads">
                  All leads <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          />
          <ul className="mt-4 divide-y divide-border">
            {stats.needsAttention.slice(0, 5).map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{lead.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {[lead.service_interest, relative(lead.created_at)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Pill tone={leadStatusMeta(lead.status).tone}>{leadStatusMeta(lead.status).label}</Pill>
              </li>
            ))}
            {stats.needsAttention.length === 0 ? (
              <li className="py-6 text-center text-[13px] text-muted-foreground">
                Every lead has been contacted. That's how you win the job.
              </li>
            ) : null}
          </ul>
        </Panel>

        <Panel className="p-5">
          <SectionHeading
            eyebrow="Calendar"
            title="Next appointments"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/app/calendar">
                  Calendar <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          />
          <ul className="mt-4 divide-y divide-border">
            {stats.upcoming.map((appt) => (
              <li key={appt.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{appt.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {dateShort(appt.starts_at)} · {timeShort(appt.starts_at)}
                  </p>
                </div>
                <Pill tone={appt.status === "confirmed" ? "signal" : "attention"}>{appt.status}</Pill>
              </li>
            ))}
            {stats.upcoming.length === 0 ? (
              <li className="py-6 text-center text-[13px] text-muted-foreground">
                No upcoming appointments yet.
              </li>
            ) : null}
          </ul>
        </Panel>
      </div>

      <Panel className="p-5">
        <SectionHeading eyebrow="Latest activity" title="Recent leads" />
        {leads.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No leads yet"
              description="Share your website address and your first leads will land right here."
              action={
                <Button asChild variant="signal">
                  <Link to="/app/website">Set up your website</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {leads.slice(0, 8).map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{lead.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {[lead.source, lead.service_interest, relative(lead.created_at)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <span className="tnum text-[12px] text-muted-foreground">
                    {currency(Number(lead.estimated_value ?? 0))}
                  </span>
                  <Pill tone={leadStatusMeta(lead.status).tone}>
                    {leadStatusMeta(lead.status).label}
                  </Pill>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
