import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { LoadingRows, Panel, Pill, SectionHeading, MetricCard } from "@/components/app/Bits";
import { getOfferConfig, listClients, updateOfferRates } from "@/lib/admin.functions";
import { GROWTH_SYSTEM } from "@/lib/offer";
import { currency, number } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  head: () => ({
    meta: [{ title: "Plans — Revora admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
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

      <PricingControls />

      <p className="text-[12px] text-muted-foreground">
        Every client is on this single offer. Payment state, renewal dates and collected revenue are
        synced from verified payment webhooks — see each client's detail page for their billing
        timeline.
      </p>
    </div>
  );
}

function PricingControls() {
  const queryClient = useQueryClient();
  const configFn = useServerFn(getOfferConfig);
  const updateFn = useServerFn(updateOfferRates);
  const config = useQuery({ queryKey: ["admin", "offer-config"], queryFn: () => configFn({}) });

  const [setupPrice, setSetupPrice] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [notes, setNotes] = useState<string[]>([]);

  useEffect(() => {
    if (!config.data) return;
    setSetupPrice(String(config.data.setupPrice));
    setMonthlyPrice(String(config.data.monthlyPrice));
  }, [config.data]);

  const save = useMutation({
    mutationFn: () =>
      updateFn({ data: { setupPrice: Number(setupPrice), monthlyPrice: Number(monthlyPrice) } }),
    onSuccess: async (result) => {
      setNotes(result.notes);
      toast.success(`Offer updated to ${currency(result.setupPrice)} setup + ${currency(result.monthlyPrice)}/month.`);
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dirty =
    Boolean(config.data) &&
    (Number(setupPrice) !== config.data!.setupPrice ||
      Number(monthlyPrice) !== config.data!.monthlyPrice);
  const copyMismatch =
    Boolean(config.data) &&
    (config.data!.setupPrice !== config.data!.codeSetupPrice ||
      config.data!.monthlyPrice !== config.data!.codeMonthlyPrice);

  return (
    <Panel className="space-y-4">
      <SectionHeading
        eyebrow="Pricing controls"
        title="Set the rates you charge"
        action={config.isFetching ? <Pill tone="neutral">Checking Stripe…</Pill> : null}
      />
      <p className="text-[12px] text-muted-foreground">
        Saving rewrites both prices in your payment provider behind the same stable keys, so new
        checkouts charge the new amounts immediately. Existing subscribers keep the price they signed
        up on until you move them.
      </p>

      {config.isLoading ? (
        <LoadingRows rows={2} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="setup-price">One-time setup ($)</Label>
              <Input
                id="setup-price"
                inputMode="numeric"
                value={setupPrice}
                onChange={(event) => setSetupPrice(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monthly-price">Monthly ($)</Label>
              <Input
                id="monthly-price"
                inputMode="numeric"
                value={monthlyPrice}
                onChange={(event) => setMonthlyPrice(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Updating…" : "Save new rates"}
            </Button>
            {dirty ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSetupPrice(String(config.data!.setupPrice));
                  setMonthlyPrice(String(config.data!.monthlyPrice));
                }}
              >
                Reset
              </Button>
            ) : null}
          </div>

          <ul className="space-y-1 border-t border-border pt-3 text-[12px] text-muted-foreground">
            {config.data!.environments.map((env) => (
              <li key={env.environment}>
                {env.environment === "live" ? "Live payments" : "Test payments"}:{" "}
                {env.reachable
                  ? `${env.setupAmount === null ? "no setup price" : currency(env.setupAmount)} setup · ${
                      env.monthlyAmount === null
                        ? "no monthly price"
                        : `${currency(env.monthlyAmount)}/mo`
                    }`
                  : "not connected yet"}
              </li>
            ))}
          </ul>

          {copyMismatch ? (
            <p className="rounded-md border border-border bg-card/60 p-3 text-[12px] text-muted-foreground">
              Heads up: your marketing copy is still written around{" "}
              {currency(config.data!.codeSetupPrice)} setup +{" "}
              {currency(config.data!.codeMonthlyPrice)}/month. Checkout now charges the rates above —
              ask Revora to rewrite the public pricing copy so the two match.
            </p>
          ) : null}

          {notes.length ? (
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              {notes.map((note) => (
                <li key={note}>· {note}</li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </Panel>
  );
}
