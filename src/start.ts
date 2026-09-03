import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { isTrafficDomainHost, trafficRedirectUrl } from "@/lib/revora-address";
import { withSecurityHeaders } from "@/lib/security-headers";

/**
 * Production security headers on every response — platform pages, client
 * websites, API routes and error pages alike. It runs outermost so even a
 * crash-rendered error page is protected, and it never overwrites a header a
 * handler set on purpose.
 */
const securityHeadersMiddleware = createMiddleware().server(async ({ next, request }) => {
  const https = request
    ? (request.headers.get("x-forwarded-proto") ??
        new URL(request.url).protocol.replace(":", "")) === "https"
    : true;
  const result = (await next()) as unknown;
  if (result instanceof Response) return withSecurityHeaders(result, { https }) as never;
  if (result && typeof result === "object" && "response" in result) {
    const holder = result as { response: unknown };
    if (holder.response instanceof Response) {
      holder.response = withSecurityHeaders(holder.response, { https });
    }
  }
  return result as never;
});

/**
 * `revoraweb.site` is a TRAFFIC-ONLY domain: it never serves the application
 * and never serves a client website. Anything arriving on it (apex, www, or any
 * subdomain) is permanently redirected to the platform domain, preserving the
 * path so marketing links keep working. The target origin is hardcoded, so no
 * query parameter or header can turn this into an open redirect, and the
 * platform domain itself is never redirected, so no loop is possible.
 */
/** Query marker proving a request already passed through the traffic redirect. */
const TRAFFIC_REDIRECT_MARKER = "_rw";

const trafficDomainRedirect = createMiddleware().server(async ({ next, request }) => {
  if (!request) return next();
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  if (!isTrafficDomainHost(host)) return next();
  // Loop protection. If the hosting layer is ever configured with the traffic
  // domain as the primary domain, it bounces the platform domain back here and
  // this redirect would ping-pong forever. The marker below survives that
  // bounce, so a request that has already been redirected once is served
  // instead of redirected again — the platform stays reachable no matter how
  // the domains are configured. Normal traffic-domain visits never carry it.
  if (url.searchParams.has(TRAFFIC_REDIRECT_MARKER)) return next();
  const search = url.search
    ? `${url.search}&${TRAFFIC_REDIRECT_MARKER}=1`
    : `?${TRAFFIC_REDIRECT_MARKER}=1`;
  return new Response(null, {
    status: request.method === "GET" || request.method === "HEAD" ? 301 : 308,
    headers: {
      location: trafficRedirectUrl(url.pathname, search),
      "cache-control": "public, max-age=3600",
    },
  }) as never;
});

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
  // The platform domain is the only application origin. `revoraweb.site` is a
  // traffic/redirect domain and is never trusted as a server-function origin.
  origin: (origin, ctx) => origin === new URL(ctx.request.url).origin,
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [
    securityHeadersMiddleware,
    trafficDomainRedirect,
    errorMiddleware,
    csrfMiddleware,
    customDomainRedirect,
  ],
}));
