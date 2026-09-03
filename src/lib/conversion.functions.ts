import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EVENTS = [
  "page_view",
  "landing_view",
  "portal_view",
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
        emptyRow(
          key,
          row.industry_slug ? row.industry_slug.replace(/-/g, " ") : (row.landing_path ?? "Direct"),
        );
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
        if (experiment === "experiment" || experiment === "variant" || typeof value !== "string")
          continue;
        const vkey = `${experiment}:${value}`;
        const vrow = variants.get(vkey) ?? {
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
        signupRate:
          v.exposures > 0 ? Math.round((v.signupsCompleted / v.exposures) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.experiment.localeCompare(b.experiment) || b.signupRate - a.signupRate);

    return { days: data.days, total: rows?.length ?? 0, report, variantReport };
  });

export interface TrafficPage {
  path: string;
  views: number;
  visitors: number;
}

export interface TrafficSource {
  source: string;
  visitors: number;
  signups: number;
  paid: number;
}

/**
 * Platform traffic report: real page views, unique sessions, portal reach and
 * how many of those sessions turned into signups and paid clients.
 *
 * Every number comes from `marketing_conversions` rows actually recorded by
 * visitors — nothing is estimated or extrapolated.
 */
export const getTrafficReport = createServerFn({ method: "GET" })
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
      .select("event_name, landing_path, session_id, referrer, utm_source, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20000);
    if (error) throw new Error(error.message);

    const pages = new Map<string, { views: number; sessions: Set<string> }>();
    const sources = new Map<string, { visitors: Set<string>; signups: number; paid: number }>();
    const allSessions = new Set<string>();
    const portalSessions = new Set<string>();
    const byDay = new Map<string, Set<string>>();
    let views = 0;
    let signups = 0;
    let paid = 0;

    for (const row of rows ?? []) {
      const session = row.session_id ?? "";
      if (session) allSessions.add(session);

      if (row.event_name === "page_view") {
        views += 1;
        const path = (row.landing_path ?? "/").slice(0, 120);
        const page = pages.get(path) ?? { views: 0, sessions: new Set<string>() };
        page.views += 1;
        if (session) page.sessions.add(session);
        pages.set(path, page);

        const day = row.created_at.slice(0, 10);
        const dayset = byDay.get(day) ?? new Set<string>();
        if (session) dayset.add(session);
        byDay.set(day, dayset);
      }

      if (row.event_name === "portal_view" && session) portalSessions.add(session);
      if (row.event_name === "signup_completed") signups += 1;
      if (row.event_name === "checkout_completed") paid += 1;

      // Attribute by utm_source, else referring host, else direct.
      let source = row.utm_source?.trim().toLowerCase() ?? "";
      if (!source && row.referrer) {
        try {
          source = new URL(row.referrer).hostname.replace(/^www\./, "");
        } catch {
          source = "";
        }
      }
      source = source || "direct";
      const bucket = sources.get(source) ?? {
        visitors: new Set<string>(),
        signups: 0,
        paid: 0,
      };
      if (session) bucket.visitors.add(session);
      if (row.event_name === "signup_completed") bucket.signups += 1;
      if (row.event_name === "checkout_completed") bucket.paid += 1;
      sources.set(source, bucket);
    }

    const topPages: TrafficPage[] = [...pages.entries()]
      .map(([path, value]) => ({ path, views: value.views, visitors: value.sessions.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 15);

    const topSources: TrafficSource[] = [...sources.entries()]
      .map(([source, value]) => ({
        source,
        visitors: value.visitors.size,
        signups: value.signups,
        paid: value.paid,
      }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 12);

    const daily = [...byDay.entries()]
      .map(([day, set]) => ({ day, visitors: set.size }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const visitors = allSessions.size;
    return {
      days: data.days,
      views,
      visitors,
      portalVisitors: portalSessions.size,
      signups,
      paid,
      portalRate: visitors > 0 ? Math.round((portalSessions.size / visitors) * 1000) / 10 : 0,
      leadRate: visitors > 0 ? Math.round((signups / visitors) * 1000) / 10 : 0,
      topPages,
      topSources,
      daily,
    };
  });
