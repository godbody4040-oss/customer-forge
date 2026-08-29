import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StripeEnv } from "@/lib/stripe.server";
import { cleanText, parseStripeEnvironment, parseWorkspaceId } from "@/lib/stripe-input";

export type GrowthSystemIntake = {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  website?: string;
  businessType: string;
  city: string;
  state: string;
  services: string;
};

/**
 * Starts the single Revora Growth System checkout:
 *   • $1,500 one-time setup (charged on the first invoice)
 *   • $250/month recurring subscription
 * Both live on ONE Stripe subscription session, so the recurring amount is
 * never $1,750 — only the first invoice includes the setup line.
 */
export const createGrowthSystemCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      organizationId: string;
      returnUrl: string;
      environment: StripeEnv;
      intake: GrowthSystemIntake;
    }) => {
      const returnUrl = cleanText(input?.returnUrl, 500);
      if (!/^https?:\/\//.test(returnUrl)) throw new Error("Invalid return URL");
      const raw = input?.intake ?? ({} as GrowthSystemIntake);
      const intake: GrowthSystemIntake = {
        fullName: cleanText(raw.fullName, 120),
        businessName: cleanText(raw.businessName, 120),
        email: cleanText(raw.email, 160).toLowerCase(),
        phone: cleanText(raw.phone, 40),
        website: cleanText(raw.website, 200),
        businessType: cleanText(raw.businessType, 80),
        city: cleanText(raw.city, 80),
        state: cleanText(raw.state, 40),
        services: cleanText(raw.services, 400),
      };
      if (!intake.fullName || !intake.businessName) throw new Error("Add your name and business name");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(intake.email)) throw new Error("Add a valid email address");
      if (intake.phone.replace(/\D/g, "").length < 10) throw new Error("Add a valid phone number");
      if (!intake.businessType) throw new Error("Add your business type");
      if (!intake.city || !intake.state) throw new Error("Add your city and state");
      if (!intake.services) throw new Error("Add your primary services");
      return { organizationId: parseWorkspaceId(input?.organizationId), returnUrl, environment: parseStripeEnvironment(input?.environment), intake };
    },
  )
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const { GROWTH_PLAN_ID, MONTHLY_PRICE_KEY, SETUP_PRICE_KEY } = await import(
      "@/lib/stripe-billing.server"
    );

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
    if (!["owner", "admin", "manager"].includes(membership?.role ?? "")) {
      return { error: "Only workspace owners and admins can start billing." };
    }

    // Duplicate-subscription guard: an existing live subscription must be
    // changed through the billing portal, never a second checkout.
    const { data: existing } = await context.supabase
      .from("subscriptions")
      .select("status, provider_subscription_id")
      .eq("organization_id", data.organizationId)
      .eq("payment_provider", "stripe")
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (
      existing?.provider_subscription_id &&
      ["active", "trialing", "past_due"].includes(existing.status)
    ) {
      return {
        error:
          "This workspace already has an active Revora subscription. Use Manage subscription to update payment details or cancel.",
      };
    }

    // Store the customer information collected at checkout (tenant-scoped).
    const { intake } = data;
    await context.supabase
      .from("organizations")
      .update({ name: intake.businessName, industry: intake.businessType })
      .eq("id", data.organizationId);
    const { data: profile } = await context.supabase
      .from("business_profiles")
      .select("id")
      .eq("organization_id", data.organizationId)
      .maybeSingle();
    const profileFields = {
      owner_name: intake.fullName,
      owner_email: intake.email,
      email: intake.email,
      phone: intake.phone,
      ...(intake.website ? { website: intake.website } : {}),
      city: intake.city,
      state: intake.state,
      service_area: `${intake.city}, ${intake.state}`,
      description: intake.services,
    };
    if (profile) {
      await context.supabase.from("business_profiles").update(profileFields).eq("id", profile.id);
    } else {
      await context.supabase
        .from("business_profiles")
        .insert({ organization_id: data.organizationId, ...profileFields });
    }

    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [MONTHLY_PRICE_KEY, SETUP_PRICE_KEY] });
      const monthly = prices.data.find((p) => p.lookup_key === MONTHLY_PRICE_KEY);
      const setup = prices.data.find((p) => p.lookup_key === SETUP_PRICE_KEY);
      if (!monthly || !setup) {
        return { error: "Revora Growth System pricing is not set up in the payment provider yet." };
      }

      const found = await stripe.customers.search({
        query: `metadata['organizationId']:'${data.organizationId}'`,
        limit: 1,
      });
      let customerId = found.data[0]?.id;
      if (!customerId) {
        const created = await stripe.customers.create({
          email: intake.email,
          name: intake.businessName,
          phone: intake.phone,
          metadata: { organizationId: data.organizationId, userId: context.userId },
        });
        customerId = created.id;
      } else {
        await stripe.customers.update(customerId, {
          email: intake.email,
          name: intake.businessName,
          phone: intake.phone,
        });
      }

      const metadata = {
        kind: "growth_system",
        organizationId: data.organizationId,
        planId: GROWTH_PLAN_ID,
        userId: context.userId,
        setupAmount: "1500",
        monthlyAmount: "250",
      };
      const base = {
        // One-time setup line is billed on the FIRST invoice only; the
        // recurring price stays $250/month.
        line_items: [
          { price: monthly.id, quantity: 1 },
          { price: setup.id, quantity: 1 },
        ],
        mode: "subscription" as const,
        ui_mode: "embedded_page" as const,
        return_url: data.returnUrl,
        customer: customerId,
        metadata,
        // 30-day free platform trial: the $1,500 setup is charged today, the $250/month
        // recurring price starts one month after signup.
        subscription_data: { metadata, trial_period_days: 30 },
      };

      // Live accounts run with full compliance handling, which rejects
      // currency-pinning parameters, so the primary payload omits them. Older
      // accounts without it get the USD-pinned retry below.
      type SessionPayload = typeof base & {
        automatic_tax?: { enabled: boolean };
        adaptive_pricing?: { enabled: boolean };
      };
      const createSession = (payload: SessionPayload) => stripe.checkout.sessions.create(payload);

      let session;
      try {
        session = await createSession({ ...base, automatic_tax: { enabled: true } });
      } catch (primaryError) {
        const message = getStripeErrorMessage(primaryError);
        // Tax calculation needs a head-office address on the payment account;
        // without it checkout must still open.
        if (!/automatic tax|head office|tax calculation/i.test(message)) throw primaryError;
        session = await createSession(base);
      }


      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });


/** Starts an embedded Stripe one-time checkout for a Revora service (cards + wallets). */
export const createServiceCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { organizationId: string; productId: string; returnUrl: string; environment: StripeEnv }) => {
      const productId = String(input?.productId ?? "").slice(0, 80);
      if (!/^[0-9a-f-]{36}$/i.test(productId)) throw new Error("Choose a service to pay for");
      const returnUrl = String(input?.returnUrl ?? "").slice(0, 500);
      if (!/^https?:\/\//.test(returnUrl)) throw new Error("Invalid return URL");
      return {
        organizationId: parseWorkspaceId(input?.organizationId),
        productId,
        returnUrl,
        environment: parseStripeEnvironment(input?.environment),
      };
    },
  )
  .handler(async ({ data, context }): Promise<{ clientSecret: string; paymentId: string } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const { adminClient, logPaymentError } = await import("@/lib/payments.server");

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
    if (!["owner", "admin", "manager"].includes(membership?.role ?? "")) {
      return { error: "Only workspace owners and admins can make payments." };
    }

    const admin = await adminClient();
    const { data: product } = await admin
      .from("payment_products")
      .select("id, name, description, amount, currency, kind, plan_id, billing_interval, is_active")
      .eq("id", data.productId)
      .maybeSingle();
    if (!product?.is_active) return { error: "That service is not available." };

    const email = (context.claims as { email?: string } | null)?.email ?? null;
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
        environment: data.environment,
        payment_provider: "stripe",
        status: "created",
        customer_email: email,
        metadata: { checkout: "stripe_service" },
      })
      .select("id, amount, currency")
      .single();
    if (insertError || !payment) {
      logPaymentError("stripe-service-record", { productId: product.id, message: insertError?.message });
      return { error: "We could not start that payment. Please try again." };
    }

    try {
      const stripe = createStripeClient(data.environment);
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

      const metadata = {
        kind: "service",
        organizationId: data.organizationId,
        productId: product.id,
        paymentId: payment.id,
        userId: context.userId,
      };
      const base = {
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: payment.currency.toLowerCase(),
              unit_amount: Math.round(Number(payment.amount) * 100),
              product_data: {
                name: product.name,
                ...(product.description ? { description: product.description.slice(0, 300) } : {}),
              },
            },
          },
        ],
        mode: "payment" as const,
        ui_mode: "embedded_page" as const,
        return_url: data.returnUrl,
        customer: customerId,
        metadata,
        payment_intent_data: { metadata },
      };

      let session;
      try {
        session = await stripe.checkout.sessions.create({ ...base, automatic_tax: { enabled: true } });
      } catch (taxError) {
        const message = getStripeErrorMessage(taxError);
        if (!/automatic tax|head office|tax calculation/i.test(message)) throw taxError;
        session = await stripe.checkout.sessions.create(base);
      }
      if (!session.client_secret) throw new Error("The payment provider did not return a checkout session.");

      await admin
        .from("payments")
        .update({ status: "pending", metadata: { checkout: "stripe_service", stripe_session_id: session.id } })
        .eq("id", payment.id);

      return { clientSecret: session.client_secret, paymentId: payment.id };
    } catch (error) {
      const message = getStripeErrorMessage(error);
      logPaymentError("stripe-service-checkout", { paymentId: payment.id, message });
      await admin
        .from("payments")
        .update({ status: "failed", failure_reason: "Checkout creation failed" })
        .eq("id", payment.id);
      return { error: message };
    }
  });

/** Stripe-hosted billing portal for cancelling, switching plan or updating cards. */
export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; returnUrl?: string; environment: StripeEnv }) => ({
    organizationId: parseWorkspaceId(input?.organizationId),
    returnUrl: input?.returnUrl ? String(input.returnUrl).slice(0, 500) : undefined,
    environment: parseStripeEnvironment(input?.environment),
  }))
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");

    const { data: membership } = await context.supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!["owner", "admin", "manager"].includes(membership?.role ?? "")) {
      return { error: "Only workspace owners and admins can manage billing." };
    }

    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("provider_customer_id, environment")
      .eq("organization_id", data.organizationId)
      .eq("payment_provider", "stripe")
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.provider_customer_id) {
      return { error: "No card subscription is active for this workspace yet." };
    }

    try {
      const stripe = createStripeClient(sub.environment as StripeEnv);
      let customerId = sub.provider_customer_id;
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if ("deleted" in customer && customer.deleted) throw new Error("No such customer");
      } catch (customerError) {
        const message = getStripeErrorMessage(customerError);
        if (!/no such customer|resource_missing/i.test(message)) throw customerError;
        const found = await stripe.customers.search({
          query: `metadata['organizationId']:'${data.organizationId}'`,
          limit: 1,
        });
        const recovered = found.data[0]?.id;
        if (!recovered) {
          return {
            error:
              sub.environment === "sandbox"
                ? "This test subscription is no longer available. Start a new test checkout to continue."
                : "We could not locate your live billing profile. Contact Revora support and we’ll reconnect it safely.",
          };
        }
        customerId = recovered;
        const { adminClient } = await import("@/lib/payments.server");
        const admin = await adminClient();
        await admin
          .from("subscriptions")
          .update({ provider_customer_id: recovered })
          .eq("organization_id", data.organizationId)
          .eq("payment_provider", "stripe")
          .eq("environment", sub.environment);
      }
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
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
    organizationId: parseWorkspaceId(input?.organizationId),
    environment: parseStripeEnvironment(input?.environment),
  }))
  .handler(async ({ data, context }) => {
    const { data: subscription } = await context.supabase
      .from("subscriptions")
      .select(
        "plan_id, status, billing_interval, price_id, payment_provider, environment, cancel_at_period_end, current_period_start, current_period_end, trial_start, trial_ends_at, provider_customer_id, provider_subscription_id",
      )
      .eq("organization_id", data.organizationId)
      .eq("payment_provider", "stripe")
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: entitlements } = await context.supabase
      .from("plan_entitlements")
      .select("plan_id, feature_key, limit_value")
      .eq("plan_id", subscription?.plan_id ?? "");

    const { data: setupPayment } = await context.supabase
      .from("payments")
      .select("id")
      .eq("organization_id", data.organizationId)
      .eq("payment_provider", "stripe")
      .eq("environment", data.environment)
      .eq("status", "completed")
      .eq("description", "Revora Growth System setup fee")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

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
      setupPaid: Boolean(setupPayment),
      environment: data.environment,
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
    environment: parseStripeEnvironment(input?.environment),
    domains: (input?.domains ?? [])
      .map((d) => String(d).trim().toLowerCase())
      .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))
      .slice(0, 10),
  }))
  .handler(async ({ data, context }) => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "super_admin")) {
      return { error: "Only the Revora platform owner can change payment methods." };
    }

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
