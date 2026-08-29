import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, ExternalLink, Receipt } from "lucide-react";
import { EmptyState, LoadingRows, MetricCard, Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { PayPalCheckout } from "@/components/app/PayPalCheckout";
import { StripeCheckout } from "@/components/app/StripeCheckout";
import { PaymentTestModeBanner } from "@/components/app/PaymentTestModeBanner";
import { usePaymentConfig, usePaymentProducts, usePayments, type PaymentProduct } from "@/lib/payments.hooks";
import { useBillingState, usePlans } from "@/lib/stripe.hooks";
import { createBillingPortalSession } from "@/lib/stripe.functions";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";
import { useWorkspace } from "@/lib/use-tenant";
import { canManage } from "@/lib/use-tenant";
import { REVORA } from "@/lib/brand";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/billing")({
  head: () => ({
    meta: [
      { title: "Billing & payments — Revora" },
      { name: "description", content: "Your Revora plan, subscription and secure card, Apple Pay and Cash App Pay checkout." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

const STATUS_LABEL: Record<string, string> = {
  created: "Started",
  pending: "Pending",
  approved: "Approved",
  completed: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  partially_refunded: "Partly refunded",
  disputed: "Disputed",
};

function BillingPage() {
  const { data: ws } = useWorkspace();
  const org = ws?.workspace?.organization;
  const orgId = ws?.workspace?.organizationId;
  const manage = canManage(ws?.workspace?.role ?? "viewer");
  const { data: products, isLoading: loadingProducts } = usePaymentProducts();
  const { data: payments, isLoading: loadingPayments } = usePayments(orgId);
  const { data: config } = usePaymentConfig();
  const { data: subscriptionPlans, isLoading: loadingPlans } = usePlans();
  const { data: billing } = useBillingState(orgId);
  const [selected, setSelected] = useState<PaymentProduct | null>(null);
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState<{ id: string; name: string } | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const queryClient = useQueryClient();
  const cardsReady = isPaymentsConfigured();

  const rows = payments ?? [];
  const paid = rows.filter((p) => p.status === "completed");
  const paidTotal = paid.reduce((sum, p) => sum + Number(p.amount), 0);
  const pending = rows.filter((p) => p.status === "pending" || p.status === "approved").length;

  const services = (products ?? []).filter((p) => p.kind !== "subscription");
  const subscription = billing?.subscription ?? null;
  const currentPlanId = subscription?.plan_id ?? org?.plan_id ?? null;
  const currentPlan = (subscriptionPlans ?? []).find((plan) => plan.id === currentPlanId) ?? null;
  const currentPrice = currentPlan
    ? subscription?.billing_interval === "annual"
      ? currentPlan.annual_price
      : currentPlan.monthly_price
    : null;

  const openPortal = async () => {
    if (!orgId) return;
    setPortalBusy(true);
    try {
      const result = await createBillingPortalSession({
        data: { organizationId: orgId, returnUrl: `${window.location.origin}/app/billing`, environment: getStripeEnvironment() },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank", "noopener");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPortalBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Billing &amp; payments</p>
          <h1 className="mt-1 font-display text-[24px] font-semibold">Your plan and payments</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={subscription?.status === "active" ? "signal" : "neutral"}>
            {subscription
              ? `${subscription.status.replace("_", " ")} · ${subscription.billing_interval}`
              : "No subscription"}
          </Pill>
          {config?.configured ? <Pill tone="neutral">PayPal {config.environment}</Pill> : null}
        </div>
      </div>

      <PaymentTestModeBanner />

      {subscription?.status === "past_due" ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          <p className="font-medium">Your last payment did not go through.</p>
          <p className="mt-1">
            Update your card to keep your workspace active — access continues while the payment provider retries.
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={openPortal} disabled={portalBusy || !manage}>
            <ExternalLink className="size-4" /> {portalBusy ? "Opening…" : "Update payment method"}
          </Button>
        </div>
      ) : null}

      {subscription?.cancel_at_period_end ? (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">
          Cancellation is scheduled. You keep full access until{" "}
          {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "the end of the paid period"}
          , then the workspace becomes read-only.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Current plan" value={currentPlanId ?? "No plan"} hint={subscription?.status ?? org?.subscription_status ?? ""} />
        <MetricCard
          label="Plan price"
          value={currentPrice != null ? money(currentPrice, "USD") : "—"}
          hint={subscription ? `billed ${subscription.billing_interval}` : "no active subscription"}
        />
        <MetricCard label="Paid to date" value={money(paidTotal, "USD")} hint={`${paid.length} payment${paid.length === 1 ? "" : "s"}`} />
        <MetricCard
          label={subscription?.cancel_at_period_end ? "Access ends" : subscription?.status === "trialing" ? "Trial ends" : "Renews"}
          value={
            subscription?.status === "trialing" && subscription.trial_ends_at
              ? new Date(subscription.trial_ends_at).toLocaleDateString()
              : subscription?.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString()
                : org?.trial_ends_at
                  ? new Date(org.trial_ends_at).toLocaleDateString()
                  : "—"
          }
          hint={subscription?.cancel_at_period_end ? "Cancellation scheduled" : "Next billing date"}
        />
      </div>

      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeading eyebrow="Subscription" title="Choose your Revora plan" />
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border p-0.5">
              {(["monthly", "annual"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setInterval(option)}
                  aria-pressed={interval === option}
                  className={`rounded px-3 py-1.5 text-[12px] capitalize ${interval === option ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {option}
                </button>
              ))}
            </div>
            {subscription?.provider_subscription_id ? (
              <Button variant="outline" size="sm" onClick={openPortal} disabled={portalBusy || !manage}>
                <ExternalLink className="size-4" /> {portalBusy ? "Opening…" : "Manage subscription"}
              </Button>
            ) : null}
          </div>
        </div>

        {!cardsReady ? (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
            Card checkout is not configured for this build yet, so no payment can be taken. Finish payment go-live in
            your Revora project settings.
          </p>
        ) : loadingPlans ? (
          <LoadingRows rows={3} />
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {(subscriptionPlans ?? []).map((plan) => {
              const price = interval === "annual" ? plan.annual_price : plan.monthly_price;
              const isCurrent = currentPlanId === plan.id && billing?.active;
              return (
                <li
                  key={plan.id}
                  className={`rounded-md border p-4 ${plan.is_featured ? "border-primary/50" : "border-border"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-medium">{plan.name}</p>
                    {isCurrent ? <Pill tone="signal">Current</Pill> : null}
                  </div>
                  <p className="tnum mt-1 text-[20px] font-semibold">{money(price, "USD")}</p>
                  <p className="text-[12px] text-muted-foreground">
                    per {interval === "annual" ? "year" : "month"}
                  </p>
                  {plan.tagline ? <p className="mt-2 text-[12px] text-muted-foreground">{plan.tagline}</p> : null}
                  <ul className="mt-3 space-y-1 text-[12px] text-muted-foreground">
                    {(plan.features ?? []).slice(0, 5).map((feature) => (
                      <li key={feature}>· {feature}</li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? "outline" : "signal"}
                    size="sm"
                    className="mt-3 w-full"
                    disabled={!manage || !orgId}
                    onClick={() => setCheckoutPlan({ id: plan.id, name: plan.name })}
                  >
                    <CreditCard className="size-4" />
                    {isCurrent ? "Change billing" : currentPlanId ? "Switch to this plan" : "Subscribe"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-[12px] text-muted-foreground">
          Checkout accepts cards, Apple Pay, Google Pay and Cash App Pay where the provider and your device support
          them. Cancel any time from Manage subscription — access continues until the end of the paid period.
        </p>
      </Panel>

      {checkoutPlan && orgId ? (
        <StripeCheckout
          organizationId={orgId}
          planId={checkoutPlan.id}
          planName={checkoutPlan.name}
          interval={interval}
          onClose={() => {
            setCheckoutPlan(null);
            void queryClient.invalidateQueries({ queryKey: ["billing_state", orgId] });
            void queryClient.invalidateQueries({ queryKey: ["payments", orgId] });
            void queryClient.invalidateQueries({ queryKey: ["workspace"] });
          }}
        />
      ) : null}

      {selected && orgId ? (
        <PayPalCheckout
          organizationId={orgId}
          product={selected}
          onPaid={() => {
            void queryClient.invalidateQueries({ queryKey: ["payments", orgId] });
            void queryClient.invalidateQueries({ queryKey: ["workspace"] });
            void queryClient.invalidateQueries({ queryKey: ["notifications", orgId] });
          }}
          onClose={() => setSelected(null)}
        />
      ) : null}

      <Panel className="p-5">
        <SectionHeading eyebrow="Services" title="Revora services" />
        {loadingProducts ? (
          <LoadingRows rows={3} />
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {services.map((product) => (
              <li key={product.id} className="rounded-md border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-medium">{product.name}</p>
                    {product.description ? (
                      <p className="mt-1 text-[12px] text-muted-foreground">{product.description}</p>
                    ) : null}
                  </div>
                  <p className="tnum text-[15px] font-semibold">{money(product.amount, product.currency)}</p>
                </div>
                <Button
                  variant="signal"
                  size="sm"
                  className="mt-3"
                  disabled={!manage}
                  onClick={() => setSelected(product)}
                >
                  <CreditCard className="size-4" /> Pay with PayPal
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="p-5">
        <SectionHeading eyebrow="Support" title="Billing questions" />
        <p className="mt-3 text-[13px] text-muted-foreground">
          One-off services above are charged once via PayPal. Software plans are billed as a subscription and can be
          changed or cancelled at any time. Questions: {REVORA.email} · {REVORA.phoneDisplay ?? REVORA.phone}
        </p>
      </Panel>


      <Panel className="p-5">
        <SectionHeading eyebrow="History" title="Payment history" />
        {loadingPayments ? (
          <LoadingRows rows={3} />
        ) : rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<Receipt className="size-5" />}
              title="No payments yet."
              description="When you pay for a Revora service, the confirmed transaction appears here."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3">Date</th>
                  <th className="pb-2 pr-3">Service</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Provider</th>
                  <th className="pb-2">Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((payment) => (
                  <tr key={payment.id} className="border-t border-border">
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {new Date(payment.completed_at ?? payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 pr-3">{payment.description ?? payment.product_id ?? "Revora service"}</td>
                    <td className="tnum py-2.5 pr-3">{money(Number(payment.amount), payment.currency)}</td>
                    <td className="py-2.5 pr-3">
                      <Pill tone={payment.status === "completed" ? "signal" : "neutral"}>
                        {STATUS_LABEL[payment.status] ?? payment.status}
                      </Pill>
                    </td>
                    <td className="py-2.5 pr-3 capitalize">{payment.payment_provider}</td>
                    <td className="py-2.5 font-mono text-[11px]">
                      {payment.paypal_capture_id ?? payment.paypal_order_id ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
