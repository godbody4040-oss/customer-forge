/**
 * Delivery logging for booking + lead alert emails.
 *
 * Members can read their own history (RLS), but only the system writes it, so
 * the log is a trustworthy record of what the email provider actually accepted.
 */
import type { DeliveryResult } from "@/lib/messaging.server";

export async function logAlertDelivery(
  _caller: unknown,
  entry: {
    organizationId: string;
    leadId: string | null;
    recipient: string;
    kind: string;
    result: DeliveryResult;
  },
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("lead_alert_log").insert({
      organization_id: entry.organizationId,
      lead_id: entry.leadId,
      recipient: entry.recipient,
      kind: entry.kind,
      status: entry.result.ok ? "sent" : "failed",
      reason: entry.result.ok ? null : entry.result.reason,
    } as never);
  } catch (error) {
    console.error("alert delivery log failed", error);
  }
}
