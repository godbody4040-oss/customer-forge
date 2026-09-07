/**
 * Search Console feedback loop.
 *
 * Pure functions that turn real Search Console performance rows into a
 * prioritized optimisation list. Nothing is estimated or invented: when a
 * metric is missing the row is simply not scored, and no recommendation ever
 * promises a ranking.
 */

import { classifyIntent, PRIORITY_QUERIES } from "@/lib/seo-intent";

export interface ConsoleRow {
  /** Page path or absolute URL as reported by Search Console. */
  page: string;
  query?: string;
  clicks: number;
  impressions: number;
  /** Average position, 1-based. */
  position: number;
  /** Same metrics for the previous comparable period, when available. */
  previous?: { clicks: number; impressions: number };
}

export type SeoOpportunityKind =
  | "high_impressions_low_ctr"
  | "striking_distance"
  | "growing_impressions"
  | "declining_clicks"
  | "commercial_query";

export interface SeoOpportunity {
  page: string;
  query: string | null;
  kind: SeoOpportunityKind;
  /** Higher means work on it sooner. */
  priority: number;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
  recommendation: string;
}

const ctrOf = (row: ConsoleRow) => (row.impressions > 0 ? row.clicks / row.impressions : 0);

const isCommercial = (query: string | undefined) => {
  if (!query) return false;
  const q = query.toLowerCase();
  if (PRIORITY_QUERIES.some((target) => q.includes(target) || target.includes(q))) return true;
  return /(software|crm|builder|pricing|cost|best|for (contractors|plumbers|electricians|roofers|hvac)|lead generation|booking|quote|review management)/.test(
    q,
  );
};

/**
 * Ranks the pages and queries worth optimising next.
 * Returns an empty list when there is no usable data — never a placeholder.
 */
export function seoOpportunities(rows: ConsoleRow[], limit = 25): SeoOpportunity[] {
  const found: SeoOpportunity[] = [];

  for (const row of rows) {
    if (!row.page || !Number.isFinite(row.impressions) || row.impressions <= 0) continue;
    const ctr = ctrOf(row);
    const query = row.query?.trim() || null;
    const commercial = isCommercial(row.query);
    const intentWeight = ["commercial", "transactional", "comparison", "industry"].includes(
      classifyIntent(pathOf(row.page)),
    )
      ? 1.35
      : 1;

    const push = (kind: SeoOpportunityKind, priority: number, recommendation: string) =>
      found.push({
        page: pathOf(row.page),
        query,
        kind,
        priority: Math.round(priority * intentWeight * (commercial ? 1.4 : 1)),
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
        ctr,
        recommendation,
      });

    if (row.impressions >= 100 && ctr < 0.02)
      push(
        "high_impressions_low_ctr",
        row.impressions,
        "People see this page in results and skip it. Rewrite the title and meta description to answer the query directly and lead with the outcome, not the brand.",
      );

    if (row.position >= 4 && row.position <= 20)
      push(
        "striking_distance",
        row.impressions * 1.5,
        `Ranking around position ${row.position.toFixed(1)}. Deepen the section that answers this query, add an answer-first summary and link to it from related pages.`,
      );

    if (row.previous && row.previous.impressions > 0) {
      const growth = row.impressions / row.previous.impressions;
      if (growth >= 1.25)
        push(
          "growing_impressions",
          row.impressions * growth,
          "Demand for this page is rising. Expand it while interest grows and add internal links from your highest-traffic pages.",
        );
      if (row.previous.clicks > 0 && row.clicks / row.previous.clicks <= 0.75)
        push(
          "declining_clicks",
          row.previous.clicks * 10,
          "Clicks fell versus the previous period. Check for a title/description change, a lost position, or a competitor answering the query more directly.",
        );
    }

    if (commercial && row.clicks === 0 && row.impressions >= 25)
      push(
        "commercial_query",
        row.impressions * 2,
        "A commercial-intent query already shows this page but never gets clicked. Make the page's offer, price and next step obvious above the fold.",
      );
  }

  return found.sort((a, b) => b.priority - a.priority).slice(0, limit);
}

function pathOf(page: string) {
  try {
    return new URL(page).pathname || "/";
  } catch {
    return page.startsWith("/") ? page : `/${page}`;
  }
}

/**
 * Reads a Search Console performance export (CSV or TSV, or a copied table)
 * into rows this engine can score. Only rows with a usable page/query and
 * numbers are kept — a malformed line is skipped, never guessed at.
 *
 * Accepted headers (case-insensitive, any order): page/landing page/url,
 * query/queries/top queries, clicks, impressions, position/average position,
 * plus optional previous clicks / previous impressions for comparisons.
 */
export function parseConsoleRows(input: string, limit = 5000): ConsoleRow[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const split = (line: string) =>
    (line.includes("\t") ? line.split("\t") : splitCsv(line)).map((cell) =>
      cell.trim().replace(/^"|"$/g, ""),
    );

  const header = split(lines[0]!).map((cell) => cell.toLowerCase());
  const find = (...names: string[]) =>
    header.findIndex((cell) => names.some((name) => cell === name || cell.includes(name)));

  const pageAt = find("landing page", "page", "url", "address");
  const queryAt = find("query", "queries", "search term", "keyword");
  const clicksAt = find("clicks");
  const imprAt = find("impressions", "impr");
  const posAt = find("position");
  const prevClicksAt = find("previous clicks", "clicks (previous");
  const prevImprAt = find("previous impressions", "impressions (previous");

  if (pageAt < 0 && queryAt < 0) return [];
  if (clicksAt < 0 || imprAt < 0) return [];

  const rows: ConsoleRow[] = [];
  for (const line of lines.slice(1, limit + 1)) {
    const cells = split(line);
    const page = pageAt >= 0 ? (cells[pageAt] ?? "") : "/";
    const clicks = num(cells[clicksAt]);
    const impressions = num(cells[imprAt]);
    if (!page || clicks === null || impressions === null || impressions <= 0) continue;

    const previousClicks = prevClicksAt >= 0 ? num(cells[prevClicksAt]) : null;
    const previousImpressions = prevImprAt >= 0 ? num(cells[prevImprAt]) : null;

    rows.push({
      page,
      ...(queryAt >= 0 && cells[queryAt] ? { query: cells[queryAt] } : {}),
      clicks,
      impressions,
      position: posAt >= 0 ? (num(cells[posAt]) ?? 0) : 0,
      ...(previousClicks !== null || previousImpressions !== null
        ? {
            previous: {
              clicks: previousClicks ?? 0,
              impressions: previousImpressions ?? 0,
            },
          }
        : {}),
    });
  }
  return rows;
}

/** One honest line about what the data covers. */
export function consoleCoverage(rows: ConsoleRow[]) {
  const pages = new Set(rows.map((row) => pathOf(row.page)));
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  return {
    rows: rows.length,
    pages: pages.size,
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    comparable: rows.filter((row) => row.previous).length,
  };
}

function num(value: string | undefined): number | null {
  if (value === undefined) return null;
  const cleaned = value.replace(/[,%\s]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitCsv(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else current += char;
  }
  cells.push(current);
  return cells;
}
