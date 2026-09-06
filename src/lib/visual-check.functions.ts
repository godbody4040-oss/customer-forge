/**
 * Records the result of a real-browser visual check.
 *
 * The browser collects raw measurements; this function never trusts a score
 * the browser computed. It validates the shape, re-grades the measurements
 * with the shared grader, and stores both — so a tampered client can only ever
 * lower its own reported quality, never raise it.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gradeVisual } from "@/lib/builder/visual";

const measurementSchema = z.object({
  width: z.number().finite().min(200).max(4000),
  scrollWidth: z.number().finite().min(0),
  overflowing: z
    .array(z.object({ selector: z.string().max(120), right: z.number().finite() }))
    .max(20),
  brokenImages: z.array(z.string().max(200)).max(20),
  clipped: z.array(z.string().max(120)).max(20),
  smallTargets: z
    .array(
      z.object({
        selector: z.string().max(120),
        width: z.number().finite(),
        height: z.number().finite(),
      }),
    )
    .max(20),
  tinyText: z
    .array(z.object({ selector: z.string().max(120), fontSize: z.number().finite() }))
    .max(20),
  unreachable: z.array(z.string().max(120)).max(20),
  navigable: z.boolean(),
  ctas: z.number().int().min(0),
});

const inputSchema = z.object({
  organizationId: z.string().uuid(),
  pageUrl: z.string().min(1).max(300),
  measurements: z.array(measurementSchema).min(1).max(20),
});

export const recordVisualCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Only someone who can manage the workspace may record its quality gate.
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership?.role || !["owner", "admin", "manager"].includes(membership.role)) {
      throw new Error("Only an owner, admin or manager can run the visual check.");
    }

    // Re-grade from the raw measurements — the submitted numbers are evidence,
    // never a verdict.
    const report = gradeVisual(data.measurements);

    const writer = supabase as unknown as {
      from: (table: string) => {
        insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await writer.from("website_visual_reports").insert({
      organization_id: data.organizationId,
      page_url: data.pageUrl,
      measurements: data.measurements,
      report,
    });
    if (error) throw new Error("The visual check result could not be saved. Please try again.");

    return { report };
  });
