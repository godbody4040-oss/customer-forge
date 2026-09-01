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
  try {
    const { resolveTenantHost } = await import("./lib/site-host.server");
    const tenant = await resolveTenantHost(request.headers.get("host"));
    if (tenant?.via === "revora" && tenant.redirectHost) {
      return new Response(null, {
        status: 301,
        headers: { location: `https://${tenant.redirectHost}${url.pathname}${url.search}` },
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

