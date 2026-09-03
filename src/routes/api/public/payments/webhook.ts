import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

// Raw Stripe event JSON; each case narrows the fields it needs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleEvent(event: { type: string; data: { object: any } }, env: StripeEnv) {
  const { adminClient } = await import("@/lib/payments.server");
  const { syncStripeSubscription, recordStripeTransaction, planFromPriceId, resolvePriceKey } =
    await import("@/lib/stripe-billing.server");
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
            .eq("environment", env)
            .maybeSingle()
        : { data: null };

      const result = await syncStripeSubscription(admin, payload, env);
      if (!result.ok || !result.organizationId) {
        console.error("[payments:webhook] subscription not linked", result.reason);
        break;
      }
      const organizationId = result.organizationId;
      const stripeStatus = String(payload?.status ?? "");
      const periodEnd =
        payload?.items?.data?.[0]?.current_period_end ?? payload?.current_period_end;
      const accessUntil =
        typeof periodEnd === "number" ? new Date(periodEnd * 1000).toISOString() : null;

      if (
        event.type === "customer.subscription.created" &&
        ["active", "trialing"].includes(stripeStatus)
      ) {
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
      const md = (object?.metadata ?? {}) as Record<string, string | undefined>;

      // Revora Growth System: one subscription session that also carries the
      // one-time setup line. Setup is only marked paid when Stripe confirms it.
      if (md["kind"] === "growth_system" && md["organizationId"]) {
        if (object?.payment_status === "unpaid") break;
        const organizationId = md["organizationId"];
        await admin
          .from("organizations")
          .update({
            setup_paid_at: new Date().toISOString(),
            setup_checkout_session_id: String(object?.id ?? ""),
            plan_id: md["planId"] ?? null,
          })
          .eq("id", organizationId);
        await recordStripeTransaction(admin, {
          organizationId,
          stripeId: `setup:${String(object?.id ?? "")}`,
          // Trust the amount Stripe actually charged, not request metadata.
          amount:
            typeof object?.amount_total === "number"
              ? Number(object.amount_total) / 100
              : Number(md["setupAmount"] ?? 0),
          currency: String(object?.currency ?? "usd"),
          description: "Revora Growth System setup fee",
          status: "completed",
          planId: md["planId"] ?? null,
          interval: "monthly",
          customerEmail: (object?.customer_details?.email as string | undefined) ?? null,
          environment: env,
        });
        break;
      }

      // Subscription state otherwise arrives through customer.subscription.* events.
      if (object?.mode !== "payment") break;
      if (md["kind"] !== "service" || !md["paymentId"]) break;
      if (object?.payment_status !== "paid") break;

      const { data: payment } = await admin
        .from("payments")
        .select("*")
        .eq("id", md["paymentId"])
        .maybeSingle();
      if (!payment || payment.status === "completed") break;

      const { data: updated } = await admin
        .from("payments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          customer_email:
            (object?.customer_details?.email as string | undefined) ?? payment.customer_email,
          metadata: {
            ...((payment.metadata as Record<string, unknown> | null) ?? {}),
            stripe_session_id: String(object?.id ?? ""),
            stripe_payment_intent:
              typeof object?.payment_intent === "string" ? object.payment_intent : null,
          },
        })
        .eq("id", payment.id)
        .select("*")
        .single();

      if (updated) {
        const { applyEntitlement, logPaymentActivity } = await import("@/lib/payments.server");
        await applyEntitlement(admin, updated);
        await logPaymentActivity(admin, updated, "completed");
      }
      break;
    }
    case "checkout.session.expired": {
      const md = (object?.metadata ?? {}) as Record<string, string | undefined>;
      if (md["kind"] !== "service" || !md["paymentId"]) break;
      const { data: payment } = await admin
        .from("payments")
        .select("*")
        .eq("id", md["paymentId"])
        .maybeSingle();
      if (!payment || payment.status === "completed") break;
      const { data: failed } = await admin
        .from("payments")
        .update({ status: "failed", failure_reason: "Checkout session expired" })
        .eq("id", payment.id)
        .select("*")
        .single();
      if (failed) {
        const { logPaymentActivity } = await import("@/lib/payments.server");
        await logPaymentActivity(admin, failed, "failed");
      }
      break;
    }
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      // Bookkeeping/observability only — activation always comes from the
      // checkout session and subscription events above, never from here.
      const organizationId = (object?.metadata?.organizationId as string | undefined) ?? null;
      const succeeded = event.type === "payment_intent.succeeded";
      if (organizationId) {
        await admin.from("audit_logs").insert({
          organization_id: organizationId,
          action: `payment_intent.${succeeded ? "succeeded" : "failed"}`,
          entity: "payment_intent",
          entity_id: String(object?.id ?? ""),
          metadata: {
            provider: "stripe",
            environment: env,
            amount: Number(object?.amount ?? 0) / 100,
            currency: String(object?.currency ?? "usd"),
            failure_reason: succeeded
              ? null
              : ((object?.last_payment_error?.message as string | undefined) ??
                "Card payment failed"),
          },
        });
        if (!succeeded) {
          await admin.from("notifications").insert({
            organization_id: organizationId,
            title: "Card payment failed",
            body: `${(object?.last_payment_error?.message as string | undefined) ?? "The card payment did not go through."} Update your payment method to activate or keep your Revora system.`,
            kind: "warning",
            link: "/app/billing",
          });
        }
      }
      break;
    }
    default:
      // Unhandled event types are acknowledged without side effects.
      break;
  }
}

/**
 * Event-level idempotency: Stripe delivers at least once, so a verified event
 * id is claimed in `payment_events` (unique per provider) before any side
 * effect runs. A duplicate delivery short-circuits with 200.
 */
async function claimEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: { id?: string; type: string; data: { object: any } },
  env: StripeEnv,
) {
  const { adminClient } = await import("@/lib/payments.server");
  const admin = await adminClient();
  const eventId = String(event.id ?? "");
  if (!eventId) return { claimed: true as const, admin, eventId };
  const { error } = await admin.from("payment_events").insert({
    provider: "stripe",
    provider_event_id: eventId,
    event_type: event.type,
    resource_id: String(event.data?.object?.id ?? ""),
    verification_status: "verified",
    processed: false,
    payload: { environment: env, type: event.type },
  });
  if (error) return { claimed: false as const, admin, eventId };
  return { claimed: true as const, admin, eventId };
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
          const event = (await verifyWebhook(request, rawEnv)) as {
            id?: string;
            type: string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { object: any };
          };
          const claim = await claimEvent(event, rawEnv);
          if (!claim.claimed) return Response.json({ received: true, duplicate: true });
          try {
            await handleEvent(event, rawEnv);
          } catch (failure) {
            // The claim exists but processing failed. Release it so Stripe's
            // retry is not silently deduplicated into a lost payment event,
            // and answer 500 so Stripe actually retries.
            console.error("[payments:webhook] processing failed", (failure as Error).message);
            if (claim.eventId) {
              await claim.admin
                .from("payment_events")
                .delete()
                .eq("provider", "stripe")
                .eq("provider_event_id", claim.eventId)
                .eq("processed", false);
            }
            return new Response("Webhook processing failed", { status: 500 });
          }
          if (claim.eventId) {
            await claim.admin
              .from("payment_events")
              .update({ processed: true })
              .eq("provider", "stripe")
              .eq("provider_event_id", claim.eventId);
          }
          return Response.json({ received: true });
        } catch (error) {
          // Signature/parse failures: never retryable, never processed.
          console.error("[payments:webhook] error", (error as Error).message);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
