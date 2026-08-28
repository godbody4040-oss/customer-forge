import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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
  .inputValidator((input: { slug: string }) => {
    const slug = String(input?.slug ?? "").trim().slice(0, 80);
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid business address");
    return { slug };
  })
  .handler(async ({ data }) => {
    const supabase = publicClient();

    const { data: org } = await supabase
      .from("public_organizations")
      .select("id, name, slug, industry, is_demo")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!org?.id) return null;
    const orgId: string = org.id;

    const { data: gate } = await supabase
      .from("website_settings")
      .select("publish_state, published")
      .eq("organization_id", orgId)
      .maybeSingle();

    // A client site is only served publicly once it is published (or explicitly in preview).
    if (!gate || (gate.publish_state !== "published" && gate.publish_state !== "preview")) return null;

    const [profile, services, settings, social, reviews, gallery, quoteForm] = await Promise.all([

      supabase.from("public_business_profiles").select("*").eq("organization_id", orgId).maybeSingle(),
      supabase
        .from("services")
        .select(
          "id, name, description, category, price, starting_price, duration_minutes, image_url, bookable, featured, sort_order",
        )
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("website_settings").select("*").eq("organization_id", orgId).maybeSingle(),
      supabase.from("social_profiles").select("*").eq("organization_id", orgId).maybeSingle(),
      supabase
        .from("public_reviews")
        .select("id, author_name, rating, comment, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("media")
        .select("id, url, alt_text, category")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("quote_forms")
        .select("id, name, base_price, min_price, max_price")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("created_at")
        .limit(1)
        .maybeSingle(),
    ]);

    let questions: {
      id: string;
      label: string;
      helper_text: string | null;
      sort_order: number;
      options: { id: string; label: string; price_modifier: number; modifier_type: string }[];
    }[] = [];
    let addons: { id: string; label: string; description: string | null; price: number }[] = [];

    if (quoteForm.data) {
      const { data: qs } = await supabase
        .from("quote_questions")
        .select("id, label, helper_text, sort_order")
        .eq("form_id", quoteForm.data.id)
        .order("sort_order");
      const ids = (qs ?? []).map((q) => q.id);
      const { data: opts } = ids.length
        ? await supabase
            .from("quote_options")
            .select("id, question_id, label, price_modifier, modifier_type, sort_order")
            .in("question_id", ids)
            .order("sort_order")
        : { data: [] };
      questions = (qs ?? []).map((q) => ({
        ...q,
        options: (opts ?? [])
          .filter((o) => o.question_id === q.id)
          .map((o) => ({
            id: o.id,
            label: o.label,
            price_modifier: Number(o.price_modifier),
            modifier_type: o.modifier_type,
          })),
      }));

      const { data: adds } = await supabase
        .from("quote_addons")
        .select("id, label, description, price, sort_order")
        .eq("form_id", quoteForm.data.id)
        .order("sort_order");
      addons = (adds ?? []).map((a) => ({
        id: a.id,
        label: a.label,
        description: a.description,
        price: Number(a.price),
      }));
    }

    return {
      org: { ...org, id: orgId, name: org.name ?? "", slug: org.slug ?? "" },
      profile: profile.data,
      services: services.data ?? [],
      settings: settings.data,
      social: social.data,
      reviews: reviews.data ?? [],
      gallery: gallery.data ?? [],
      quote: quoteForm.data ? { form: quoteForm.data, questions, addons } : null,
    };
  });

export type PublicSite = Awaited<ReturnType<typeof getPublicSite>>;

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
      const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
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
    const supabase = publicClient();
    const { data: org } = await supabase
      .from("public_organizations")
      .select("id, name")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!org?.id) throw new Error("We couldn't find that business.");
    const orgId: string = org.id;

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        organization_id: orgId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        service_id: data.serviceId || null,
        service_interest: data.serviceInterest || null,
        message: data.message || null,
        city: data.city || null,
        source: data.source || "website",
        campaign: data.campaign || null,
        status: data.kind === "booking" ? "booked" : data.kind === "quote" ? "quoted" : "new",
        estimated_value: data.estimatedValue,
      })
      .select("id")
      .single();
    if (error) throw new Error("We couldn't save your request. Please try again.");

    if (data.quote) {
      await supabase.from("quote_requests").insert({
        organization_id: orgId,
        form_id: data.quote.formId,
        lead_id: lead.id,
        answers: data.quote.answers,
        estimate_min: data.quote.min,
        estimate_max: data.quote.max,
      });
    }

    if (data.booking) {
      const starts = new Date(data.booking.startsAt);
      if (Number.isNaN(starts.getTime())) throw new Error("Pick a valid appointment time.");
      const ends = new Date(starts.getTime() + data.booking.durationMinutes * 60_000);
      await supabase.from("appointments").insert({
        organization_id: orgId,
        lead_id: lead.id,
        service_id: data.serviceId || null,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        status: "pending",
        notes: data.message || null,
      });
    }

    const titles: Record<string, string> = {
      inquiry: `New lead: ${data.name}`,
      contact: `New message: ${data.name}`,
      quote: `Quote request: ${data.name}`,
      booking: `New booking request: ${data.name}`,
      consultation: `Consultation request: ${data.name}`,
    };
    await supabase.from("notifications").insert({
      organization_id: orgId,
      title: titles[data.kind] ?? `New lead: ${data.name}`,
      body: [data.serviceInterest, data.city, data.estimatedValue ? `$${data.estimatedValue} estimated` : null]
        .filter(Boolean)
        .join(" · "),
      kind: data.kind === "booking" ? "booking" : data.kind === "quote" ? "quote" : "lead",
      link: data.kind === "booking" ? "/app/calendar" : "/app/leads",
    });

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
    const { data: org } = await supabase
      .from("public_organizations")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
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
