/**
 * Contextual next steps and answer-first summary blocks.
 *
 * Both are rendered from real page data: the link cluster comes from
 * `seo-links.ts` and the answer block only shows text the page's own data
 * provides, so nothing here can state a fact the page doesn't have.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { internalLinksFor } from "@/lib/seo-links";

/** Descriptive contextual links, for crawlers and for real readers. */
export function RelatedLinks({
  path,
  heading = "Where to go next",
  limit = 4,
}: {
  path: string;
  heading?: string;
  limit?: number;
}) {
  const links = internalLinksFor(path, limit);
  if (links.length === 0) return null;
  return (
    <nav aria-label={heading} className="mx-auto max-w-5xl px-4 py-12">
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.path}>
            <Link
              to={link.path}
              className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <span className="flex items-center gap-2 font-medium text-foreground">
                {link.anchor}
                <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">{link.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Answer-first summary: the direct answer to the page's question in two or three
 * sentences, before any sales copy. This is what search engines and AI
 * assistants quote.
 */
export function AnswerFirst({ question, answer }: { question: string; answer: string }) {
  return (
    <section aria-label="Quick answer" className="mx-auto max-w-3xl px-4 pt-8">
      <div className="rounded-xl border border-border bg-muted/40 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {question}
        </h2>
        <p className="mt-2 text-base leading-relaxed text-foreground">{answer}</p>
      </div>
    </section>
  );
}
