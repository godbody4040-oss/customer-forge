/**
 * Claiming and checking the FREE REVORA ADDRESS.
 *
 * Every workspace already owns one (assigned automatically). An owner may
 * rename it to something they like better, as long as it is free and not a
 * reserved system name. Uniqueness is guaranteed by a unique index in the
 * database, so two clients can never end up on the same address even if they
 * click at the same moment.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { revoraHost, revoraUrl, validateSubdomain } from "@/lib/revora-address";

const parse = (input: { organizationId?: string; subdomain?: string }) => ({
  organizationId: String(input?.organizationId ?? ""),
  subdomain: String(input?.subdomain ?? ""),
});

/** Is this address free? Answers with a boolean only — no other tenant data. */
export const checkRevoraAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parse)
  .handler(async ({ data }) => {
    const check = validateSubdomain(data.subdomain);
    if (!check.ok) return { available: false, subdomain: null, reason: check.error };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: taken } = await supabaseAdmin
      .from("website_settings")
      .select("organization_id")
      .eq("subdomain", check.value)
      .maybeSingle();

    const mine = !!taken && taken.organization_id === data.organizationId;
    return {
      available: !taken || mine,
      subdomain: check.value,
      reason: taken && !mine ? "That address is already taken. Try another." : null,
    };
  });

/** Saves the workspace's free Revora address. */
export const claimRevoraAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parse)
  .handler(async ({ data, context }) => {
    const check = validateSubdomain(data.subdomain);
    if (!check.ok) throw new Error(check.error);

    // RLS scopes this write to the caller's own workspace, so one client can
    // never rename another client's address.
    const { data: row, error } = await context.supabase
      .from("website_settings")
      .update({ subdomain: check.value })
      .eq("organization_id", data.organizationId)
      .select("organization_id, subdomain")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") throw new Error("That address is already taken. Try another.");
      if (error.code === "23514") throw new Error("That address isn't allowed. Try another.");
      throw new Error(error.message);
    }
    if (!row) throw new Error("You don't have access to that workspace.");

    return {
      subdomain: row.subdomain,
      host: revoraHost(row.subdomain),
      url: revoraUrl(row.subdomain),
    };
  });
