/**
 * Server-only payment bookkeeping: records verified PayPal results, applies
 * entitlements exactly once, and writes activity + notifications.
 * Payment status is only ever derived from PayPal responses — never the client.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { mapOrderStatus, type PayPalOrder } from "@/lib/paypal.server";
import { REVORA } from "@/lib/brand";

type Admin = SupabaseClient<Database>;
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

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

export function captureFromOrder(order: PayPalOrder) {
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  return capture ? { id: capture.id, status: capture.status, amount: capture.amount } : null;
}

/**
 * Applies the verified result of an order to its payment row. Idempotent:
 * a payment already marked completed is never re-fulfilled.
 */
export async function recordOrderResult(
  admin: Admin,
  payment: PaymentRow,
  order: PayPalOrder,
): Promise<{ payment: PaymentRow; fulfilled: boolean }> {
  const capture = captureFromOrder(order);
  const status = (capture?.status === "COMPLETED"
    ? "completed"
    : capture?.status === "DECLINED"
      ? "failed"
      : mapOrderStatus(order.status)) as PaymentStatus;

  const alreadyDone = payment.status === "completed" && payment.entitlement_applied;
  const patch: Database["public"]["Tables"]["payments"]["Update"] = {
    status,
    paypal_capture_id: capture?.id ?? payment.paypal_capture_id,
    customer_email: order.payer?.email_address ?? payment.customer_email,
    completed_at: status === "completed" ? (payment.completed_at ?? new Date().toISOString()) : payment.completed_at,
    failure_reason: status === "failed" ? (capture?.status ?? "Capture declined") : null,
  };

  const { data: updated } = await admin
    .from("payments")
    .update(patch)
    .eq("id", payment.id)
    .select("*")
    .single();

  const row = (updated ?? payment) as PaymentRow;
  if (status !== "completed" || alreadyDone) {
    if (status === "failed") await logPaymentActivity(admin, row, "failed");
    return { payment: row, fulfilled: false };
  }

  await applyEntitlement(admin, row);
  await logPaymentActivity(admin, row, "completed");
  return { payment: row, fulfilled: true };
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
    const periodEnd = new Date(Date.now() + (interval === "annual" ? 365 : 30) * 86_400_000).toISOString();

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
      .update({ period_start: new Date().toISOString(), period_end: periodEnd, plan_id: product.plan_id })
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
      payment.paypal_capture_id ??
      payment.paypal_order_id ??
      (typeof meta.stripe_payment_intent === "string" ? meta.stripe_payment_intent : null) ??
      (typeof meta.stripe_session_id === "string" ? meta.stripe_session_id : null),
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
  const providerLabel = payment.payment_provider === "stripe" ? "card" : "PayPal";

  const notice =
    kind === "completed"
      ? { title: "Payment received", body: `${label} — ${amount} paid by ${providerLabel}.`, tone: "success" }
      : kind === "failed"
        ? { title: "Payment could not be completed", body: `${label} — checkout was unsuccessful.`, tone: "warning" }
        : kind === "cancelled"
          ? { title: "Payment cancelled", body: `${label} — checkout was cancelled, nothing was charged.`, tone: "info" }
          : { title: "Refund processed", body: `${label} — refund issued via PayPal.`, tone: "info" };

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
      paypal_order_id: payment.paypal_order_id,
      paypal_capture_id: payment.paypal_capture_id,
      admin_contact: REVORA.email,
    },
  });
}
