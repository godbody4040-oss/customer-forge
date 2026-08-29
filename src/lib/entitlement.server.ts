/**
 * Server-side paywall. The dashboard also hides paid features in the UI, but
 * that is cosmetic — every paid server capability must call this, because a
 * client can call server functions directly.
 *
 * Billing state is read with the user's own client (RLS), and the columns it
 * reads can only be written by verified payment webhooks / platform admins.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type Entitlement = { allowed: boolean; reason: string };

export async function orgEntitlement(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Entitlement> {
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, is_demo, is_suspended, subscription_status, trial_ends_at, setup_paid_at")
    .eq("id", organizationId)
    .maybeSingle();
  if (error || !org) return { allowed: false, reason: "We couldn't verify your workspace." };
  if (org.is_suspended) return { allowed: false, reason: "This workspace is suspended." };
  if (org.is_demo) return { allowed: true, reason: "demo" };

  const trialActive =
    org.subscription_status === "trialing" &&
    Boolean(org.trial_ends_at) &&
    new Date(org.trial_ends_at as string).getTime() >= Date.now();
  const paidStatus = org.subscription_status === "active" || org.subscription_status === "past_due";
  if (trialActive || paidStatus || org.setup_paid_at) return { allowed: true, reason: "entitled" };

  return {
    allowed: false,
    reason: "Your free access has ended. Complete the $750 setup payment to keep using your system.",
  };
}

/** Throws a plain, user-safe error when the workspace isn't entitled. */
export async function assertOrgEntitled(supabase: SupabaseClient, organizationId: string) {
  const result = await orgEntitlement(supabase, organizationId);
  if (!result.allowed) throw new Error(result.reason);
  return result;
}
