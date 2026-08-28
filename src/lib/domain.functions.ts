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
    const { checkDomain, isValidDomain, normalizeDomain, DOMAIN_TARGET } = await import(
      "@/lib/admin.server"
    );

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
      : { status: "not_connected" as const, detail: "No custom domain added." };

    const { error: updateError } = await context.supabase
      .from("website_settings")
      .update({
        custom_domain: domain || null,
        domain_status: check.status,
        domain_error: check.status === "error" || check.status === "dns_pending" ? check.detail : null,
        domain_checked_at: new Date().toISOString(),
        domain_target: DOMAIN_TARGET,
        domain_verified: check.status === "connected" || check.status === "ssl_active",
        ssl_active: check.status === "ssl_active",
      })
      .eq("organization_id", data.organizationId);
    if (updateError) throw new Error(updateError.message);

    return { ...check, domain, target: DOMAIN_TARGET };
  });
