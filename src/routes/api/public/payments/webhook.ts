import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function handleEvent(event: { type: string; data: { object: Record<string, any> } }, env: StripeEnv) {
  const { adminClient } = await import("@/lib/payments.server");
  const { syncStripeSubscription, recordStripeTransaction, planFromPriceId, resolvePriceKey } = await import(
    "@/lib/stripe-billing.server"
  );
  const admin = await adminClient();
  const object = event.data.object;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const payload =
        event.type === "customer.subscription.deleted" ? { ...object, status: "canceled" } : object;
      const result = await syncStripeSubscription(admin, payload, env);
      if (!result.ok) console.error("[payments:webhook] subscription not linked", result.reason);
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const line = object?.lines?.data?.[0];
      const organizationId =
        (object?.subscription_details?.metadata?.organizationId as string | undefined) ??
        (line?.metadata?.organizationId as string | undefined) ??
        (object?.metadata?.organizationId as string | undefined);
      if (!organizationId) {
        console.error("[payments:webhook] invoice without organization metadata", object?.id);
        break;
      }
      const priceKey = line?.price ? resolvePriceKey(line.price) : null;
      const mapped = planFromPriceId(priceKey);
      const paid = event.type === "invoice.paid";
      await recordStripeTransaction(admin, {
        organizationId,
        stripeId: String(object?.id ?? ""),
        amount: Number(paid ? (object?.amount_paid ?? 0) : (object?.amount_due ?? 0)) / 100,
        currency: String(object?.currency ?? "usd"),
        description: `Revora ${mapped?.planId ? mapped.planId : "subscription"} ${mapped?.interval === "annual" ? "(annual)" : "(monthly)"}`,
        status: paid ? "completed" : "failed",
        planId: mapped?.planId ?? null,
        interval: mapped?.interval ?? null,
        customerEmail: (object?.customer_email as string | undefined) ?? null,
        environment: env,
        periodStart: line?.period?.start ? new Date(line.period.start * 1000).toISOString() : null,
        periodEnd: line?.period?.end ? new Date(line.period.end * 1000).toISOString() : null,
      });
      break;
    }
    case "checkout.session.completed": {
      // Subscription state arrives through customer.subscription.* events.
      if (object?.payment_status === "unpaid") break;
      break;
    }
    default:
      console.log("[payments:webhook] unhandled event", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("[payments:webhook] invalid env", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          const event = await verifyWebhook(request, rawEnv);
          await handleEvent(event as { type: string; data: { object: Record<string, any> } }, rawEnv);
          return Response.json({ received: true });
        } catch (error) {
          console.error("[payments:webhook] error", (error as Error).message);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
