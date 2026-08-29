import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** A client saves their own domain and gets an honest, verified status back. */
export const saveOwnDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; domain: string }) => ({
    organizationId: String(input?.organizationId ?? ""),
    domain: String(input?.domain ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { checkDomain, isValidDomain, normalizeDomain, DOMAIN_TARGET, DOMAIN_A_RECORD, requiredDnsRecords } =
      await import("@/lib/admin.server");

    // RLS scopes this read to the caller's own workspace.
    const { data: settings, error } = await context.supabase
      .from("website_settings")
      .select("id, organization_id, custom_domain")
      .eq("organization_id", data.organizationId)
      .maybeSingle();
    if (error || !settings) throw new Error("You don't have access to that workspace.");

    const domain = data.domain ? normalizeDomain(data.domain) : "";
    if (domain && !isValidDomain(domain)) throw new Error("That doesn't look like a valid domain name.");

    const check = domain
      ? await checkDomain(domain)
      : {
          status: "not_connected" as const,
          detail: "No custom domain added.",
          dnsOk: false,
          sslOk: false,
          records: null,
        };

    const { error: updateError } = await context.supabase
      .from("website_settings")
      .update({
        custom_domain: domain || null,
        domain_status: check.status,
        domain_error: check.status === "error" || check.status === "dns_pending" ? check.detail : null,
        domain_checked_at: new Date().toISOString(),
        domain_target: DOMAIN_TARGET,
        domain_verified: check.dnsOk,
        ssl_active: check.sslOk,
        dns_ok: check.dnsOk,
        ssl_ok: check.sslOk,
        domain_records: check.records,
      })
      .eq("organization_id", data.organizationId);
    if (updateError) throw new Error(updateError.message);

    return {
      ...check,
      domain,
      target: DOMAIN_TARGET,
      aRecord: DOMAIN_A_RECORD,
      required: domain ? requiredDnsRecords(domain) : [],
      live: check.dnsOk && check.sslOk,
    };
  });

/**
 * Registration lookup for a candidate name, so an owner can tell whether it is
 * worth clicking through to a registrar. RDAP is the registries' own public
 * directory: a 404 means nobody holds the name. Availability is reported as a
 * strong hint, never as a guarantee — the registrar's checkout is the truth.
 */
export const checkDomainAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { domains: string[] }) => ({
    domains: (Array.isArray(input?.domains) ? input.domains : []).slice(0, 12).map((d) => String(d)),
  }))
  .handler(async ({ data }) => {
    const { normalizeDomain, isValidDomain } = await import("@/lib/admin.server");

    const lookup = async (raw: string) => {
      const domain = normalizeDomain(raw);
      if (!domain || !isValidDomain(domain)) {
        return { domain, state: "invalid" as const };
      }
      try {
        const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
          headers: { Accept: "application/rdap+json" },
          redirect: "follow",
        });
        if (res.status === 404) return { domain, state: "available" as const };
        if (res.ok) return { domain, state: "taken" as const };
        return { domain, state: "unknown" as const };
      } catch {
        return { domain, state: "unknown" as const };
      }
    };

    const results = await Promise.all(data.domains.map(lookup));
    return { results, checkedAt: new Date().toISOString() };
  });
