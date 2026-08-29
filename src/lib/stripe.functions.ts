import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StripeEnv } from "@/lib/stripe.server";

type Interval = "monthly" | "annual";

const uuid = (value: unknown) => {
  const id = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid workspace");
  return id;
};

const env = (value: unknown): StripeEnv => {
  if (value === "sandbox" || value === "live") return value;
  throw new Error("Invalid payment environment");
};

/** Starts an embedded Stripe subscription checkout for a workspace the member can manage. */
export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      organizationId: string;
      planId: string;
      interval: Interval;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      const planId = String(input?.planId ?? "").slice(0, 40);
      if (!/^[a-z0-9_-]+$/.test(planId)) throw new Error("Choose a plan");
      const interval: Interval = input?.interval === "annual" ? "annual" : "monthly";
      const returnUrl = String(input?.returnUrl ?? "").slice(0, 500);
      if (!/^https?:\/\//.test(returnUrl)) throw new Error("Invalid return URL");
      return { organizationId: uuid(input?.organizationId), planId, interval, returnUrl, environment: env(input?.environment) };
    },
  )
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const { priceIdFor } = await import("@/lib/stripe-billing.server");

    // RLS proves membership: a non-member cannot read this organization.
    const { data: org } = await context.supabase
      .from("organizations")
      .select("id, name")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (!org) return { error: "You do not have access to this workspace." };

    const { data: membership } = await context.supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .maybeSingle();
    const role = membership?.role ?? "";
    if (!["owner", "admin", "manager"].includes(role)) {
      return { error: "Only workspace owners and admins can change billing." };
    }

    const priceKey = priceIdFor(data.planId, data.interval);
    if (!priceKey) return { error: "That plan is not available for checkout." };

    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [priceKey] });
      const price = prices.data[0];
      if (!price) return { error: "That plan price is not set up in the payment provider yet." };

      const email = (context.claims as { email?: string } | null)?.email ?? undefined;
      const found = await stripe.customers.search({
        query: `metadata['organizationId']:'${data.organizationId}'`,
        limit: 1,
      });
      let customerId = found.data[0]?.id;
      if (!customerId) {
        const created = await stripe.customers.create({
          ...(email ? { email } : {}),
          name: org.name,
          metadata: { organizationId: data.organizationId, userId: context.userId },
        });
        customerId = created.id;
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        automatic_tax: { enabled: true },
        metadata: {
          organizationId: data.organizationId,
          planId: data.planId,
          userId: context.userId,
        },
        subscription_data: {
          metadata: {
            organizationId: data.organizationId,
            planId: data.planId,
            userId: context.userId,
          },
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Stripe-hosted billing portal for cancelling, switching plan or updating cards. */
export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; returnUrl?: string; environment: StripeEnv }) => ({
    organizationId: uuid(input?.organizationId),
    returnUrl: input?.returnUrl ? String(input.returnUrl).slice(0, 500) : undefined,
    environment: env(input?.environment),
  }))
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");

    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("provider_customer_id, environment")
      .eq("organization_id", data.organizationId)
      .maybeSingle();
    if (!sub?.provider_customer_id) {
      return { error: "No card subscription is active for this workspace yet." };
    }

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.provider_customer_id,
        ...(data.returnUrl ? { return_url: data.returnUrl } : {}),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Verified subscription state + plan entitlements for the signed-in workspace. */
export const getBillingState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; environment: StripeEnv }) => ({
    organizationId: uuid(input?.organizationId),
    environment: env(input?.environment),
  }))
  .handler(async ({ data, context }) => {
    const { data: subscription } = await context.supabase
      .from("subscriptions")
      .select(
        "plan_id, status, billing_interval, price_id, payment_provider, environment, cancel_at_period_end, current_period_end, trial_ends_at, provider_subscription_id",
      )
      .eq("organization_id", data.organizationId)
      .maybeSingle();

    const { data: entitlements } = await context.supabase
      .from("plan_entitlements")
      .select("plan_id, feature_key, limit_value")
      .eq("plan_id", subscription?.plan_id ?? "");

    const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
    const active =
      !!subscription &&
      (["active", "trialing", "past_due"].includes(subscription.status) ||
        (subscription.status === "canceled" && !!periodEnd && periodEnd > new Date()));

    return {
      subscription: subscription ?? null,
      entitlements: entitlements ?? [],
      features: (entitlements ?? []).map((row) => row.feature_key),
      active,
    };
  });

/**
 * Platform-owner action: turns on wallet payment methods (Cash App Pay,
 * Apple Pay / Google Pay wallets on card) and registers the Apple Pay
 * domains. Returns exactly what the provider reported — no assumptions.
 */
export const configureWalletPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { environment: StripeEnv; domains?: string[] }) => ({
    environment: env(input?.environment),
    domains: (input?.domains ?? [])
      .map((d) => String(d).trim().toLowerCase())
      .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))
      .slice(0, 10),
  }))
  .handler(async ({ data, context }) => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");

    const { data: isSuper } = await context.supabase.rpc("is_super_admin" as never).single();
    const superAdmin = Boolean(isSuper);
    if (!superAdmin) return { error: "Only the Revora platform owner can change payment methods." };

    try {
      const stripe = createStripeClient(data.environment);
      const configurations = await stripe.paymentMethodConfigurations.list({ limit: 10 });
      const target = configurations.data.find((c) => c.is_default) ?? configurations.data[0];

      let methods: Record<string, string> = {};
      if (target) {
        const updated = await stripe.paymentMethodConfigurations.update(target.id, {
          card: { display_preference: { preference: "on" } },
          cashapp: { display_preference: { preference: "on" } },
          link: { display_preference: { preference: "on" } },
        });
        methods = {
          card: updated.card?.display_preference?.value ?? "unknown",
          cashapp: updated.cashapp?.display_preference?.value ?? "unknown",
          link: updated.link?.display_preference?.value ?? "unknown",
        };
      }

      const domainResults: Array<{ domain: string; apple_pay: string; google_pay: string; enabled: boolean }> = [];
      for (const domain of data.domains) {
        const existing = await stripe.paymentMethodDomains.list({ domain_name: domain, limit: 1 });
        const record =
          existing.data[0] ?? (await stripe.paymentMethodDomains.create({ domain_name: domain }));
        const validated = await stripe.paymentMethodDomains.validate(record.id);
        domainResults.push({
          domain,
          apple_pay: validated.apple_pay?.status ?? "unknown",
          google_pay: validated.google_pay?.status ?? "unknown",
          enabled: Boolean(validated.enabled),
        });
      }

      return {
        ok: true as const,
        environment: data.environment,
        configurationId: target?.id ?? null,
        methods,
        domains: domainResults,
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
