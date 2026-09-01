import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoadingRows, Panel, Pill, SectionHeading, MetricCard } from "@/components/app/Bits";
import { listClients } from "@/lib/admin.functions";
import { GROWTH_SYSTEM } from "@/lib/offer";
import { currency, number } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  component: AdminPlans,
});

function AdminPlans() {
  const clientsFn = useServerFn(listClients);
  const clients = useQuery({ queryKey: ["admin", "clients"], queryFn: () => clientsFn({}) });
  const rows = clients.data ?? [];

  const paid = rows.filter((c) => Boolean(c.setup_paid_at) && c.subscription_state === "active");
  const awaiting = rows.filter(
    (c) => !c.is_demo && !(c.setup_paid_at && c.subscription_state === "active"),
  );
  const collected = rows.reduce((sum, c) => sum + Number(c.paid_total ?? 0), 0);
  const mrr = paid.length * GROWTH_SYSTEM.monthlyPrice;

  return (
    <div className="space-y-5">
      <SectionHeading eyebrow="Offer" title="Revora Growth System" />

      {clients.isLoading ? (
        <LoadingRows rows={3} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Active subscribers" value={number(paid.length)} />
            <MetricCard label="Recurring revenue" value={`${currency(mrr)}/mo`} />
            <MetricCard label="Collected to date" value={currency(collected)} />
            <MetricCard label="Awaiting payment" value={number(awaiting.length)} />
          </div>

          <Panel className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-[15px] font-semibold">{GROWTH_SYSTEM.name}</p>
              <Pill tone="signal">Only offer</Pill>
            </div>
            <p className="text-[12px] text-muted-foreground">{GROWTH_SYSTEM.positioning}</p>
            <p className="font-display text-[24px] font-semibold">
              {currency(GROWTH_SYSTEM.setupPrice)}
              <span className="text-[12px] font-normal text-muted-foreground"> one-time setup</span>
            </p>
            <p className="font-display text-[20px] font-semibold">
              + {currency(GROWTH_SYSTEM.monthlyPrice)}
              <span className="text-[12px] font-normal text-muted-foreground">/month</span>
            </p>
            <ul className="space-y-1 border-t border-border pt-3 text-[12px] text-muted-foreground">
              {GROWTH_SYSTEM.includes.map((feature) => (
                <li key={feature}>· {feature}</li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              Setup lookup key <code>{GROWTH_SYSTEM.setupPriceKey}</code> · monthly lookup key{" "}
              <code>{GROWTH_SYSTEM.monthlyPriceKey}</code>
            </p>
          </Panel>
        </>
      )}

      <p className="text-[12px] text-muted-foreground">
        Every client is on this single offer. Payment state, renewal dates and collected revenue are
        synced from verified payment webhooks — see each client's detail page for their billing
        timeline.
      </p>
    </div>
  );
}
