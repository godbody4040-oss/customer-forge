/**
 * Health snapshot capture + local history (browser-safe).
 *
 * Turns a real Pre-Flight result into a comparable snapshot and keeps the last
 * few per organization so Revora can tell the owner what got worse since their
 * last check. Storage is per-browser and non-authoritative — it is used only to
 * surface regressions, never to decide access, billing or publish safety.
 */

import type { PreflightResult } from "@/lib/preflight";
import { detectRegressions, type HealthSnapshot, type Regression } from "@/lib/site-regression";

const KEY = (organizationId: string) => `revora:health:${organizationId}`;
const LIMIT = 8;

export function snapshotFromPreflight(
  result: PreflightResult,
  facts: {
    pages: { slug: string; visibleSections: number }[];
    ctas: number;
    forms: number;
    publicHttps: boolean;
  },
): HealthSnapshot {
  const checks: HealthSnapshot["checks"] = {};
  for (const check of result.checks) checks[check.key] = check.status;
  const sections: Record<string, number> = {};
  for (const page of facts.pages) sections[page.slug] = page.visibleSections;
  return {
    at: new Date().toISOString(),
    score: result.score,
    pages: facts.pages.map((p) => p.slug),
    sections,
    checks,
    ctas: facts.ctas,
    forms: facts.forms,
    publicHttps: facts.publicHttps,
  };
}

function read(organizationId: string): HealthSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY(organizationId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? (parsed as HealthSnapshot[]) : [];
  } catch {
    return [];
  }
}

function write(organizationId: string, history: HealthSnapshot[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(organizationId), JSON.stringify(history.slice(-LIMIT)));
  } catch {
    /* storage full or blocked — regressions simply aren't tracked in this browser */
  }
}

/** Most recent stored snapshot, or null on the first ever check. */
export const lastSnapshot = (organizationId: string): HealthSnapshot | null =>
  read(organizationId).at(-1) ?? null;

/**
 * Records the current snapshot and returns anything that got worse since the
 * previous one. Call this from an effect, never during render.
 */
export function recordHealth(
  organizationId: string,
  snapshot: HealthSnapshot,
): { regressions: Regression[]; previous: HealthSnapshot | null } {
  const history = read(organizationId);
  const previous = history.at(-1) ?? null;
  const regressions = previous ? detectRegressions(previous, snapshot) : [];
  write(organizationId, [...history, snapshot]);
  return { regressions, previous };
}
