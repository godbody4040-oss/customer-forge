import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Building2, Globe2, LayoutGrid, LifeBuoy, Receipt, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { EmptyState, Pill } from "@/components/app/Bits";
import { useSignOut, useWorkspace } from "@/lib/use-tenant";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Platform admin — Customer Forge" },
      { name: "description", content: "Create, launch and support client businesses on the platform." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminShell,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutGrid, exact: true },
  { to: "/admin/clients", label: "Clients", icon: Building2, exact: false },
  { to: "/admin/domains", label: "Domains", icon: Globe2, exact: false },
  { to: "/admin/plans", label: "Plans", icon: Receipt, exact: false },
] as const;

function AdminShell() {
  const { data, isLoading } = useWorkspace();
  const navigate = useNavigate();
  const signOut = useSignOut();

  if (isLoading) {
    return <div className="p-10 text-[13px] text-muted-foreground">Checking your access…</div>;
  }

  if (!data?.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <EmptyState
          icon={<ShieldCheck className="size-5" />}
          title="Platform administration"
          description="This area is for platform staff only. Your business workspace has everything you need."
          action={
            <Button asChild variant="signal" size="sm">
              <Link to="/app">Go to my workspace</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Logo />
            </Link>
            <Pill tone="info">
              <ShieldCheck className="size-3" /> Platform admin
            </Pill>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/app">My workspace</Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth", replace: true });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
        <nav aria-label="Admin" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2">
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact }}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] whitespace-nowrap text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
              activeProps={{ className: "bg-elevated text-foreground" }}
            >
              <Icon className="size-4" aria-hidden="true" /> {label}
            </Link>
          ))}
          <span className="ml-auto hidden items-center gap-1.5 pr-1 text-[11px] text-muted-foreground sm:flex">
            <LifeBuoy className="size-3.5" /> Support access is always audited
          </span>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
