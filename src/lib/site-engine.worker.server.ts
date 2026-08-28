/**
 * Detached worker for Revora Site Engine generation jobs.
 *
 * The database is the queue and the single source of truth:
 *  - jobs are enqueued as `queued` by the authenticated request (which returns immediately)
 *  - a worker claims one job at a time with a lease, so two workers never
 *    process the same job
 *  - progress is written to the job row at every stage, so the client sees
 *    reliable progress even if the browser reloads
 *  - the queue pauses itself when AI credits run out or AI is blocked, and
 *    backs off on rate limits
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const QUEUE_ID = "site_engine";
const LEASE_SECONDS = 180;
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_TRIP = 3;

type Db = SupabaseClient<any, any, any>;

export type QueueState = {
  paused: boolean;
  pause_reason: string | null;
  pause_kind: string | null;
  consecutive_rate_limits: number;
};

async function readQueueState(db: Db): Promise<QueueState> {
  const { data } = await db
    .from("job_queue_state")
    .select("paused, pause_reason, pause_kind, consecutive_rate_limits")
    .eq("id", QUEUE_ID)
    .maybeSingle();
  return (
    (data as QueueState | null) ?? {
      paused: false,
      pause_reason: null,
      pause_kind: null,
      consecutive_rate_limits: 0,
    }
  );
}

async function writeQueueState(db: Db, patch: Record<string, unknown>) {
  await db
    .from("job_queue_state")
    .upsert({ id: QUEUE_ID, ...patch, updated_at: new Date().toISOString() } as never, { onConflict: "id" });
}

async function pauseQueue(db: Db, kind: "credits" | "blocked" | "rate_limit", reason: string) {
  await writeQueueState(db, {
    paused: true,
    pause_kind: kind,
    pause_reason: reason,
    paused_at: new Date().toISOString(),
    last_error: reason,
  });
}

export async function resumeQueue(db: Db) {
  await writeQueueState(db, {
    paused: false,
    pause_kind: null,
    pause_reason: null,
    paused_at: null,
    consecutive_rate_limits: 0,
  });
}

/** Claims one runnable job with a lease. Returns null when there is nothing to do. */
async function claimJob(db: Db, organizationId?: string) {
  const now = new Date();
  let query = db
    .from("generation_jobs")
    .select("id, organization_id, attempts, created_by, status, lease_expires_at")
    .in("status", ["queued", "processing"])
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(5);
  if (organizationId) query = query.eq("organization_id", organizationId);

  const { data: candidates } = await query;
  for (const job of candidates ?? []) {
    const leaseFree = !job.lease_expires_at || new Date(job.lease_expires_at as string) < now;
    if (!leaseFree) continue;

    // Conditional update = single-flight lock: only one worker wins the row.
    const { data: claimed } = await db
      .from("generation_jobs")
      .update({
        status: "processing",
        attempts: (job.attempts as number) + 1,
        started_at: job.status === "queued" ? now.toISOString() : undefined,
        lease_expires_at: new Date(now.getTime() + LEASE_SECONDS * 1000).toISOString(),
        updated_at: now.toISOString(),
      } as never)
      .eq("id", job.id)
      .eq("attempts", job.attempts as number)
      .select("id, organization_id, created_by")
      .maybeSingle();
    if (claimed) return claimed as { id: string; organization_id: string; created_by: string | null };
  }
  return null;
}

/** Runs the nine generation stages for one claimed job using the privileged client. */
async function runJob(db: Db, job: { id: string; organization_id: string; created_by: string | null }) {
  const orgId = job.organization_id;
  const { GENERATION_STEPS } = await import("@/lib/site-engine");
  const { generateWebsitePlan } = await import("@/lib/website-plan");
  const { generateSiteCopy, COPY_MODEL } = await import("@/lib/site-engine.server");

  const done: string[] = [];
  const step = async (key: string) => {
    done.push(key);
    const meta = GENERATION_STEPS.find((s) => s.key === key);
    await db
      .from("generation_jobs")
      .update({
        current_step: key,
        progress: meta?.progress ?? 0,
        steps: done,
        lease_expires_at: new Date(Date.now() + LEASE_SECONDS * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", job.id);
  };

  const [org, profile, services, media, socials, forms, bookable] = await Promise.all([
    db.from("organizations").select("name, industry, conversion_goal").eq("id", orgId).maybeSingle(),
    db.from("business_profiles").select("*").eq("organization_id", orgId).maybeSingle(),
    db
      .from("services")
      .select("name, description, price, starting_price")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("sort_order"),
    db.from("media").select("id").eq("organization_id", orgId),
    db.from("social_profiles").select("*").eq("organization_id", orgId).maybeSingle(),
    db.from("quote_forms").select("id").eq("organization_id", orgId).eq("is_active", true),
    db.from("services").select("id").eq("organization_id", orgId).eq("bookable", true),
  ]);

  if (!org.data) throw new Error("Workspace not found.");
  await step("business");

  const p = (profile.data ?? {}) as Record<string, unknown>;
  const serviceRows = (services.data ?? []) as {
    name: string;
    description?: string | null;
    price?: number | null;
    starting_price?: number | null;
  }[];
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

  await db.from("ai_generations").insert({
    organization_id: orgId,
    job_id: job.id,
    kind: "website_copy",
    model: COPY_MODEL,
    instruction: null,
    result: copy as unknown as never,
    created_by: job.created_by,
  } as never);
  await step("conversion");

  const { error: saveError } = await db.from("website_settings").upsert(
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

  await db
    .from("generation_jobs")
    .update({
      status: "completed",
      progress: 100,
      current_step: "ready",
      steps: [...done, "ready"],
      completed_at: new Date().toISOString(),
      lease_expires_at: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", job.id);

  const leadCapture = (forms.data ?? []).length > 0 || (bookable.data ?? []).length > 0;
  await db.from("notifications").insert({
    organization_id: orgId,
    title: "Your website draft is ready to review",
    body: leadCapture
      ? "Revora built your site from your information and connected lead capture."
      : "Revora built your site. Turn on the quote calculator or online booking to capture leads.",
    kind: "website",
    link: "/app/website",
  } as never);
}

export type DrainResult = {
  processed: number;
  failed: number;
  paused: boolean;
  pauseReason: string | null;
  idle: boolean;
};

/**
 * Processes a bounded batch of jobs. Safe to call from cron, from a kick after
 * enqueue, or from the client's polling hook — the lease keeps it single-flight.
 */
export async function drainSiteEngineQueue(
  db: Db,
  options: { max?: number; organizationId?: string; probeWhilePaused?: boolean } = {},
): Promise<DrainResult> {
  const max = Math.min(Math.max(options.max ?? 2, 1), 5);
  const state = await readQueueState(db);

  // Paused-state guard. While paused we run at most one probe item, so the queue
  // recovers on its own once credits are topped up or the block is lifted.
  let budget = max;
  if (state.paused) {
    if (state.pause_kind === "rate_limit") {
      await resumeQueue(db); // rate limits are transient — the next run retries
    } else if (options.probeWhilePaused) {
      budget = 1;
    } else {
      return { processed: 0, failed: 0, paused: true, pauseReason: state.pause_reason, idle: true };
    }
  }

  await writeQueueState(db, { last_run_at: new Date().toISOString() });

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < budget; i += 1) {
    const job = await claimJob(db, options.organizationId);
    if (!job) return { processed, failed, paused: false, pauseReason: null, idle: processed + failed === 0 };

    try {
      await runJob(db, job);
      processed += 1;
      if (state.paused || state.consecutive_rate_limits > 0) await resumeQueue(db);
    } catch (error) {
      failed += 1;
      const { AiGatewayError } = await import("@/lib/site-engine.server");
      const isGateway = error instanceof AiGatewayError;
      const status = isGateway ? (error as InstanceType<typeof AiGatewayError>).status : 0;
      const message = error instanceof Error ? error.message : "Generation failed.";

      // Circuit breaker: stop the whole queue on credit/policy denials.
      if (status === 402 || status === 403) {
        await pauseQueue(db, status === 402 ? "credits" : "blocked", message);
        await db
          .from("generation_jobs")
          .update({ status: "failed", error_message: message, completed_at: new Date().toISOString(), lease_expires_at: null } as never)
          .eq("id", job.id);
        return { processed, failed, paused: true, pauseReason: message, idle: false };
      }

      if (status === 429) {
        const rl = state.consecutive_rate_limits + 1;
        await writeQueueState(db, { consecutive_rate_limits: rl, last_error: message });
        if (rl >= RATE_LIMIT_TRIP) await pauseQueue(db, "rate_limit", message);
        // leave the job retryable — the lease expires and a later run picks it up
        await db
          .from("generation_jobs")
          .update({ status: "queued", error_message: message, lease_expires_at: null } as never)
          .eq("id", job.id);
        return { processed, failed, paused: rl >= RATE_LIMIT_TRIP, pauseReason: message, idle: false };
      }

      // Ordinary failure: retry until MAX_ATTEMPTS, then mark it failed for good.
      const { data: current } = await db
        .from("generation_jobs")
        .select("attempts")
        .eq("id", job.id)
        .maybeSingle();
      const attempts = (current?.attempts as number | undefined) ?? MAX_ATTEMPTS;
      await db
        .from("generation_jobs")
        .update(
          attempts >= MAX_ATTEMPTS
            ? { status: "failed", error_message: message, completed_at: new Date().toISOString(), lease_expires_at: null }
            : { status: "queued", error_message: message, lease_expires_at: null },
        )
        .eq("id", job.id);
      await writeQueueState(db, { last_error: message });
    }
  }

  return { processed, failed, paused: false, pauseReason: null, idle: processed + failed === 0 };
}
