import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public, non-secret PayPal client config (client id is safe in the browser). */
export const getPaymentConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { paypalConfig } = await import("@/lib/paypal.server");
  const config = paypalConfig();
  if (!config)
    return {
      configured: false as const,
      environment: "sandbox" as const,
      clientId: null,
      webhookConfigured: false,
    };
  return {
    configured: true as const,
    environment: config.environment,
    clientId: config.clientId,
    webhookConfigured: !!config.webhookId,
  };
});

/** Creates a Revora payment row + a real PayPal order for the signed-in member. */
export const createPaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; productId: string }) => {
    const organizationId = String(input?.organizationId ?? "");
    const productId = String(input?.productId ?? "").slice(0, 80);
    if (!/^[0-9a-f-]{36}$/i.test(organizationId)) throw new Error("Invalid workspace");
    if (!productId) throw new Error("Choose a service to pay for");
    return { organizationId, productId };
  })
  .handler(async ({ data, context }) => {
    const { paypalConfig, createPayPalOrder } = await import("@/lib/paypal.server");
    const { adminClient, logPaymentError } = await import("@/lib/payments.server");
    const config = paypalConfig();
    if (!config) return { ok: false as const, error: "PayPal is not configured yet." };

    // RLS proves membership: a non-member cannot read this organization.
    const { data: org } = await context.supabase
      .from("organizations")
      .select("id, name")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (!org) return { ok: false as const, error: "You do not have access to this workspace." };

    const admin = await adminClient();
    const { data: product } = await admin
      .from("payment_products")
      .select("id, name, description, amount, currency, kind, plan_id, billing_interval, is_active")
      .eq("id", data.productId)
      .maybeSingle();
    if (!product?.is_active) return { ok: false as const, error: "That service is not available." };

    const { data: payment, error: insertError } = await admin
      .from("payments")
      .insert({
        organization_id: data.organizationId,
        user_id: context.userId,
        product_id: product.id,
        plan_id: product.plan_id,
        amount: product.amount,
        currency: product.currency,
        description: product.name,
        billing_interval: product.billing_interval,
        environment: config.environment,
        status: "created",
        customer_email: (context.claims as { email?: string } | null)?.email ?? null,
      })
      .select("id, amount, currency")
      .single();
    if (insertError || !payment) {
      logPaymentError("create-record", { productId: product.id, message: insertError?.message });
      return { ok: false as const, error: "We could not start that payment. Please try again." };
    }

    try {
      const order = await createPayPalOrder(config, {
        referenceId: payment.id,
        amount: Number(payment.amount).toFixed(2),
        currency: payment.currency,
        description: `${product.name} — ${org.name}`,
        brandName: "Revora Growth Systems",
      });
      await admin
        .from("payments")
        .update({ paypal_order_id: order.id, status: "pending" })
        .eq("id", payment.id);
      return { ok: true as const, orderId: order.id, paymentId: payment.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      logPaymentError("create-order", { paymentId: payment.id, message });
      await admin
        .from("payments")
        .update({ status: "failed", failure_reason: "Order creation failed" })
        .eq("id", payment.id);
      return {
        ok: false as const,
        error: "PayPal could not start this checkout. Please try again.",
      };
    }
  });

/** Captures + verifies an approved order server-side. The only path to "paid". */
export const capturePaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    const orderId = String(input?.orderId ?? "")
      .replace(/[^A-Za-z0-9-]/g, "")
      .slice(0, 40);
    if (!orderId) throw new Error("Missing PayPal order");
    return { orderId };
  })
  .handler(async ({ data, context }) => {
    const { paypalConfig, capturePayPalOrder, getPayPalOrder } =
      await import("@/lib/paypal.server");
    const { adminClient, recordOrderResult, logPaymentError } =
      await import("@/lib/payments.server");
    const config = paypalConfig();
    if (!config) return { ok: false as const, error: "PayPal is not configured yet." };

    // Membership check through RLS before touching the record with admin rights.
    const { data: visible } = await context.supabase
      .from("payments")
      .select("id")
      .eq("paypal_order_id", data.orderId)
      .maybeSingle();
    if (!visible) return { ok: false as const, error: "Payment not found for this workspace." };

    const admin = await adminClient();
    const { data: payment } = await admin
      .from("payments")
      .select("*")
      .eq("id", visible.id)
      .single();
    if (!payment) return { ok: false as const, error: "Payment not found." };

    try {
      // Already captured (double submit / webhook won the race): re-read, never re-charge.
      const order =
        payment.status === "completed"
          ? await getPayPalOrder(config, data.orderId)
          : await capturePayPalOrder(config, data.orderId);
      const result = await recordOrderResult(admin, payment, order);
      return {
        ok: true as const,
        status: result.payment.status,
        paymentId: result.payment.id,
        captureId: result.payment.paypal_capture_id,
        amount: Number(result.payment.amount),
        currency: result.payment.currency,
        product: result.payment.description,
        completedAt: result.payment.completed_at,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      logPaymentError("capture", { paymentId: payment.id, message });
      const order = await getPayPalOrder(config, data.orderId).catch(() => null);
      if (order) {
        const result = await recordOrderResult(admin, payment, order);
        if (result.payment.status === "completed") {
          return {
            ok: true as const,
            status: result.payment.status,
            paymentId: result.payment.id,
            captureId: result.payment.paypal_capture_id,
            amount: Number(result.payment.amount),
            currency: result.payment.currency,
            product: result.payment.description,
            completedAt: result.payment.completed_at,
          };
        }
      }
      await admin
        .from("payments")
        .update({ status: "failed", failure_reason: "Capture failed" })
        .eq("id", payment.id);
      return { ok: false as const, error: "Your payment was not completed. Please try again." };
    }
  });

/** Customer abandoned PayPal checkout — nothing is charged or activated. */
export const cancelPaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => ({
    orderId: String(input?.orderId ?? "")
      .replace(/[^A-Za-z0-9-]/g, "")
      .slice(0, 40),
  }))
  .handler(async ({ data, context }) => {
    if (!data.orderId) return { ok: false as const };
    const { data: visible } = await context.supabase
      .from("payments")
      .select("id, status")
      .eq("paypal_order_id", data.orderId)
      .maybeSingle();
    if (!visible || visible.status === "completed") return { ok: false as const };

    const { adminClient, logPaymentActivity } = await import("@/lib/payments.server");
    const admin = await adminClient();
    const { data: payment } = await admin
      .from("payments")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", visible.id)
      .select("*")
      .single();
    if (payment) await logPaymentActivity(admin, payment, "cancelled");
    return { ok: true as const };
  });

/** Platform admin refund. Verified against PayPal before the record changes. */
export const refundPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paymentId: string; amount?: number }) => {
    const paymentId = String(input?.paymentId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new Error("Invalid payment");
    const amount = typeof input?.amount === "number" && input.amount > 0 ? input.amount : undefined;
    return { paymentId, amount };
  })
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "super_admin")) throw new Error("Forbidden");

    const { paypalConfig, refundPayPalCapture } = await import("@/lib/paypal.server");
    const { adminClient, logPaymentActivity, logPaymentError } =
      await import("@/lib/payments.server");
    const config = paypalConfig();
    if (!config) return { ok: false as const, error: "PayPal is not configured yet." };

    const admin = await adminClient();
    const { data: payment } = await admin
      .from("payments")
      .select("*")
      .eq("id", data.paymentId)
      .single();
    if (
      !payment?.paypal_capture_id ||
      (payment.status !== "completed" && payment.status !== "partially_refunded")
    ) {
      return { ok: false as const, error: "Only completed PayPal payments can be refunded." };
    }
    const remaining = Number(payment.amount) - Number(payment.refunded_amount ?? 0);
    if (remaining <= 0.005)
      return { ok: false as const, error: "This payment has already been fully refunded." };
    if (data.amount && data.amount > remaining + 0.005) {
      return {
        ok: false as const,
        error: `The most that can still be refunded is ${remaining.toFixed(2)}.`,
      };
    }

    try {
      const refund = await refundPayPalCapture(
        config,
        payment.paypal_capture_id,
        data.amount
          ? { value: data.amount.toFixed(2), currency_code: payment.currency }
          : undefined,
      );
      if (refund.status !== "COMPLETED" && refund.status !== "PENDING") {
        return { ok: false as const, error: `PayPal refund status: ${refund.status}` };
      }
      const refunded = Number(payment.refunded_amount) + (data.amount ?? Number(payment.amount));
      const full = refunded >= Number(payment.amount) - 0.005;
      const { data: updated } = await admin
        .from("payments")
        .update({
          status: full ? "refunded" : "partially_refunded",
          refund_status: refund.status,
          refunded_amount: refunded,
        })
        .eq("id", payment.id)
        .select("*")
        .single();
      if (updated) await logPaymentActivity(admin, updated, "refunded");
      return { ok: true as const, status: full ? "refunded" : "partially_refunded" };
    } catch (error) {
      logPaymentError("refund", {
        paymentId: payment.id,
        message: error instanceof Error ? error.message : "unknown",
      });
      return { ok: false as const, error: "The refund could not be completed at PayPal." };
    }
  });
