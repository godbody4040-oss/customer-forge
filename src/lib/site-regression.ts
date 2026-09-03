/**
 * REGRESSION DETECTION (pure).
 *
 * Compares two Pre-Flight style health snapshots of the same site and reports
 * what got worse. This is how Revora notices that an AI change, an edit or a
 * settings switch broke something that used to work, instead of the client
 * finding out from a lost lead.
 *
 * Deterministic and side-effect free so it can run on the server, in the client
 * and in tests.
 */

export type HealthSnapshot = {
  /** When the snapshot was taken (ISO string). */
  at: string;
  /** Overall readiness score, 0-100. */
  score: number;
  /** Page slugs that exist and are visible. */
  pages: string[];
  /** Visible section count per page slug. */
  sections: Record<string, number>;
  /** Check id -> outcome, from the Pre-Flight engine. */
  checks: Record<string, "pass" | "warn" | "fail" | "skip">;
  /** Working call-to-action count. */
  ctas: number;
  /** Working lead-capture form count. */
  forms: number;
  /** Whether the site is publicly reachable over HTTPS at snapshot time. */
  publicHttps: boolean;
};

export type Regression = {
  kind:
    | "score"
    | "page_removed"
    | "sections_removed"
    | "check_regressed"
    | "ctas_removed"
    | "forms_removed"
    | "site_offline";
  /** Plain-language description an owner can act on. */
  message: string;
  severity: "critical" | "warning";
  /** Machine detail for logs. */
  detail: Record<string, string | number>;
};

const worse = (
  before: "pass" | "warn" | "fail" | "skip",
  after: "pass" | "warn" | "fail" | "skip",
) => {
  const rank = { pass: 3, warn: 2, fail: 1, skip: 0 } as const;
  if (before === "skip" || after === "skip") return false;
  return rank[after] < rank[before];
};

/** Everything that got worse between two snapshots. Empty array means no regressions. */
export function detectRegressions(
  before: HealthSnapshot,
  after: HealthSnapshot,
  options: { scoreDrop?: number } = {},
): Regression[] {
  const out: Regression[] = [];
  const scoreDrop = options.scoreDrop ?? 5;

  if (before.publicHttps && !after.publicHttps) {
    out.push({
      kind: "site_offline",
      message: "Your public website stopped answering securely. Visitors may see an error.",
      severity: "critical",
      detail: { before: "reachable", after: "unreachable" },
    });
  }

  const removedPages = before.pages.filter((slug) => !after.pages.includes(slug));
  for (const slug of removedPages) {
    out.push({
      kind: "page_removed",
      message: `The "${slug}" page is no longer on your site.`,
      severity: "critical",
      detail: { page: slug },
    });
  }

  for (const [slug, count] of Object.entries(before.sections)) {
    if (!after.pages.includes(slug)) continue;
    const now = after.sections[slug] ?? 0;
    if (now < count) {
      out.push({
        kind: "sections_removed",
        message: `The "${slug}" page lost ${count - now} section${count - now === 1 ? "" : "s"}.`,
        severity: now === 0 ? "critical" : "warning",
        detail: { page: slug, before: count, after: now },
      });
    }
  }

  for (const [id, state] of Object.entries(before.checks)) {
    const now = after.checks[id];
    if (!now || !worse(state, now)) continue;
    out.push({
      kind: "check_regressed",
      message: `"${id.replace(/[_:]/g, " ")}" was ${state} and is now ${now}.`,
      severity: now === "fail" ? "critical" : "warning",
      detail: { check: id, before: state, after: now },
    });
  }

  if (after.ctas < before.ctas) {
    out.push({
      kind: "ctas_removed",
      message: `Your site has ${before.ctas - after.ctas} fewer working call-to-action button${
        before.ctas - after.ctas === 1 ? "" : "s"
      }.`,
      severity: after.ctas === 0 ? "critical" : "warning",
      detail: { before: before.ctas, after: after.ctas },
    });
  }

  if (after.forms < before.forms) {
    out.push({
      kind: "forms_removed",
      message:
        after.forms === 0
          ? "There is no working enquiry form left on your site, so new leads can't reach you."
          : `Your site has ${before.forms - after.forms} fewer working enquiry form${
              before.forms - after.forms === 1 ? "" : "s"
            }.`,
      severity: after.forms === 0 ? "critical" : "warning",
      detail: { before: before.forms, after: after.forms },
    });
  }

  if (before.score - after.score >= scoreDrop) {
    out.push({
      kind: "score",
      message: `Your readiness score dropped from ${before.score} to ${after.score}.`,
      severity: after.score < 60 ? "critical" : "warning",
      detail: { before: before.score, after: after.score },
    });
  }

  return out;
}

/** True when a change should be rolled back rather than kept. */
export const shouldRollback = (regressions: Regression[]) =>
  regressions.some((r) => r.severity === "critical");

/** One-line summary for logs, toasts and the status centre. */
export function describeRegressions(regressions: Regression[]): string {
  if (!regressions.length) return "No regressions detected.";
  const critical = regressions.filter((r) => r.severity === "critical").length;
  const warnings = regressions.length - critical;
  const parts = [
    critical ? `${critical} critical` : null,
    warnings ? `${warnings} warning${warnings === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  return `${parts.join(" and ")}: ${regressions[0]!.message}`;
}
