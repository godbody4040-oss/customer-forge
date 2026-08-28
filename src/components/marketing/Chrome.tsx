import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const NAV = [
  { to: "/pricing", label: "Pricing" },
  { to: "/industries", label: "Industries" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" aria-label="Customer Forge home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild variant="signal" size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>
              Start Growing
            </Link>
          </Button>
        </div>

        <button
          type="button"
          className="grid size-10 cursor-pointer place-items-center rounded-md border border-border text-muted-foreground md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-card px-4 py-3 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm text-muted-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Button asChild variant="outline">
              <Link to="/auth" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </Button>
            <Button asChild variant="signal">
              <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>
                Start Growing
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <nav aria-label="Footer" className="flex flex-wrap gap-5 text-[13px] text-muted-foreground">
          <Link to="/pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link to="/industries" className="transition-colors hover:text-foreground">
            Industries
          </Link>
          <Link to="/contact" className="transition-colors hover:text-foreground">
            Contact
          </Link>
          <Link
            to="/s/$slug"
            params={{ slug: "elite-mobile-detailing" }}
            className="transition-colors hover:text-foreground"
          >
            Live demo site
          </Link>
        </nav>
        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Customer Forge
        </p>
      </div>
    </footer>
  );
}
