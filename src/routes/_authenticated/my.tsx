/**
 * Standalone client portal app.
 *
 * This is the app a Revora client opens in their own browser: their website,
 * their leads, their bookings and their setup steps — without the builder's
 * tooling around it. It reads the same workspace data the builder writes, so
 * what a client sees here always matches what is live.
 */
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { CalendarCheck, Globe, Home, LogOut, Rocket, Users } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useSignOut, useWorkspace } from "@/lib/use-tenant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/my")({
  head: () => ({
    meta: [
      { title: "My Revora portal — website, leads and bookings" },
      {
        name: "description",
        content:
          "Your own Revora portal: see your live website, the leads and bookings it captured, and the steps left to finish setup.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalApp,
});

const NAV = [
  { to: "/my", label: "Home", icon: Home, exact: true },
  { to: "/my/site", label: "My website", icon: Globe, exact: false },
  { to: "/my/activity", label: "Leads & bookings", icon: Users, exact: false },
  { to: "/my/start", label: "Setup steps", icon: Rocket, exact: false },
] as const;

function PortalApp() {
  const { data: ws } = useWorkspace();
  const org = ws?.workspace?.organization;
  const signOut = useSignOut();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4">
          <LogoMark className="h-7 w-7 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold leading-tight">
              {org?.name ?? "Your business"}
            </p>
            <p className="text-[11px] text-muted-foreground">Client portal</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
            aria-label="Sign out"
            className="cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <nav className="border-b border-border bg-card/40">
        <div className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-2 py-2">
          {NAV.map((item) => {
            const active = item.exact ? path === "/my" || path === "/my/" : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-elevated hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
        <Outlet />
      </main>

      <footer className="border-t border-border py-5">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 text-[12px] text-muted-foreground">
          <span>Powered by Revora Growth Systems</span>
          <Link to="/app" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <CalendarCheck className="h-3.5 w-3.5" />
            Open the full builder
          </Link>
        </div>
      </footer>
    </div>
  );
}
