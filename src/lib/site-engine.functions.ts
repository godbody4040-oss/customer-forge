import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Revora Site Engine server functions.
 *
 * All reads and writes go through the caller's authenticated client, so tenant
 * isolation is enforced by row level security — a client can only ever generate
 * or edit their own website.
 */

export type RunResult = { jobId: string; status: string; progress: number; queued: boolean };

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

    // RLS enforces that the caller belongs to this workspace.
    const { data: existing } = await supabase
      .from("generation_jobs")
      .select("id, status, progress")
      .eq("organization_id", orgId)
      .in("status", ["queued", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing)
      return { jobId: existing.id, status: existing.status, progress: existing.progress, queued: true };

    const { data: job, error } = await supabase
      .from("generation_jobs")
      .insert({
        organization_id: orgId,
        status: "queued",
        progress: 0,
        current_step: null,
        created_by: userId,
        steps: [],
      })
      .select("id")
      .single();
    if (error || !job) throw new Error(error?.message ?? "Couldn't queue the build.");

    // Non-blocking kick so the worker usually starts immediately; the scheduled
    // run and the client's pump call are the fallbacks.
    void kickWorker(new URL(getRequest().url).origin);

    return { jobId: job.id, status: "queued", progress: 0, queued: true };
  });

async function kickWorker(origin: string) {
  const secret = process.env["LOVABLE_CRON_SECRET"];
  const base = process.env["APP_URL"] ?? origin;
  if (!secret || !base) return;
  try {
    await fetch(`${base.replace(/\/$/, "")}/api/public/jobs/site-engine`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
  } catch {
    // The scheduled worker run and the client pump still pick the job up.
  }
}

/**
 * Advances the queue for the caller's own workspace. The client polling hook
 * calls this, so generation always progresses even without a scheduler — the
 * database lease guarantees a job is never processed twice.
 */
export const pumpSiteEngineQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string }) => {
    const organizationId = String(input?.organizationId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(organizationId)) throw new Error("Invalid workspace");
    return { organizationId };
  })
  .handler(async ({ data, context }) => {
    // Verify membership with the caller's RLS-scoped client before using admin.
    const { data: member } = await context.supabase
      .from("memberships")
      .select("organization_id")
      .eq("organization_id", data.organizationId)
      .limit(1)
      .maybeSingle();
    if (!member) throw new Error("You don't have access to that workspace.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { drainSiteEngineQueue } = await import("@/lib/site-engine.worker.server");
    return drainSiteEngineQueue(supabaseAdmin as never, {
      max: 1,
      organizationId: data.organizationId,
      probeWhilePaused: true,
    });
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
      result: result as unknown as never,
      created_by: userId,
    });

    return result;
  });
