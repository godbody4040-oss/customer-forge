import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Scheduled worker for onboarding + retention emails (welcome, setup reminders,
 * booking follow-up, win-back). Bearer-authenticated; the lifecycle log makes
 * repeated runs safe.
 */
async function handle(request: Request): Promise<Response> {
  const denied = await authenticateCronRequest(request);
  if (denied) return denied as Response;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { runLifecycleEmails } = await import("@/lib/lifecycle-email.server");

  try {
    const result = await runLifecycleEmails(supabaseAdmin as never, { limit: 40, max: 25 });
    return Response.json(result);
  } catch (error) {
    console.error("[lifecycle email worker]", error);
    return Response.json({ error: "Lifecycle email run failed" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/jobs/lifecycle-email")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      GET: ({ request }) => handle(request),
    },
  },
});
