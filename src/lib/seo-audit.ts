/**
 * Automated SEO quality control for Revora's own public pages.
 *
 * Runs against the single inventory in `seo-intent.ts`, so it checks the pages
 * that actually ship. It reports real defects only — it never "fixes" a page by
 * inventing content, and it never claims a page ranks.
 */

import { SITE_URL } from "@/lib/seo";
import { MIN_INDEXABLE_WORDS, isPrivatePath, seoInventory, type SeoPage } from "@/lib/seo-intent";
import { internalLinksFor } from "@/lib/seo-links";

export type SeoIssueLevel = "error" | "warning";

export interface SeoIssue {
  level: SeoIssueLevel;
  code:
    | "duplicate_title"
    | "duplicate_description"
    | "missing_title"
    | "missing_description"
    | "title_too_long"
    | "description_too_long"
    | "thin_content"
    | "orphan_page"
    | "broken_internal_link"
    | "index_noindex_conflict"
    | "private_path_indexed"
    | "invalid_canonical";
  path: string;
  detail: string;
}

const TITLE_MAX = 62;
const DESCRIPTION_MAX = 160;

/** Canonical URL a page must self-reference. */
export function canonicalFor(path: string) {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

export function auditSeo(inventory: SeoPage[] = seoInventory()): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const indexable = inventory.filter((p) => p.indexable);
  const known = new Set(inventory.map((p) => p.path));

  const byTitle = new Map<string, string[]>();
  const byDescription = new Map<string, string[]>();

  for (const p of indexable) {
    if (!p.title.trim())
      issues.push({ level: "error", code: "missing_title", path: p.path, detail: "No title." });
    if (!p.description.trim())
      issues.push({
        level: "error",
        code: "missing_description",
        path: p.path,
        detail: "No meta description.",
      });
    if (p.title.length > TITLE_MAX)
      issues.push({
        level: "warning",
        code: "title_too_long",
        path: p.path,
        detail: `Title is ${p.title.length} characters (aim for ${TITLE_MAX}).`,
      });
    if (p.description.length > DESCRIPTION_MAX)
      issues.push({
        level: "warning",
        code: "description_too_long",
        path: p.path,
        detail: `Description is ${p.description.length} characters (aim for ${DESCRIPTION_MAX}).`,
      });
    // Thin content only matters for pages meant to answer a search. A contact
    // form or a sign-in entry point is short by design, not underweight.
    const contentIntent = [
      "commercial",
      "informational",
      "local",
      "industry",
      "comparison",
    ].includes(p.intent);
    if (contentIntent && p.words < MIN_INDEXABLE_WORDS)
      issues.push({
        level: "error",
        code: "thin_content",
        path: p.path,
        detail: `Indexable page renders only ~${p.words} unique words.`,
      });
    if (isPrivatePath(p.path))
      issues.push({
        level: "error",
        code: "private_path_indexed",
        path: p.path,
        detail: "A private surface is marked indexable.",
      });
    if (!canonicalFor(p.path).startsWith(`${SITE_URL}`))
      issues.push({
        level: "error",
        code: "invalid_canonical",
        path: p.path,
        detail: "Canonical does not resolve to the Revora domain.",
      });

    const titleKey = p.title.trim().toLowerCase();
    const descKey = p.description.trim().toLowerCase();
    byTitle.set(titleKey, [...(byTitle.get(titleKey) ?? []), p.path]);
    byDescription.set(descKey, [...(byDescription.get(descKey) ?? []), p.path]);
  }

  for (const [title, paths] of byTitle) {
    if (paths.length > 1 && title)
      for (const path of paths)
        issues.push({
          level: "error",
          code: "duplicate_title",
          path,
          detail: `Title is shared with ${paths.filter((p) => p !== path).join(", ")}.`,
        });
  }
  for (const [description, paths] of byDescription) {
    if (paths.length > 1 && description)
      for (const path of paths)
        issues.push({
          level: "error",
          code: "duplicate_description",
          path,
          detail: `Description is shared with ${paths.filter((p) => p !== path).join(", ")}.`,
        });
  }

  // Internal-link graph: every indexable page needs an inbound contextual link,
  // and no link may point at a URL that does not exist or is noindexed.
  const inbound = new Map<string, number>();
  for (const p of inventory) {
    for (const link of internalLinksFor(p.path)) {
      if (!known.has(link.path)) {
        issues.push({
          level: "error",
          code: "broken_internal_link",
          path: p.path,
          detail: `Links to unknown page ${link.path}.`,
        });
        continue;
      }
      const target = inventory.find((x) => x.path === link.path);
      if (target && !target.indexable)
        issues.push({
          level: "warning",
          code: "index_noindex_conflict",
          path: p.path,
          detail: `Contextual link points at noindexed ${link.path}.`,
        });
      inbound.set(link.path, (inbound.get(link.path) ?? 0) + 1);
    }
  }

  for (const p of indexable) {
    if (p.path === "/") continue;
    if ((inbound.get(p.path) ?? 0) === 0 && !hasHubParent(p.path, known))
      issues.push({
        level: "warning",
        code: "orphan_page",
        path: p.path,
        detail: "No contextual inbound link and no listing hub.",
      });
  }

  return issues;
}

/** A page reachable from its own section hub is not an orphan. */
function hasHubParent(path: string, known: Set<string>) {
  const parts = path.split("/").filter(Boolean);
  while (parts.length > 1) {
    parts.pop();
    if (known.has(`/${parts.join("/")}`)) return true;
  }
  return false;
}

export interface SeoAuditSummary {
  checkedPages: number;
  indexablePages: number;
  errors: number;
  warnings: number;
  issues: SeoIssue[];
}

export function seoAuditSummary(inventory: SeoPage[] = seoInventory()): SeoAuditSummary {
  const issues = auditSeo(inventory);
  return {
    checkedPages: inventory.length,
    indexablePages: inventory.filter((p) => p.indexable).length,
    errors: issues.filter((i) => i.level === "error").length,
    warnings: issues.filter((i) => i.level === "warning").length,
    issues,
  };
}
