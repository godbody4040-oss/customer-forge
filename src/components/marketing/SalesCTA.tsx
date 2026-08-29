import { Link } from "@tanstack/react-router";
import { LifeBuoy, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/app/Bits";
import { MAIL_SUBJECTS, REVORA, revoraMailto, revoraTel } from "@/lib/brand";

/** Ready-to-grow sales block used across marketing pages. */
export function SalesCTA({ className = "" }: { className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <p className="eyebrow">Ready to grow?</p>
      <h2 className="mx-auto mt-2 max-w-2xl font-display text-[clamp(1.5rem,3vw,2.1rem)] leading-tight font-semibold">
        See how Revora can turn your online presence into a complete customer acquisition system.
      </h2>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button asChild variant="signal" size="lg">
          <Link to="/demo">Request a demo</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href={revoraTel}>
            <Phone className="size-4" aria-hidden="true" /> Call {REVORA.phoneDisplay}
          </a>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <a href={revoraMailto(MAIL_SUBJECTS.inquiry)}>
            <Mail className="size-4" aria-hidden="true" /> Email Revora
          </a>
        </Button>
      </div>
    </div>
  );
}

/** Support contact card. */
export function SupportCard() {
  return (
    <Panel className="p-6">
      <LifeBuoy className="size-5 text-primary" aria-hidden="true" />
      <h3 className="mt-3.5 font-display text-[17px] font-semibold">Need help?</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        The Revora team is here to help.
      </p>
      <ul className="mt-4 space-y-1.5 text-[13px]">
        <li>
          <a className="text-primary hover:underline" href={revoraMailto(MAIL_SUBJECTS.support)}>
            {REVORA.email}
          </a>
        </li>
        <li>
          <a className="text-primary hover:underline" href={revoraTel}>
            {REVORA.phoneDisplay}
          </a>
        </li>
      </ul>
      <Button asChild variant="outline" className="mt-5 w-full">
        <a href={revoraMailto(MAIL_SUBJECTS.support)}>Contact support</a>
      </Button>
    </Panel>
  );
}

/** Understated founder note — Revora stays the primary brand. */
export function FounderNote() {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="eyebrow">From the founder</p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Revora exists because most local businesses are handed software and left to figure it out.
        We build, configure and manage the whole system instead — website, lead capture, CRM,
        booking, quotes, follow-up, reviews and reporting — so owners can focus on doing the work
        and serving customers.
      </p>
      <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-primary/30 bg-card px-4 py-2">
        <span className="grid size-7 place-items-center rounded-full bg-primary/15 font-display text-[12px] font-semibold text-primary">
          A
        </span>
        <span className="text-left">
          <span className="block text-[13px] font-medium">{REVORA.founder.name}</span>
          <span className="block text-[11px] text-muted-foreground">{REVORA.founder.role}</span>
        </span>
      </div>
    </div>
  );
}

/** Sticky mobile action bar for Revora marketing pages only (never client sites). */
export function RevoraMobileBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 py-2 backdrop-blur md:hidden">
      <div className="grid grid-cols-4 gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={revoraTel}>Call</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={revoraMailto(MAIL_SUBJECTS.inquiry)}>Email</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/pricing">Quote</Link>
        </Button>
        <Button asChild variant="signal" size="sm">
          <Link to="/demo">Book</Link>
        </Button>
      </div>
    </div>
  );
}
