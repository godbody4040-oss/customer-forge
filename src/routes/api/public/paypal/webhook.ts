import { createFileRoute } from "@tanstack/react-router";

/**
 * PayPal webhook receiver. Every request is verified with PayPal before any
 * record changes, and every event id is stored once so replays are ignored.
 */
export const Route = createFileRoute("/api/public/paypal/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { paypalConfig, verifyPayPalWebhook, getPayPalOrder } = await import("@/lib/paypal.server");
        const { adminClient, recordOrderResult, logPaymentActivity, logPaymentError } = await import(
          "@/lib/payments.server"
        );

        const config = paypalConfig();
        // PayPal isn't connected on this environment. Acknowledge and drop the
        // event: a 5xx here makes PayPal retry forever and shows up as an app
        // error, when in fact there is simply nothing to process.
        if (!config)
          return new Response(JSON.stringify({ ignored: "paypal_not_configured" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });

        const raw = await request.text();
        const verification = await verifyPayPalWebhook(config, request.headers, raw);
        if (verification !== "SUCCESS") {
          logPaymentError("webhook-verify", { verification });
          return new Response("Invalid signature", { status: 401 });
        }

        let event: {
          id?: string;
          event_type?: string;
          resource?: {
            id?: string;
            custom_id?: string;
            status?: string;
            supplementary_data?: { related_ids?: { order_id?: string } };
          };
        };
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        if (!event.id || !event.event_type) return new Response("Bad request", { status: 400 });

        const admin = await adminClient();
        const resource = event.resource ?? {};
        const orderId = resource.supplementary_data?.related_ids?.order_id ?? resource.id ?? null;

        const { data: payment } = resource.custom_id
          ? await admin.from("payments").select("*").eq("id", resource.custom_id).maybeSingle()
          : orderId
            ? await admin.from("payments").select("*").eq("paypal_order_id", orderId).maybeSingle()
            : { data: null };

        // Idempotency gate: a duplicate event id is recorded but never processed twice.
        const { error: dupe } = await admin.from("payment_events").insert({
          provider_event_id: event.id,
          event_type: event.event_type,
          resource_id: resource.id ?? null,
          verification_status: verification,
          payment_id: payment?.id ?? null,
          organization_id: payment?.organization_id ?? null,
          payload: { event_type: event.event_type, resource_status: resource.status ?? null },
        });
        if (dupe) return new Response("Already processed", { status: 200 });

        if (!payment) return new Response("ok", { status: 200 });

        try {
          if (event.event_type.startsWith("PAYMENT.CAPTURE.REFUND") || event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
            const { data: updated } = await admin
              .from("payments")
              .update({ status: "refunded", refund_status: resource.status ?? "COMPLETED", refunded_amount: payment.amount })
              .eq("id", payment.id)
              .select("*")
              .single();
            if (updated) await logPaymentActivity(admin, updated, "refunded");
          } else if (event.event_type.startsWith("CUSTOMER.DISPUTE")) {
            await admin.from("payments").update({ status: "disputed" }).eq("id", payment.id);
          } else if (event.event_type === "PAYMENT.CAPTURE.DENIED" || event.event_type === "PAYMENT.CAPTURE.DECLINED") {
            const { data: updated } = await admin
              .from("payments")
              .update({ status: "failed", failure_reason: resource.status ?? "Capture denied" })
              .eq("id", payment.id)
              .select("*")
              .single();
            if (updated) await logPaymentActivity(admin, updated, "failed");
          } else if (payment.paypal_order_id) {
            // Re-read the order from PayPal — the source of truth for status.
            const order = await getPayPalOrder(config, payment.paypal_order_id);
            await recordOrderResult(admin, payment, order);
          }

          await admin.from("payment_events").update({ processed: true }).eq("provider_event_id", event.id);
          return new Response("ok", { status: 200 });
        } catch (error) {
          logPaymentError("webhook-process", {
            eventType: event.event_type,
            paymentId: payment.id,
            message: error instanceof Error ? error.message : "unknown",
          });
          return new Response("Processing error", { status: 500 });
        }
      },
    },
  },
});
