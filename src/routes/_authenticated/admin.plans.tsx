import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoadingRows, Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { listClients } from "@/lib/admin.functions";
import { usePlans } from "@/lib/queries";
import { currency, number } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  component: AdminPlans,
});

function AdminPlans() {
  const { data: plans, isLoading } = usePlans();
  const clientsFn = useServerFn(listClients);
  const clients = useQuery({ queryKey: ["admin", "clients"], queryFn: () => clientsFn({}) });

  const counts = new Map<string, number>();
  for (const client of clients.data ?? []) {
    if (client.plan_id) counts.set(client.plan_id, (counts.get(client.plan_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-5">
      <SectionHeading eyebrow="Plans" title="Subscription plans" />
      {isLoading ? (
        <LoadingRows rows={3} />
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {(plans ?? []).map((plan) => (
            <Panel key={plan.id} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-[15px] font-semibold">{plan.name}</p>
                {plan.is_featured ? <Pill tone="signal">Featured</Pill> : null}
              </div>
              <p className="text-[12px] text-muted-foreground">{plan.tagline}</p>
              <p className="font-display text-[24px] font-semibold">
                {currency(Number(plan.monthly_price))}
                <span className="text-[12px] font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {currency(Number(plan.annual_price))}/yr billed annually
              </p>
              <ul className="space-y-1 text-[12px] text-muted-foreground">
                {(plan.features ?? []).map((feature: string) => (
                  <li key={feature}>· {feature}</li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-border pt-2 text-[12px]">
                <span className="text-muted-foreground">Clients on plan</span>
                <span>{number(counts.get(plan.id) ?? 0)}</span>
              </div>
              {!plan.is_active ? <Pill tone="neutral">Inactive</Pill> : null}
            </Panel>
          ))}
        </div>
      )}
      <p className="text-[12px] text-muted-foreground">
        Assign a plan to a client from their detail page. Plan pricing and features are shared platform-wide and
        drive the public pricing page.
      </p>
    </div>
  );
}
