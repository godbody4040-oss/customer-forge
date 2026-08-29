import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ExternalLink,
  Globe,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  QrCode,
  Rocket,
  Settings,
  Shield,
  Star,

  Users,
  Wrench,
  X,
  Calculator,
  Zap,
  CreditCard,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/app/Bits";
import { useNotifications } from "@/lib/queries";
import { useSignOut, useWorkspace } from "@/lib/use-tenant";
import { endSupportSession } from "@/lib/admin.functions";
import { useSupportMode, writeSupportMode } from "@/lib/support-mode";
import { dateLong, relative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBillingState } from "@/lib/stripe.hooks";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/leads", label: "Leads", icon: Users, exact: false },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays, exact: false },
  { to: "/app/services", label: "Services", icon: Wrench, exact: false },
  { to: "/app/quotes", label: "Quote calculator", icon: Calculator, exact: false },
  { to: "/app/automations", label: "Automations", icon: Zap, exact: false },
  { to: "/app/campaigns", label: "Campaigns & QR", icon: QrCode, exact: false },
  { to: "/app/reviews", label: "Reviews", icon: Star, exact: false },
  { to: "/app/website", label: "Website", icon: Globe, exact: false },
  { to: "/app/domain", label: "Domain", icon: Globe2, exact: false },
  { to: "/app/launch", label: "Launch", icon: Rocket, exact: false },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { to: "/app/billing", label: "Billing", icon: CreditCard, exact: false },
  { to: "/app/settings", label: "Settings", icon: Settings, exact: false },
] as const;

function AppShell() {
  const { data, isLoading } = useWorkspace();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const [navOpen, setNavOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const org = data?.workspace?.organization;
  const { data: notifications } = useNotifications(org?.id);
  const unread = (notifications ?? []).filter((n) => !n.is_read).length;
  const { mode: supportMode } = useSupportMode();
  const endSupport = useServerFn(endSupportSession);
  const supporting = Boolean(data?.supporting && supportMode);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: billing, isLoading: billingLoading } = useBillingState(org?.id);
  const trialStillActive = Boolean(
    org &&
      org.subscription_status === "trialing" &&
      org.trial_ends_at &&
      new Date(org.trial_ends_at).getTime() >= Date.now(),
  );
  const trialHoursLeft = trialStillActive && org?.trial_ends_at
    ? Math.max(1, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 3_600_000))
    : 0;
  const paymentRequired = Boolean(
    org && !org.is_demo && !billing?.active && !trialStillActive && !data?.isSuperAdmin && !supporting,
  );
  const paymentLocked = paymentRequired && !pathname.startsWith("/app/billing");

  useEffect(() => {
    if (!isLoading && data && !data.workspace) navigate({ to: "/onboarding", replace: true });
  }, [data, isLoading, navigate]);


  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "border-border bg-card lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-r",
          navOpen ? "block" : "hidden lg:block",
        )}
      >
        <div className="flex h-16 items-center border-b border-border px-4">
          <Link to="/app" onClick={() => setNavOpen(false)}>
            <Logo />
          </Link>
        </div>
        <nav aria-label="App" className="flex flex-col gap-0.5 p-2.5">
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact }}
              onClick={() => setNavOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
              activeProps={{ className: "bg-elevated text-foreground" }}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        {org ? (
          <div className="mx-2.5 mt-2 rounded-md border border-border p-3">
            <p className="eyebrow">Your site</p>
            <p className="mt-1 truncate text-[13px] font-medium">{org.name}</p>
            <Link
              to="/s/$slug"
              params={{ slug: org.slug }}
              target="_blank"
              className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline"
            >
              View live site <ExternalLink className="size-3" />
            </Link>
          </div>
        ) : null}

        {data?.isSuperAdmin ? (
          <div className="p-2.5">
            <Link
              to="/admin"
              onClick={() => setNavOpen(false)}
              className="flex items-center gap-2.5 rounded-md border border-border px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
            >
              <Shield className="size-4" aria-hidden="true" /> Platform admin
            </Link>
          </div>
        ) : null}

        <div className="p-2.5">
          <button
            type="button"
            onClick={async () => {
              writeSupportMode(null);
              await signOut();
              navigate({ to: "/auth", replace: true });
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {supporting && supportMode ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent/40 bg-accent/15 px-4 py-2.5">
            <p className="flex items-center gap-2 text-[12px]">
              <LifeBuoy className="size-4 text-accent" aria-hidden="true" />
              <span>
                <strong>Support mode</strong> — you are working inside {supportMode.organizationName}. This
                session started {dateLong(supportMode.startedAt)} and is recorded in the audit log.
              </span>
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await endSupport({ data: { sessionId: supportMode.sessionId } });
                writeSupportMode(null);
                navigate({ to: "/admin/clients/$orgId", params: { orgId: supportMode.organizationId } });
              }}
            >
              End support session
            </Button>
          </div>
        ) : null}

        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="grid size-9 cursor-pointer place-items-center rounded-md border border-border text-muted-foreground lg:hidden"
              aria-label={navOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={navOpen}
              onClick={() => setNavOpen((v) => !v)}
            >
              {navOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
            <LogoMark className="lg:hidden" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate font-display text-[14px] font-semibold">
                {org ? `Welcome back, ${org.name}` : "Your business"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {supporting
                  ? "Platform support session"
                  : data?.workspace?.role
                    ? `Signed in as ${data.workspace.role}`
                    : "Loading…"}
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2">
            {trialStillActive ? (
              <Pill tone="attention">
                {trialHoursLeft > 1
                  ? `Free day · ${trialHoursLeft}h left`
                  : "Free day · under 1h left"}
              </Pill>
            ) : org?.subscription_status === "trialing" ? (
              <Pill tone="attention">Trial</Pill>
            ) : null}
            {org?.is_demo ? <Pill tone="info">Demo data</Pill> : null}
            <div className="relative">
              <button
                type="button"
                onClick={() => setBellOpen((v) => !v)}
                aria-label="Notifications"
                aria-expanded={bellOpen}
                className="relative grid size-9 cursor-pointer place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
              >
                <Bell className="size-4" />
                {unread > 0 ? (
                  <span className="tnum absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </button>
              {bellOpen ? (
                <div className="panel absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] p-0">
                  <p className="eyebrow border-b border-border px-3.5 py-2.5">Activity</p>
                  <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                    {(notifications ?? []).slice(0, 12).map((n) => (
                      <li key={n.id} className="px-3.5 py-2.5">
                        <p className="text-[13px] font-medium">{n.title}</p>
                        {n.body ? (
                          <p className="mt-0.5 text-[12px] text-muted-foreground">{n.body}</p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {relative(n.created_at)}
                        </p>
                      </li>
                    ))}
                    {(notifications ?? []).length === 0 ? (
                      <li className="px-3.5 py-6 text-center text-[13px] text-muted-foreground">
                        Nothing yet. New leads and bookings show up here.
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </div>
            <Button asChild variant="signal" size="sm" className="hidden sm:inline-flex">
              <Link to="/app/leads">Work the board</Link>
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">
          {billingLoading && org ? (
            <div className="py-12 text-center text-[13px] text-muted-foreground">Checking workspace access…</div>
          ) : paymentLocked ? (
            <div className="panel mx-auto mt-10 max-w-lg p-8 text-center">
              <p className="eyebrow">Access paused</p>
              <h1 className="mt-2 font-display text-2xl font-bold">Activate your Revora Growth System</h1>
              <p className="mt-3 text-[14px] text-muted-foreground">
                Your 1-day free trial has ended. Your website, leads, bookings, and settings are saved —
                nothing is lost. Pay the $1,500 one-time setup to restore full access; your first 30 days of
                the $250/month platform fee are free, then it continues at $250/month unless canceled.
              </p>

              <Button asChild variant="signal" className="mt-6">
                <Link to="/app/billing">
                  <CreditCard className="size-4" aria-hidden="true" /> Activate my system
                </Link>
              </Button>

              <p className="mt-4 text-[12px] text-muted-foreground">
                Questions? <a href="mailto:Revorabusiness0@gmail.com" className="text-primary hover:underline">Email support</a> or{" "}
                <a href="tel:+19196226620" className="text-primary hover:underline">call (919) 622-6620</a>.
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
