import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile, enforceSessionPolicy, resolvePostLoginPath } from "@/lib/auth-session";
import { ORGANIZATION_SCHEMA, WEBSITE_SCHEMA } from "@/lib/seo";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">This page doesn't exist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may be out of date, or the business page you're looking for has moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to Revora
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Something broke</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We hit an unexpected error. Try again, or head back to the start.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-elevated"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Revora — The Business Growth Operating System" },
      {
        name: "description",
        content:
          "Revora gives businesses one powerful system to get discovered, capture opportunities, convert leads, book customers, automate follow-up and measure growth.",
      },
      { name: "author", content: "Revora" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Revora Growth Systems" },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { name: "theme-color", content: "#0A0A0C" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Revora" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(ORGANIZATION_SCHEMA) },
      { type: "application/ld+json", children: JSON.stringify(WEBSITE_SCHEMA) },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      { rel: "icon", type: "image/png", sizes: "64x64", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    // Entry pages a returning client can land on after signing back in
    // (email/password, magic link, or an OAuth round-trip back to the origin).
    const entryPaths = new Set(["/", "/auth"]);

    async function sendToDashboard() {
      if (!entryPaths.has(window.location.pathname)) return;
      let target: string | null = null;
      try {
        const stored = sessionStorage.getItem("lle:redirect");
        if (stored && stored.startsWith("/")) {
          sessionStorage.removeItem("lle:redirect");
          target = stored;
        }
      } catch {
        /* storage unavailable */
      }
      target = target ?? (await resolvePostLoginPath());
      if (target === "/auth") return;
      if (window.location.pathname === target) return;
      void router.navigate({ to: target, replace: true });
    }

    // Returning client with a persisted session landing on a public entry page.
    // Session-only ("remember me" off) logins are ended first.
    void enforceSessionPolicy().then(async (cleared) => {
      if (cleared) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) void sendToDashboard();
    });

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event !== "SIGNED_OUT") void ensureProfile();
      router.invalidate();
      if (event !== "SIGNED_OUT") {
        queryClient.invalidateQueries();
        if (event === "SIGNED_IN") void sendToDashboard();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
