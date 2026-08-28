import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Revora Site Engine server functions.
 *
 * All reads and writes go through the caller's authenticated client, so tenant
 * isolation is enforced by row level security — a client can only ever generate
 * or edit their own website.
 */

export type RunResult = { jobId: string; status: string; progress: number };

export const runSiteGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string }) => {
    const organizationId = String(input?.organizationId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(organizationId)) throw new Error("Invalid workspace");
    return { organizationId };
  })
  .handler(async ({ data, context }): Promise<RunResult> => {
    const { supabase, userId } = context;
    const orgId = data.organizationId;

    const { GENERATION_STEPS } = await import("@/lib/site-engine");
    const { generateWebsitePlan } = await import("@/lib/website-plan");
    const { generateSiteCopy, COPY_MODEL } = await import("@/lib/site-engine.server");

    const { data: job, error: jobError } = await supabase
      .from("generation_jobs")
      .insert({
        organization_id: orgId,
        status: "processing",
        progress: 0,
        current_step: "business",
        created_by: userId,
        steps: [],
      })
      .select("id")
      .single();
    if (jobError || !job) throw new Error(jobError?.message ?? "Couldn't start the build.");

    const done: string[] = [];
    const step = async (key: string) => {
      done.push(key);
      const meta = GENERATION_STEPS.find((s) => s.key === key);
      await supabase
        .from("generation_jobs")
        .update({ current_step: key, progress: meta?.progress ?? 0, steps: done })
        .eq("id", job.id);
    };

    try {
      const [org, profile, services, media, socials, forms, bookable] = await Promise.all([
        supabase.from("organizations").select("name, industry, conversion_goal").eq("id", orgId).maybeSingle(),
        supabase.from("business_profiles").select("*").eq("organization_id", orgId).maybeSingle(),
        supabase
          .from("services")
          .select("name, description, price, starting_price")
          .eq("organization_id", orgId)
          .eq("is_active", true)
          .order("sort_order"),
        supabase.from("media").select("id").eq("organization_id", orgId),
        supabase.from("social_profiles").select("*").eq("organization_id", orgId).maybeSingle(),
        supabase.from("quote_forms").select("id").eq("organization_id", orgId).eq("is_active", true),
        supabase.from("services").select("id").eq("organization_id", orgId).eq("bookable", true),
      ]);

      if (!org.data) throw new Error("Workspace not found.");
      await step("business");

      const p = (profile.data ?? {}) as Record<string, unknown>;
      const serviceRows = services.data ?? [];
      await step("services");

      const social = (socials.data ?? {}) as Record<string, unknown>;
      const socialLinks = ["instagram", "facebook", "tiktok", "youtube", "google_business", "linkedin"].filter(
        (k) => typeof social[k] === "string" && String(social[k]).trim(),
      ).length;
      await step("brand");

      const testimonials = Array.isArray(p["testimonials"]) ? (p["testimonials"] as unknown[]) : [];
      const goalsRaw = (p["website_goals"] as string[] | undefined) ?? [];
      const goals = (goalsRaw.length ? goalsRaw : [org.data.conversion_goal ?? "quote"]) as string[];

      const plan = generateWebsitePlan({
        businessName: org.data.name ?? "",
        industry: org.data.industry ?? "",
        description: (p["description"] as string) ?? null,
        city: (p["city"] as string) ?? null,
        state: (p["state"] as string) ?? null,
        serviceArea: (p["service_area"] as string) ?? null,
        phone: (p["phone"] as string) ?? null,
        email: (p["email"] as string) ?? null,
        goals: goals as never,
        services: serviceRows,
        photoCount: (media.data ?? []).length + ((p["hero_image_url"] as string) ? 1 : 0),
        testimonialCount: testimonials.length,
        hasCredentials: Boolean(p["certifications"] || p["awards"] || p["years_in_business"]),
        hasHours: Boolean(p["hours"] && Object.keys(p["hours"] as object).length),
        socialLinks,
      });
      await step("structure");

      const copy = await generateSiteCopy({
        businessName: org.data.name ?? "",
        industry: org.data.industry ?? "",
        description: (p["description"] as string) ?? null,
        city: (p["city"] as string) ?? null,
        state: (p["state"] as string) ?? null,
        serviceArea: (p["service_area"] as string) ?? null,
        phone: (p["phone"] as string) ?? null,
        email: (p["email"] as string) ?? null,
        yearsInBusiness: (p["years_in_business"] as number) ?? null,
        hasHours: Boolean(p["hours"] && Object.keys(p["hours"] as object).length),
        style: (p["font_preference"] as string) ?? null,
        goals,
        ctaLabel: plan.primaryCtaLabel,
        services: serviceRows,
      });
      await step("copy");

      await supabase.from("ai_generations").insert({
        organization_id: orgId,
        job_id: job.id,
        kind: "website_copy",
        model: COPY_MODEL,
        instruction: null,
        result: copy as unknown as Record<string, unknown>,
        created_by: userId,
      });
      await step("conversion");

      const { error: saveError } = await supabase.from("website_settings").upsert(
        {
          organization_id: orgId,
          template: plan.template,
          generation: { ...plan, copy } as unknown as Record<string, unknown>,
          generated_at: new Date().toISOString(),
          review_state: "ready_for_review",
          publish_state: "preview",
          seo: {
            title: copy.metaTitle || plan.seoTitle,
            headline: copy.heroHeadline,
            subheadline: copy.heroSubheadline,
            meta_description: copy.metaDescription || plan.metaDescription,
            primary_cta_label: copy.primaryCta || plan.primaryCtaLabel,
            og_title: copy.ogTitle,
            og_description: copy.ogDescription,
          },
        } as never,
        { onConflict: "organization_id" },
      );
      if (saveError) throw new Error(saveError.message);
      await step("leads");
      await step("mobile");

      await supabase
        .from("generation_jobs")
        .update({
          status: "completed",
          progress: 100,
          current_step: "ready",
          steps: [...done, "ready"],
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      const leadCapture = (forms.data ?? []).length > 0 || (bookable.data ?? []).length > 0;
      await supabase.from("notifications").insert({
        organization_id: orgId,
        title: "Your website draft is ready to review",
        body: leadCapture
          ? "Revora built your site from your information and connected lead capture."
          : "Revora built your site. Turn on the quote calculator or online booking to capture leads.",
        kind: "website",
        link: "/app/website",
      });

      return { jobId: job.id, status: "completed", progress: 100 };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed.";
      await supabase
        .from("generation_jobs")
        .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
        .eq("id", job.id);
      throw new Error(message);
    }
  });

/** AI edit assistant: rewrites only the requested fields. */
export const aiEditSiteCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; instruction: string; fields: Record<string, string> }) => {
    const organizationId = String(input?.organizationId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(organizationId)) throw new Error("Invalid workspace");
    const instruction = String(input?.instruction ?? "").trim().slice(0, 400);
    if (instruction.length < 4) throw new Error("Tell Revora what to change.");
    const raw = input?.fields ?? {};
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw).slice(0, 10)) {
      if (typeof value === "string" && value.trim()) fields[key] = value.slice(0, 4000);
    }
    if (!Object.keys(fields).length) throw new Error("There's no copy to rewrite yet.");
    return { organizationId, instruction, fields };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = data.organizationId;
    const { rewriteCopyFields, COPY_MODEL } = await import("@/lib/site-engine.server");

    const [org, profile, services] = await Promise.all([
      supabase.from("organizations").select("name, industry, conversion_goal").eq("id", orgId).maybeSingle(),
      supabase.from("business_profiles").select("*").eq("organization_id", orgId).maybeSingle(),
      supabase
        .from("services")
        .select("name, description, price, starting_price")
        .eq("organization_id", orgId)
        .eq("is_active", true),
    ]);
    if (!org.data) throw new Error("Workspace not found.");
    const p = (profile.data ?? {}) as Record<string, unknown>;

    const result = await rewriteCopyFields(
      {
        businessName: org.data.name ?? "",
        industry: org.data.industry ?? "",
        description: (p["description"] as string) ?? null,
        city: (p["city"] as string) ?? null,
        state: (p["state"] as string) ?? null,
        serviceArea: (p["service_area"] as string) ?? null,
        phone: (p["phone"] as string) ?? null,
        email: (p["email"] as string) ?? null,
        yearsInBusiness: (p["years_in_business"] as number) ?? null,
        hasHours: Boolean(p["hours"] && Object.keys(p["hours"] as object).length),
        style: (p["font_preference"] as string) ?? null,
        goals: ((p["website_goals"] as string[]) ?? []).slice(0, 6),
        ctaLabel: "Get in touch",
        services: services.data ?? [],
      },
      data.fields,
      data.instruction,
    );

    await supabase.from("ai_generations").insert({
      organization_id: orgId,
      kind: "copy_edit",
      model: COPY_MODEL,
      instruction: data.instruction,
      result: result as unknown as Record<string, unknown>,
      created_by: userId,
    });

    return result;
  });
