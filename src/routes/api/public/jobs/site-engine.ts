import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Background worker endpoint for Revora Site Engine generation jobs.
 * Called by the scheduler (and as a non-blocking kick after a job is enqueued).
 * Bearer-authenticated; the database lease keeps concurrent runs single-flight.
 */
async function handle(request: Request): Promise<Response> {
  const denied = await authenticateCronRequest(request);
  if (denied) return denied as Response;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { drainSiteEngineQueue } = await import("@/lib/site-engine.worker.server");

  try {
    const result = await drainSiteEngineQueue(supabaseAdmin as never, {
      max: 3,
      probeWhilePaused: true,
    });
    return Response.json(result);
  } catch (error) {
    console.error("[site-engine worker]", error);
    return Response.json({ error: "Worker run failed" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/jobs/site-engine")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      GET: ({ request }) => handle(request),
    },
  },
});
