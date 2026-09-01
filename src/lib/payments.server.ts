/**
 * Server-only payment bookkeeping: records verified Stripe results, applies
 * entitlements exactly once, and writes activity + notifications.
 * Stripe is the only payment processor, and payment status is only ever
 * derived from verified Stripe webhook events — never from the client.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { REVORA } from "@/lib/brand";

type Admin = SupabaseClient<Database>;
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

export async function adminClient(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

export function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

/** Structured server-side log. Never includes credentials or raw payloads. */
export function logPaymentError(scope: string, detail: Record<string, unknown>) {
  console.error(`[payments:${scope}]`, JSON.stringify({ ...detail, at: new Date().toISOString() }));
}

/**
 * Resolves the Stripe object a refund should be issued against. Stripe stores
 * the payment intent on the payment row's metadata when a checkout session or
 * invoice completes; the charge id is accepted as a fallback.
 */
export function stripeChargeRef(
  payment: PaymentRow,
): { kind: "payment_intent" | "charge"; id: string } | null {
  const meta = (payment.metadata ?? {}) as Record<string, unknown>;
  const intent = meta["stripe_payment_intent"];
  if (typeof intent === "string" && intent.startsWith("pi_"))
    return { kind: "payment_intent", id: intent };
  const charge = meta["stripe_charge_id"];
  if (typeof charge === "string" && charge.startsWith("ch_")) return { kind: "charge", id: charge };
  return null;
}

/** Activates whatever the customer paid for. Guarded by entitlement_applied. */
export async function applyEntitlement(admin: Admin, payment: PaymentRow) {
  if (payment.entitlement_applied) return;

  const { data: product } = payment.product_id
    ? await admin
        .from("payment_products")
        .select("id, name, kind, plan_id, billing_interval, entitlement_key")
        .eq("id", payment.product_id)
        .maybeSingle()
    : { data: null };

  if (product?.kind === "subscription" && product.plan_id) {
    const interval = product.billing_interval ?? "monthly";
    const periodEnd = new Date(
      Date.now() + (interval === "annual" ? 365 : 30) * 86_400_000,
    ).toISOString();

    await admin
      .from("organizations")
      .update({ plan_id: product.plan_id, subscription_status: "active" })
      .eq("id", payment.organization_id);

    const { data: existing } = await admin
      .from("subscriptions")
      .select("id")
      .eq("organization_id", payment.organization_id)
      .maybeSingle();

    const subscription = {
      organization_id: payment.organization_id,
      plan_id: product.plan_id,
      status: "active" as const,
      billing_interval: interval,
      provider_subscription_id: payment.provider_subscription_id,
      current_period_end: periodEnd,
    };
    if (existing?.id) await admin.from("subscriptions").update(subscription).eq("id", existing.id);
    else await admin.from("subscriptions").insert(subscription);

    await admin
      .from("payments")
      .update({
        period_start: new Date().toISOString(),
        period_end: periodEnd,
        plan_id: product.plan_id,
      })
      .eq("id", payment.id);
  }

  // Paid website builds unblock the build queue for that business.
  if (product?.entitlement_key === "website_build") {
    await admin
      .from("website_requests")
      .update({ status: "in_progress" })
      .eq("organization_id", payment.organization_id)
      .eq("status", "requested");
  }

  const meta = (payment.metadata ?? {}) as Record<string, unknown>;
  await admin.from("invoices").insert({
    organization_id: payment.organization_id,
    amount: payment.amount,
    status: "paid",
    provider_invoice_id:
      (typeof meta["stripe_payment_intent"] === "string" ? meta["stripe_payment_intent"] : null) ??
      (typeof meta["stripe_session_id"] === "string" ? meta["stripe_session_id"] : null),
    period_start: payment.period_start,
    period_end: payment.period_end,
  });

  await admin.from("payments").update({ entitlement_applied: true }).eq("id", payment.id);
}

/** Client notification + admin-visible audit entry, from real payment data. */
export async function logPaymentActivity(
  admin: Admin,
  payment: PaymentRow,
  kind: "completed" | "failed" | "cancelled" | "refunded",
) {
  const label = payment.description ?? payment.product_id ?? "Revora service";
  const amount = money(Number(payment.amount), payment.currency);
  const providerLabel = "card";

  const notice =
    kind === "completed"
      ? {
          title: "Payment received",
          body: `${label} — ${amount} paid by ${providerLabel}.`,
          tone: "success",
        }
      : kind === "failed"
        ? {
            title: "Payment could not be completed",
            body: `${label} — checkout was unsuccessful.`,
            tone: "warning",
          }
        : kind === "cancelled"
          ? {
              title: "Payment cancelled",
              body: `${label} — checkout was cancelled, nothing was charged.`,
              tone: "info",
            }
          : {
              title: "Refund processed",
              body: `${label} — refund issued to the original payment method.`,
              tone: "info",
            };

  await admin.from("notifications").insert({
    organization_id: payment.organization_id,
    title: notice.title,
    body: notice.body,
    kind: notice.tone,
    link: "/app/billing",
  });

  await admin.from("audit_logs").insert({
    organization_id: payment.organization_id,
    actor_id: payment.user_id,
    action: `payment.${kind}`,
    entity: "payment",
    entity_id: payment.id,
    metadata: {
      amount: Number(payment.amount),
      currency: payment.currency,
      product_id: payment.product_id,
      provider: payment.payment_provider,
      environment: payment.environment,
      stripe_reference: stripeChargeRef(payment)?.id ?? null,
      admin_contact: REVORA.email,
    },
  });
}
