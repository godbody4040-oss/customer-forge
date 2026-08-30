import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EVENTS = [
  "landing_view",
  "assessment_submitted",
  "audit_requested",
  "cta_click",
  "experiment_exposure",
  "signup_started",
  "signup_completed",
  "workspace_provisioned",
  "site_published",
  "first_quote_request",
  "first_booking",
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
  /** Small flat bag: experiment variants, workspace id, milestone details. */
  metadata?: Record<string, unknown> | null;
}

const clean = (value: unknown, max: number) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, max) : null;
};

/** Keeps metadata small, flat and free of anything sensitive. */
const cleanMetadata = (value: unknown): Record<string, string | number | boolean> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 12)) {
    const safeKey = key.replace(/[^a-z0-9_]/gi, "").slice(0, 40);
    if (!safeKey) continue;
    if (typeof raw === "string") out[safeKey] = raw.slice(0, 120);
    else if (typeof raw === "number" && Number.isFinite(raw)) out[safeKey] = raw;
    else if (typeof raw === "boolean") out[safeKey] = raw;
  }
  return Object.keys(out).length > 0 ? out : null;
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
      metadata: cleanMetadata(input?.metadata),
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
      metadata: (data.metadata ?? null) as never,
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
  workspacesProvisioned: number;
  firstQuotes: number;
  firstBookings: number;
  checkoutsStarted: number;
  checkoutsCompleted: number;
}

export interface VariantRow {
  experiment: string;
  variant: string;
  exposures: number;
  signupsStarted: number;
  signupsCompleted: number;
  checkoutsCompleted: number;
  /** Signups completed per 100 exposures. */
  signupRate: number;
}

const emptyRow = (key: string, label: string): FunnelRow => ({
  key,
  label,
  landingViews: 0,
  signupsStarted: 0,
  signupsCompleted: 0,
  workspacesProvisioned: 0,
  firstQuotes: 0,
  firstBookings: 0,
  checkoutsStarted: 0,
  checkoutsCompleted: 0,
});

/**
 * Super-admin funnel report.
 * Grouped by landing page / industry, plus an A/B breakdown per variant so the
 * pricing layout and Start-free copy tests can be compared directly.
 */
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
      .select("event_name, industry_slug, landing_path, metadata, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const grouped = new Map<string, FunnelRow>();
    const variants = new Map<string, VariantRow>();

    for (const row of rows ?? []) {
      const key = row.industry_slug ?? row.landing_path ?? "direct";
      const entry =
        grouped.get(key) ??
        emptyRow(key, row.industry_slug ? row.industry_slug.replace(/-/g, " ") : (row.landing_path ?? "Direct"));
      if (row.event_name === "landing_view") entry.landingViews += 1;
      if (row.event_name === "signup_started") entry.signupsStarted += 1;
      if (row.event_name === "signup_completed") entry.signupsCompleted += 1;
      if (row.event_name === "workspace_provisioned") entry.workspacesProvisioned += 1;
      if (row.event_name === "first_quote_request") entry.firstQuotes += 1;
      if (row.event_name === "first_booking") entry.firstBookings += 1;
      if (row.event_name === "checkout_started") entry.checkoutsStarted += 1;
      if (row.event_name === "checkout_completed") entry.checkoutsCompleted += 1;
      grouped.set(key, entry);

      const meta =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};
      for (const [experiment, value] of Object.entries(meta)) {
        if (experiment === "experiment" || experiment === "variant" || typeof value !== "string") continue;
        const vkey = `${experiment}:${value}`;
        const vrow =
          variants.get(vkey) ??
          {
            experiment,
            variant: value,
            exposures: 0,
            signupsStarted: 0,
            signupsCompleted: 0,
            checkoutsCompleted: 0,
            signupRate: 0,
          };
        if (row.event_name === "experiment_exposure") vrow.exposures += 1;
        if (row.event_name === "signup_started") vrow.signupsStarted += 1;
        if (row.event_name === "signup_completed") vrow.signupsCompleted += 1;
        if (row.event_name === "checkout_completed") vrow.checkoutsCompleted += 1;
        variants.set(vkey, vrow);
      }
    }

    const report = [...grouped.values()].sort(
      (a, b) => b.checkoutsCompleted - a.checkoutsCompleted || b.landingViews - a.landingViews,
    );
    const variantReport = [...variants.values()]
      .map((v) => ({
        ...v,
        signupRate: v.exposures > 0 ? Math.round((v.signupsCompleted / v.exposures) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.experiment.localeCompare(b.experiment) || b.signupRate - a.signupRate);

    return { days: data.days, total: rows?.length ?? 0, report, variantReport };
  });

