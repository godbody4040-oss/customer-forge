import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

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
    const tenant = await resolveTenantHost(request.headers.get("host"));
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
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware, customDomainRedirect],
}));

