import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Mail, Menu, Phone, X } from "lucide-react";
import { MAIL_SUBJECTS, REVORA, revoraMailto, revoraTel } from "@/lib/brand";

const NAV = [
  { to: "/demo", label: "Product" },
  { to: "/pricing", label: "Pricing" },
  { to: "/industries", label: "Solutions" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" aria-label="Revora home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
              activeProps={{ className: "bg-elevated text-foreground" }}
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
              Get started
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
                Get started
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

const FOOTER_GROUPS = [
  {
    heading: "Platform",
    links: [
      { to: "/demo", label: "Product tour" },
      { to: "/industries", label: "Solutions" },
      { to: "/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo tagline />
            <p className="mt-4 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
              One system to get discovered, capture opportunities, convert leads, book customers and
              measure growth.
            </p>
            <div className="mt-6">
              <p className="eyebrow">Contact</p>
              <ul className="mt-2.5 space-y-2 text-[12px]">
                <li className="flex items-center gap-2">
                  <Mail className="size-3.5 text-primary" aria-hidden="true" />
                  <a
                    href={revoraMailto(MAIL_SUBJECTS.inquiry)}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {REVORA.email}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="size-3.5 text-primary" aria-hidden="true" />
                  <a
                    href={revoraTel}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {REVORA.phoneDisplay}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 md:col-span-7">
            {FOOTER_GROUPS.map((group) => (
              <nav key={group.heading} aria-label={group.heading}>
                <p className="eyebrow">{group.heading}</p>
                <ul className="mt-3 space-y-2.5 text-[13px]">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <nav aria-label="Get started">
              <p className="eyebrow">Get started</p>
              <ul className="mt-3 space-y-2.5 text-[13px]">
                <li>
                  <Link
                    to="/auth"
                    search={{ mode: "signup" }}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Start free trial
                  </Link>
                </li>
                <li>
                  <Link
                    to="/auth"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    to="/s/$slug"
                    params={{ slug: "elite-mobile-detailing" }}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Live demo site
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} <span className="text-foreground">REVORA™</span> — The
            Business Growth Operating System
          </p>
          <p className="text-[11px] text-muted-foreground">
            Estimated opportunity figures are estimates, not guaranteed revenue.
          </p>
        </div>
      </div>
    </footer>
  );
}

