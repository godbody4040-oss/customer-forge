import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function handleEvent(event: { type: string; data: { object: any } }, env: StripeEnv) {
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
      const lifecycle = await import("@/lib/billing-lifecycle.server");
      const payload =
        event.type === "customer.subscription.deleted" ? { ...object, status: "canceled" } : object;

      // Snapshot the previous row so plan changes and new cancellations are detectable.
      const { data: previous } = object?.id
        ? await admin
            .from("subscriptions")
            .select("plan_id, cancel_at_period_end, status")
            .eq("provider_subscription_id", String(object.id))
            .maybeSingle()
        : { data: null };

      const result = await syncStripeSubscription(admin, payload, env);
      if (!result.ok || !result.organizationId) {
        console.error("[payments:webhook] subscription not linked", result.reason);
        break;
      }
      const organizationId = result.organizationId;
      const stripeStatus = String(payload?.status ?? "");
      const periodEnd = payload?.items?.data?.[0]?.current_period_end ?? payload?.current_period_end;
      const accessUntil =
        typeof periodEnd === "number" ? new Date(periodEnd * 1000).toISOString() : null;

      if (event.type === "customer.subscription.created" && ["active", "trialing"].includes(stripeStatus)) {
        const priceKey = payload?.items?.data?.[0]?.price
          ? resolvePriceKey(payload.items.data[0].price)
          : null;
        const mapped = planFromPriceId(priceKey);
        await lifecycle.handleSubscriptionActivated(admin, {
          organizationId,
          stripeSubscriptionId: String(object.id),
          planId: mapped?.planId ?? (payload?.metadata?.planId as string | undefined) ?? null,
          interval: mapped?.interval ?? null,
          environment: env,
        });
      }

      if (event.type === "customer.subscription.updated") {
        const newPriceKey = payload?.items?.data?.[0]?.price
          ? resolvePriceKey(payload.items.data[0].price)
          : null;
        const newPlan = planFromPriceId(newPriceKey)?.planId ?? null;
        if (newPlan && previous?.plan_id && newPlan !== previous.plan_id) {
          await lifecycle.handlePlanChanged(admin, {
            organizationId,
            stripeSubscriptionId: String(object.id),
            previousPlanId: previous.plan_id,
            newPlanId: newPlan,
            environment: env,
          });
        }
        if (payload?.cancel_at_period_end && !previous?.cancel_at_period_end) {
          await lifecycle.handleSubscriptionCanceled(admin, {
            organizationId,
            stripeSubscriptionId: String(object.id),
            accessUntil,
            environment: env,
            phase: "scheduled",
          });
        }
      }

      if (event.type === "customer.subscription.deleted") {
        await lifecycle.handleSubscriptionCanceled(admin, {
          organizationId,
          stripeSubscriptionId: String(object.id),
          accessUntil,
          environment: env,
          phase: "ended",
        });
      }
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
          await handleEvent(event as { type: string; data: { object: any } }, rawEnv);
          return Response.json({ received: true });
        } catch (error) {
          console.error("[payments:webhook] error", (error as Error).message);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
