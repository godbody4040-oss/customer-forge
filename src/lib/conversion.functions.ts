import { createServerFn } from "@tanstack/react-start";

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
