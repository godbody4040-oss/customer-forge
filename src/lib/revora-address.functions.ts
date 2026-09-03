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

/**
 * Live DNS + HTTPS check for the workspace's FREE REVORA ADDRESS.
 *
 * The free address only works once the hosting domain's wildcard record exists
 * and HTTPS answers on that hostname, so the status is always derived from a
 * real lookup rather than assumed. Errors are phrased for a business owner and
 * name the exact record that is missing.
 */
export const checkRevoraAddressLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parse)
  .handler(async ({ data, context }) => {
    const { data: settings, error } = await context.supabase
      .from("website_settings")
      .select("organization_id, subdomain")
      .eq("organization_id", data.organizationId)
      .maybeSingle();
    if (error || !settings) throw new Error("You don't have access to that workspace.");

    const host = revoraHost(settings.subdomain);
    if (!host) throw new Error("This workspace doesn't have a free Revora address yet.");

    const { checkDomain, DOMAIN_A_RECORD } = await import("@/lib/admin.server");
    const { SITE_ROOT } = await import("@/lib/revora-address");
    // The free address is served either directly (wildcard A → platform) or
    // through the Cloudflare proxy (wildcard A → Cloudflare edge), so DNS is
    // judged by "public answers + HTTPS works" rather than one fixed record.
    const check = await checkDomain(host, { proxied: true });

    const detail =
      check.dnsOk && check.sslOk && check.records.servesThisSite
        ? `${host} is live and secured with HTTPS.`
        : !check.dnsOk
          ? `${host} doesn't resolve yet. The hosting domain needs a wildcard A record (* → ${DOMAIN_A_RECORD}) — directly at your registrar, or proxied inside Cloudflare.`
          : `${host} resolves, but HTTPS isn't answering yet. If you use Cloudflare, keep the proxy on (orange cloud) with the Worker route covering *${SITE_ROOT}/*. Otherwise, certificates can take a few minutes after the address first resolves.`;

    const live = check.dnsOk && check.sslOk && check.records.servesThisSite;
    const checkedAt = new Date().toISOString();

    // Record the proven state so every other screen (launch checklist, portal,
    // canonical URLs) reads a verified fact instead of assuming the hostname
    // works. A failed probe clears the flag, so a hostname that stops answering
    // stops being advertised.
    await context.supabase
      .from("website_settings")
      .update({ revora_host_ok: live, revora_host_checked_at: checkedAt })
      .eq("organization_id", data.organizationId);

    return {
      host,
      url: `https://${host}`,
      dnsOk: check.dnsOk,
      sslOk: check.sslOk,
      live,
      status: check.status,
      detail,
      expected: check.records.a.includes(DOMAIN_A_RECORD)
        ? DOMAIN_A_RECORD
        : `Cloudflare edge (proxied ${SITE_ROOT})`,
      checkedAt,
    };
  });
