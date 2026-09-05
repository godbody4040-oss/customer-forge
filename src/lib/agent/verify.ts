/**
 * WHAT REVORA CHECKS AFTER IT CHANGES A WEBSITE.
 *
 * This module is deliberately pure: it takes the HTML a page actually served
 * and reports what is wrong with it. No network, no database, no model — so the
 * rules can be tested exactly, and so the same rules apply whether the page was
 * fetched during an autonomous run or during a manual apply.
 *
 * A `critical` failure means the page is broken for a real visitor (no heading,
 * unreadable on a phone, leaked placeholder text, a dead internal link). A
 * `warning` means the page works but is weaker than it should be. Only critical
 * failures cause a change to be rolled back — a warning is reported honestly and
 * left for the owner to decide on.
 */

export type CheckSeverity = "critical" | "warning";

export type Check = {
  /** One line a business owner understands. */
  label: string;
  ok: boolean;
  severity: CheckSeverity;
  /** Where it was seen, e.g. "Home" or "/s/acme/services". */
  where: string;
  detail?: string;
};

export type PageInspection = {
  checks: Check[];
  /** Same-site links found on the page, for reachability testing. */
  links: string[];
};

export type VerificationReport = {
  checks: Check[];
  critical: number;
  warnings: number;
  passed: number;
  /** One line summarising the outcome for the owner. */
  summary: string;
};

const PLACEHOLDER = /(lorem ipsum|\bTODO\b|\bFIXME\b|\{\{\s*\w+\s*\}\}|\[insert\b|\bundefined\b)/i;

const stripped = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const attr = (tag: string, name: string) => {
  const match = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag);
  return (match?.[2] ?? match?.[3] ?? "").trim();
};

/** Inspects one served page. `where` is the human label used in the report. */
export function inspectHtml(html: string, where: string): PageInspection {
  const checks: Check[] = [];
  const add = (label: string, ok: boolean, severity: CheckSeverity, detail?: string) =>
    checks.push(detail ? { label, ok, severity, where, detail } : { label, ok, severity, where });

  const headings = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) ?? [];
  const headingText = headings.map((tag) => stripped(tag)).filter(Boolean);
  add("The page has a real headline", headingText.length > 0, "critical");
  if (headings.length > 1)
    add("Only one main headline per page", false, "warning", `${headings.length} found`);

  const title = stripped(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
  add("The browser tab has a title", title.length > 2, "warning", title.slice(0, 80));

  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  const description = metas
    .filter((tag) => /name\s*=\s*["']description["']/i.test(tag))
    .map((tag) => attr(tag, "content"))
    .find(Boolean);
  add("Google has a description to show", Boolean(description && description.length > 20), "warning");

  const viewport = metas.some((tag) => /name\s*=\s*["']viewport["']/i.test(tag));
  add("The page is readable on a phone", viewport, "critical");

  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  const missingAlt = images.filter((tag) => !attr(tag, "alt")).length;
  add(
    "Every photo describes itself for screen readers",
    missingAlt === 0,
    "warning",
    missingAlt ? `${missingAlt} of ${images.length} photos have no description` : undefined,
  );

  const body = stripped(html);
  add("The page has real content on it", body.length > 200, "critical", `${body.length} characters`);
  const placeholder = PLACEHOLDER.exec(body);
  add(
    "No draft or placeholder text is showing",
    !placeholder,
    "critical",
    placeholder ? `found "${placeholder[0]}"` : undefined,
  );

  const links = new Set<string>();
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attr(tag, "href");
    if (!href || href.startsWith("#") || !href.startsWith("/")) continue;
    links.add(href.split("#")[0] ?? href);
  }

  return { checks, links: [...links].slice(0, 25) };
}

/** Turns every page's checks into the single report the owner is shown. */
export function summarise(checks: Check[]): VerificationReport {
  const failures = checks.filter((check) => !check.ok);
  const critical = failures.filter((check) => check.severity === "critical").length;
  const warnings = failures.length - critical;
  const passed = checks.length - failures.length;
  const summary = critical
    ? `${critical} thing${critical === 1 ? "" : "s"} would have been broken for visitors`
    : warnings
      ? `Everything works. ${warnings} smaller improvement${warnings === 1 ? "" : "s"} noted.`
      : checks.length
        ? "Checked the live pages — everything passed."
        : "No pages could be checked.";
  return { checks, critical, warnings, passed, summary };
}
