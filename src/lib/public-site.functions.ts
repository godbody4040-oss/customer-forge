import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
// Type-only import: erased at build time, so nothing server-only ships to the client.
import type { loadSite } from "@/lib/public-site.server";

/**
 * Public-safe organization lookup. Organization rows carry billing and
 * onboarding data, so the table is unreadable to anonymous clients; this
 * resolves only id/name via the privileged server client.
 */
async function publicOrganization(slug: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("id, name")
    .eq("slug", slug)
    .eq("is_suspended", false)
    .maybeSingle();
  return data ?? null;
}

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Everything a public business website needs, in one SSR-friendly read. */
export const getPublicSite = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string; pageSlug?: string }) => {
    const slug = String(input?.slug ?? "")
      .trim()
      .slice(0, 80);
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid business address");
    const raw = String(input?.pageSlug ?? "")
      .trim()
      .slice(0, 80);
    if (raw && !/^[a-z0-9-]+$/.test(raw)) throw new Error("Invalid page address");
    return raw ? { slug, pageSlug: raw } : { slug };
  })
  .handler(async ({ data }) => {
    const { loadSite } = await import("@/lib/public-site.server");
    return loadSite(data.slug, data.pageSlug ? { pageSlug: data.pageSlug } : undefined);
  });

export type PublicSite = Awaited<ReturnType<typeof loadSite>>;

/**
 * Draft preview behind a shareable, time-limited token. Returns a reason when
 * the link is unknown, revoked or expired so the page can say so plainly.
 */
export const getPreviewSite = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => {
    const token = String(input?.token ?? "")
      .trim()
      .slice(0, 120);
    if (!/^[A-Za-z0-9_-]{16,}$/.test(token)) throw new Error("Invalid preview link");
    return { token };
  })
  .handler(async ({ data }) => {
    const { loadSite, resolvePreviewToken } = await import("@/lib/public-site.server");
    const link = await resolvePreviewToken(data.token);
    if (!link.ok)
      return {
        ok: false as const,
        reason: link.reason,
        site: null,
        expiresAt: null as string | null,
        label: null as string | null,
      };
    const site = await loadSite(link.slug, { allowUnpublished: true });
    if (!site)
      return {
        ok: false as const,
        reason: "unknown" as const,
        site: null,
        expiresAt: null as string | null,
        label: null as string | null,
      };
    return {
      ok: true as const,
      reason: null as "expired" | "revoked" | "unknown" | null,
      site,
      expiresAt: link.expiresAt as string | null,
      label: link.label as string | null,
    };
  });

/** Anonymous lead / quote / booking submission from a public business site. */
export const submitPublicLead = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      slug: string;
      name: string;
      email?: string;
      phone?: string;
      message?: string;
      city?: string;
      serviceId?: string | null;
      serviceInterest?: string | null;
      source?: string;
      campaign?: string | null;
      kind: "inquiry" | "quote" | "booking" | "consultation" | "contact";
      estimatedValue?: number;
      quote?: {
        formId: string | null;
        answers: { question: string; answer: string; modifier: number }[];
        min: number;
        max: number;
      } | null;
      booking?: { startsAt: string; durationMinutes: number } | null;
    }) => {
      const clean = (v: unknown, max: number) =>
        String(v ?? "")
          .trim()
          .slice(0, max);
      const name = clean(input.name, 120);
      if (name.length < 2) throw new Error("Please enter your name.");
      const email = clean(input.email, 160);
      const phone = clean(input.phone, 40);
      if (!email && !phone) throw new Error("Add an email or phone number so we can reach you.");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("That email address doesn't look right.");
      }
      if (!/^[a-z0-9-]+$/.test(input.slug)) throw new Error("Invalid business address");
      return {
        ...input,
        name,
        email,
        phone,
        message: clean(input.message, 2000),
        city: clean(input.city, 120),
        serviceInterest: clean(input.serviceInterest, 160),
        estimatedValue: Math.max(0, Math.min(1_000_000, Number(input.estimatedValue ?? 0))),
      };
    },
  )
  .handler(async ({ data }) => {
    // Inserts use the admin client: anonymous callers have INSERT but no SELECT
    // on leads, so a `.insert().select()` round-trip is blocked by RLS.
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");
    const org = await publicOrganization(data.slug);
    if (!org?.id) throw new Error("We couldn't find that business.");
    const orgId: string = org.id;

    // Origin event for the CRM timeline: every public submission is visible as
    // the first activity on the lead, with the channel it came from.
    const originBody =
      data.kind === "booking"
        ? `Booking requested from the public website${data.serviceInterest ? ` — ${data.serviceInterest}` : ""}.`
        : data.kind === "quote"
          ? `Quote submitted from the public website — estimate $${data.quote?.min ?? 0}–$${data.quote?.max ?? 0}.`
          : data.kind === "contact"
            ? "Contact form submitted from the public website."
            : "Lead captured from the public website.";

    const titles: Record<string, string> = {
      inquiry: `New lead: ${data.name}`,
      contact: `New message: ${data.name}`,
      quote: `Quote request: ${data.name}`,
      booking: `New booking request: ${data.name}`,
      consultation: `Consultation request: ${data.name}`,
    };

    // A single database transaction writes the lead, quote answers, appointment,
    // timeline entry and owner notification together. Any failure rolls the whole
    // thing back, so the visitor never sees a false "sent" and the workspace never
    // ends up with an orphaned half-record. The function also re-checks that any
    // service or quote form id really belongs to this business and refuses a time
    // that clashes with an existing appointment.
    const { data: result, error } = await supabase.rpc("submit_public_conversion", {
      _organization_id: orgId,
      _lead: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        service_id: data.serviceId || null,
        service_interest: data.serviceInterest || null,
        message: data.message || null,
        city: data.city || null,
        source: data.source || "website",
        campaign: data.campaign ?? null,
        status: data.kind === "booking" ? "booked" : data.kind === "quote" ? "quoted" : "new",
        estimated_value: data.estimatedValue,
      } as never,
      _quote: data.quote
        ? ({
            form_id: data.quote.formId,
            answers: data.quote.answers,
            estimate_min: data.quote.min,
            estimate_max: data.quote.max,
          } as never)
        : null,
      _booking: data.booking
        ? ({
            starts_at: data.booking.startsAt,
            duration_minutes: data.booking.durationMinutes,
          } as never)
        : null,
      _activity: {
        kind:
          data.kind === "booking" ? "booking" : data.kind === "quote" ? "quote" : "form_submission",
        body: [originBody, data.message ? `"${data.message}"` : null].filter(Boolean).join(" "),
        metadata: {
          source: data.source || "website",
          campaign: data.campaign ?? null,
          city: data.city || null,
          service_interest: data.serviceInterest || null,
          estimated_value: data.estimatedValue,
        },
      } as never,
      _notification: {
        title: titles[data.kind] ?? `New lead: ${data.name}`,
        body: [
          data.serviceInterest,
          data.city,
          data.estimatedValue ? `$${data.estimatedValue} estimated` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        kind: data.kind === "booking" ? "booking" : data.kind === "quote" ? "quote" : "lead",
        link: data.kind === "booking" ? "/app/calendar" : "/app/leads",
      } as never,
    });

    if (error) {
      const message = error.message ?? "";
      console.error("public submission failed", message);
      if (message.includes("BOOKING_CONFLICT") || message.includes("appointments_no_overlap")) {
        throw new Error("That time was just taken. Please pick another time.");
      }
      if (message.includes("TIME_IN_PAST")) throw new Error("Please pick a time in the future.");
      if (message.includes("INVALID_TIME")) throw new Error("Pick a valid appointment time.");
      if (message.includes("INVALID_SERVICE") || message.includes("INVALID_QUOTE_FORM")) {
        throw new Error("That service is no longer available. Please refresh and try again.");
      }
      throw new Error("We couldn't save your request. Please try again.");
    }

    const saved = (result ?? {}) as { lead_id?: string; appointment_id?: string | null };
    const leadId = String(saved.lead_id ?? "");
    if (!leadId) throw new Error("We couldn't save your request. Please try again.");
    const lead = { id: leadId };

    // Funnel milestones: recorded only the first time a workspace reaches them,
    // so attribution shows sign-up -> first quote -> first booking per client.
    // These run after the transaction commits: a reporting write must never be
    // able to lose a customer's request.
    const recordMilestone = async (event: string, amountCents?: number | null) => {
      const { data: seen } = await supabase
        .from("marketing_conversions")
        .select("id")
        .eq("event_name", event)
        .contains("metadata", { organization_id: orgId } as never)
        .limit(1);
      if (seen && seen.length > 0) return;
      await supabase.from("marketing_conversions").insert({
        event_name: event,
        amount_cents: amountCents ?? null,
        metadata: { organization_id: orgId, source: data.source || "website" } as never,
      });
    };
    if (data.quote) await recordMilestone("first_quote_request", Math.round((data.quote.min ?? 0) * 100));
    if (data.booking) await recordMilestone("first_booking");

    // Everything below is a post-commit side effect (owner alert, follow-up
    // automations). The customer's request is already durably saved, so a
    // provider outage here must never delete it or fail the submission.
    let deliveryOk = true;
    try {
    // Owner alert + customer follow-ups. Delivery happens here (server side) so
    // "sent" always means a provider accepted the message.
    const { data: profile } = await supabase
      .from("business_profiles")
      .select("email, owner_email, notification_email, notify_on_lead")
      .eq("organization_id", orgId)
      .maybeSingle();
    const { alertRecipient } = await import("@/lib/notifications.functions");
    const ownerEmail = profile?.email || profile?.owner_email || null;
    const alertEmail = alertRecipient((profile ?? {}) as Record<string, never>);

    const { deliverRun, sendLeadAlert } = await import("@/lib/messaging.server");

    if (alertEmail) {
      const alert = await sendLeadAlert(
        alertEmail,
        {
          businessName: org.name,
          kind: titles[data.kind]?.split(":")[0] ?? "New lead",
          leadName: data.name,
          leadEmail: data.email || undefined,
          leadPhone: data.phone || undefined,
          city: data.city || undefined,
          service: data.serviceInterest || undefined,
          estimate: data.quote
            ? `$${data.quote.min}–$${data.quote.max}`
            : data.estimatedValue
              ? `$${data.estimatedValue}`
              : undefined,
          message: data.message || undefined,
          when: data.booking ? new Date(data.booking.startsAt).toLocaleString() : undefined,
        },
        // One alert per lead, even if the submit is retried.
        `lead-alert-${lead.id}`,
      );
      const { logAlertDelivery } = await import("@/lib/notifications.server");
      await logAlertDelivery(null, {
        organizationId: orgId,
        leadId: lead.id,
        recipient: alertEmail,
        kind: data.kind,
        result: alert,
      });
      if (!alert.ok) console.warn("lead alert not delivered", alert.reason);
    }


    const { enqueueAutomations } = await import("@/lib/automation-engine");
    await enqueueAutomations(
      supabase,
      {
        organizationId: orgId,
        trigger: data.kind === "booking" ? "booking_created" : "lead_created",
        businessName: org.name,
        lead: {
          id: lead.id,
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          service_interest: data.serviceInterest || null,
          estimated_value: data.estimatedValue,
        },
      },
      {
        businessName: org.name,
        deliver: (run) => deliverRun(run, { businessName: org.name, replyTo: ownerEmail }),
      },
    );

    return { ok: true, leadId: lead.id, business: org.name };
  });

/** Fire-and-forget public analytics event (page views, CTA clicks). */
export const trackPublicEvent = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      slug: string;
      eventType: string;
      path?: string;
      source?: string | null;
      campaign?: string | null;
      device?: string;
      sessionId?: string;
    }) => {
      if (!/^[a-z0-9-]+$/.test(input.slug)) throw new Error("Invalid business address");
      const allowed = [
        "page_view",
        "call_click",
        "text_click",
        "email_click",
        "quote_start",
        "quote_complete",
        "booking_start",
        "form_submit",
      ];
      if (!allowed.includes(input.eventType)) throw new Error("Unsupported event");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const org = await publicOrganization(data.slug);
    if (!org?.id) return { ok: false };
    const orgId: string = org.id;
    await supabase.from("analytics_events").insert({
      organization_id: orgId,
      event_type: data.eventType,
      path: data.path?.slice(0, 200) ?? null,
      source: data.source?.slice(0, 60) ?? null,
      campaign: data.campaign?.slice(0, 60) ?? null,
      device: data.device?.slice(0, 20) ?? null,
      session_id: data.sessionId?.slice(0, 60) ?? null,
    });
    return { ok: true };
  });
