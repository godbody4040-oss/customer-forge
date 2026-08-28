import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Receipt } from "lucide-react";
import { EmptyState, LoadingRows, MetricCard, Panel, Pill, SectionHeading } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { PayPalCheckout } from "@/components/app/PayPalCheckout";
import { usePaymentConfig, usePaymentProducts, usePayments, type PaymentProduct } from "@/lib/payments.hooks";
import { useWorkspace } from "@/lib/use-tenant";
import { canManage } from "@/lib/domain";
import { REVORA } from "@/lib/brand";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/app/billing")({
  head: () => ({
    meta: [
      { title: "Billing & payments — Revora" },
      { name: "description", content: "Your Revora plan, payment history and secure PayPal checkout." },
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
  const [selected, setSelected] = useState<PaymentProduct | null>(null);
  const queryClient = useQueryClient();

  const rows = payments ?? [];
  const paid = rows.filter((p) => p.status === "completed");
  const paidTotal = paid.reduce((sum, p) => sum + Number(p.amount), 0);
  const pending = rows.filter((p) => p.status === "pending" || p.status === "approved").length;

  const services = (products ?? []).filter((p) => p.kind !== "subscription");
  const plans = (products ?? []).filter((p) => p.kind === "subscription");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Billing &amp; payments</p>
          <h1 className="mt-1 font-display text-[24px] font-semibold">Your plan and payments</h1>
        </div>
        {config ? (
          <Pill tone={config.configured && config.environment === "live" ? "signal" : "neutral"}>
            {!config.configured
              ? "PayPal setup required"
              : config.environment === "live"
                ? "PayPal live"
                : "PayPal sandbox"}
          </Pill>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Current plan" value={org?.plan_id ? org.plan_id : "No plan"} hint={org?.subscription_status ?? ""} />
        <MetricCard label="Paid to date" value={money(paidTotal, "USD")} hint={`${paid.length} payment${paid.length === 1 ? "" : "s"}`} />
        <MetricCard label="Awaiting payment" value={String(pending)} hint="Started but not confirmed" />
      </div>

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
        <SectionHeading eyebrow="Plans" title="Monthly software plans" />
        {plans.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {plans.map((product) => (
              <li key={product.id} className="rounded-md border border-border p-4">
                <p className="text-[14px] font-medium">{product.name}</p>
                <p className="tnum mt-1 text-[18px] font-semibold">{money(product.amount, product.currency)}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {product.billing_interval === "annual" ? "One year of access" : "One month of access"}
                </p>
                <Button
                  variant={org?.plan_id === product.plan_id ? "outline" : "signal"}
                  size="sm"
                  className="mt-3"
                  disabled={!manage}
                  onClick={() => setSelected(product)}
                >
                  {org?.plan_id === product.plan_id ? "Renew / extend" : "Upgrade with PayPal"}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[13px] text-muted-foreground">No plans are available for purchase yet.</p>
        )}
        <p className="mt-4 text-[12px] text-muted-foreground">
          Plans are paid term by term — there is no automatic recurring charge, so nothing renews without you.
          Questions: {REVORA.email} · {REVORA.phoneDisplay ?? REVORA.phone}
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
