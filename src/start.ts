import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { SITE_ROOT } from "@/lib/revora-address";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  // Lovable email/webhook routes authenticate themselves — pass them through untouched.
  if (request && new URL(request.url).pathname.startsWith("/lovable/")) {
    return next();
  }
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    // Record real production crashes so they are actionable instead of lost in
    // a log. Never let tracking failure mask the original error.
    try {
      const { captureError } = await import("./lib/monitoring.server");
      await captureError(error, {
        source: "server",
        level: "fatal",
        statusCode: 500,
        route: request ? new URL(request.url).pathname : null,
      });
    } catch {
      /* monitoring is best-effort */
    }
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Once a client verifies their own domain, the free Revora address keeps
// working but permanently redirects there, so old links and search results
// move over to the domain they bought.
const customDomainRedirect = createMiddleware().server(async ({ next, request }) => {
  if (!request) return next();
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/lovable/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_serverFn/")
  ) {
    return next();
  }
  // The hosting domain only ever serves client websites on their own
  // subdomain. Its bare root is not a product page and is deliberately NOT
  // redirected to the platform domain — it renders a neutral, noindex holding
  // page instead (see src/lib/host-site.functions.ts).

  try {
    const { resolveTenantHost } = await import("./lib/site-host.server");
    const { isRevoraOwnHost, normalizeHost } = await import("./lib/revora-address");
    // Requests served through the Cloudflare client-hosting proxy carry the
    // real client hostname in X-Forwarded-Host; direct requests use Host.
    const rawHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const tenant = await resolveTenantHost(rawHost);
    const target = tenant?.redirectHost ? normalizeHost(tenant.redirectHost) : null;
    // Only ever redirect a client subdomain to that client's OWN verified
    // domain. Never to a Revora host, and never to the host already being
    // requested — either would create a redirect loop with the hosting layer's
    // own primary-domain redirect.
    if (
      tenant?.via === "revora" &&
      target &&
      target !== normalizeHost(url.hostname) &&
      !isRevoraOwnHost(target)
    ) {
      return new Response(null, {
        status: 301,
        headers: { location: `https://${target}${url.pathname}${url.search}` },
      });
    }
  } catch {
    // Never block a page render because address lookup failed.
  }
  return next();
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  // Client websites are served on *.revoraweb.site through the Cloudflare
  // proxy, so a visitor's browser legitimately POSTs server-function calls
  // with an Origin of their own client subdomain. That entire domain is
  // Revora's hosting domain — every origin on it is a site this app serves —
  // so it is trusted. Everything else must still match the request's origin.
  origin: (origin, ctx) => {
    if (origin === new URL(ctx.request.url).origin) return true;
    try {
      const hostname = new URL(origin).hostname.toLowerCase();
      return hostname === SITE_ROOT || hostname.endsWith(`.${SITE_ROOT}`);
    } catch {
      return false;
    }
  },
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware, customDomainRedirect],
}));
