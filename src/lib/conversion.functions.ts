import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EVENTS = [
  "landing_view",
  "cta_click",
  "signup_started",
  "signup_completed",
  "checkout_started",
  "checkout_completed",
] as const;

export type ConversionEvent = (typeof EVENTS)[number];

export interface ConversionInput {
  event: string;
  landingPath?: string | null;
  industrySlug?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  sessionId?: string | null;
  email?: string | null;
  amountCents?: number | null;
}

const clean = (value: unknown, max: number) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, max) : null;
};

/** Records a Revora marketing funnel event (landing page -> signup -> paid checkout). */
export const recordConversion = createServerFn({ method: "POST" })
  .inputValidator((input: ConversionInput) => {
    const event = clean(input?.event, 40);
    if (!event || !(EVENTS as readonly string[]).includes(event)) {
      throw new Error("Unsupported conversion event");
    }
    const amount =
      typeof input?.amountCents === "number" && Number.isFinite(input.amountCents)
        ? Math.max(0, Math.round(input.amountCents))
        : null;
    return {
      event,
      landingPath: clean(input?.landingPath, 200),
      industrySlug: clean(input?.industrySlug, 80),
      referrer: clean(input?.referrer, 300),
      utmSource: clean(input?.utmSource, 80),
      utmMedium: clean(input?.utmMedium, 80),
      utmCampaign: clean(input?.utmCampaign, 120),
      sessionId: clean(input?.sessionId, 60),
      email: clean(input?.email, 160),
      amountCents: amount,
    };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("marketing_conversions").insert({
      event_name: data.event,
      landing_path: data.landingPath,
      industry_slug: data.industrySlug,
      referrer: data.referrer,
      utm_source: data.utmSource,
      utm_medium: data.utmMedium,
      utm_campaign: data.utmCampaign,
      session_id: data.sessionId,
      email: data.email,
      amount_cents: data.amountCents,
    });
    if (error) {
      console.error("recordConversion failed", error.message);
      return { ok: false };
    }
    return { ok: true };
  });

export interface FunnelRow {
  key: string;
  label: string;
  landingViews: number;
  signupsStarted: number;
  signupsCompleted: number;
  checkoutsStarted: number;
  checkoutsCompleted: number;
}

/** Super-admin funnel report: conversions grouped by landing page / industry. */
export const getConversionReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { days?: number }) => ({
    days: Math.min(365, Math.max(1, Math.round(Number(input?.days ?? 30)))),
  }))
  .handler(async ({ context, data }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();

    const { data: rows, error } = await supabaseAdmin
      .from("marketing_conversions")
      .select("event_name, industry_slug, landing_path, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const grouped = new Map<string, FunnelRow>();
    for (const row of rows ?? []) {
      const key = row.industry_slug ?? row.landing_path ?? "direct";
      const entry =
        grouped.get(key) ??
        {
          key,
          label: row.industry_slug ? row.industry_slug.replace(/-/g, " ") : (row.landing_path ?? "Direct"),
          landingViews: 0,
          signupsStarted: 0,
          signupsCompleted: 0,
          checkoutsStarted: 0,
          checkoutsCompleted: 0,
        };
      if (row.event_name === "landing_view") entry.landingViews += 1;
      if (row.event_name === "signup_started") entry.signupsStarted += 1;
      if (row.event_name === "signup_completed") entry.signupsCompleted += 1;
      if (row.event_name === "checkout_started") entry.checkoutsStarted += 1;
      if (row.event_name === "checkout_completed") entry.checkoutsCompleted += 1;
      grouped.set(key, entry);
    }

    const report = [...grouped.values()].sort(
      (a, b) => b.checkoutsCompleted - a.checkoutsCompleted || b.landingViews - a.landingViews,
    );
    return { days: data.days, total: rows?.length ?? 0, report };
  });
