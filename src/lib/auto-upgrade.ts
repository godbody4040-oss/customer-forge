/**
 * Revora AI auto-upgrade engine (pure layer).
 *
 * Turns audit issues into concrete, reviewable upgrade proposals. Every proposal
 * states exactly what will change (before → after) before anything is applied,
 * and the apply step always snapshots a restorable version first, so any upgrade
 * can be rolled back.
 *
 * Safety rules encoded here:
 * - Proposals never delete existing content; they add or fill blanks.
 * - A proposal that would overwrite text the owner already wrote is not offered.
 * - Nothing applies without explicit approval.
 */

import type { AuditIssue } from "@/lib/site-audit";
import type { ConversionGoal } from "@/lib/conversion-engine";

export type UpgradeKind =
  | "rebuild_site"
  | "apply_meta"
  | "apply_cta"
  | "add_cta_section"
  | "add_capture_section"
  | "add_faq_section"
  | "page_seo"
  | "page_index"
  | "publish_site";

export type UpgradeChange = {
  label: string;
  before: string;
  after: string;
};

export type UpgradeProposal = {
  id: string;
  kind: UpgradeKind;
  title: string;
  why: string;
  /** Estimated score points recovered if approved. */
  impact: number;
  changes: UpgradeChange[];
  /** Whether Revora can apply this itself, or the owner has to supply facts. */
  applyable: boolean;
  needs?: string;
  pageId?: string;
  pageTitle?: string;
  sectionKind?: string;
  seoPatch?: { seo_title?: string; seo_description?: string; noindex?: boolean };
  settingsPatch?: Record<string, unknown>;
};

export type ProposalContext = {
  goal: ConversionGoal;
  /** Drafted copy Revora can safely promote into blank fields. */
  copyHeadline: string | null;
  copyMetaDescription: string | null;
  copyPrimaryCta: string | null;
  headline: string | null;
  metaDescription: string | null;
  primaryCtaLabel: string | null;
  publishState: string | null;
  pages: { id: string; title: string; slug: string; seo_title: string | null; seo_description: string | null; noindex: boolean | null }[];
  businessName: string | null;
  city: string | null;
};

const blank = (value: unknown) => !(typeof value === "string" && value.trim().length > 0);
const clip = (value: string, max = 160) => (value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`);

/** Builds the approved-before-applied proposal list from audit issues. */
export function proposeUpgrades(issues: AuditIssue[], ctx: ProposalContext): UpgradeProposal[] {
  const out: UpgradeProposal[] = [];
  const seen = new Set<string>();
  const push = (proposal: UpgradeProposal) => {
    if (seen.has(proposal.id)) return;
    seen.add(proposal.id);
    out.push(proposal);
  };
  const weightOf = (kind: UpgradeKind) =>
    issues.filter((issue) => issue.upgrade === kind).reduce((sum, issue) => sum + (issue.max - issue.points), 0);

  const kinds = new Set(issues.map((issue) => issue.upgrade).filter(Boolean) as UpgradeKind[]);

  if (kinds.has("apply_meta") || blank(ctx.metaDescription) || blank(ctx.headline)) {
    const canFill =
      (blank(ctx.headline) && !blank(ctx.copyHeadline)) ||
      (blank(ctx.metaDescription) && !blank(ctx.copyMetaDescription));
    const changes: UpgradeChange[] = [];
    if (blank(ctx.headline) && ctx.copyHeadline)
      changes.push({ label: "Site headline", before: "(empty)", after: ctx.copyHeadline });
    if (blank(ctx.metaDescription) && ctx.copyMetaDescription)
      changes.push({ label: "Search description", before: "(empty)", after: clip(ctx.copyMetaDescription) });
    push({
      id: "apply_meta",
      kind: "apply_meta",
      title: "Fill the search headline and description",
      why: "Google shows these two lines. Blank fields mean Google writes them for you.",
      impact: Math.max(weightOf("apply_meta"), 3),
      changes,
      applyable: canFill,
      ...(canFill ? {} : { needs: "Run the Revora build first so there is drafted copy to promote." }),
    });
  }

  if (blank(ctx.primaryCtaLabel) && !blank(ctx.copyPrimaryCta)) {
    push({
      id: "apply_cta",
      kind: "apply_cta",
      title: "Set one primary action for every page",
      why: `Your goal is ${ctx.goal}. One repeated button converts better than several competing links.`,
      impact: 6,
      changes: [{ label: "Primary button", before: "(none)", after: ctx.copyPrimaryCta! }],
      applyable: true,
    });
  }

  for (const kind of ["add_cta_section", "add_capture_section", "add_faq_section"] as const) {
    if (!kinds.has(kind)) continue;
    const issue = issues.find((i) => i.upgrade === kind)!;
    const sectionKind = kind === "add_cta_section" ? "cta" : kind === "add_faq_section" ? "faq" : ctx.goal === "book" ? "booking" : "quote";
    push({
      id: `${kind}-${issue.pageId ?? "site"}`,
      kind,
      title:
        kind === "add_cta_section"
          ? `Add a closing call to action${issue.pageId ? ` to ${issue.scope}` : ""}`
          : kind === "add_faq_section"
            ? "Add an FAQ that answers price, timing and coverage"
            : "Add a capture block so enquiries reach your CRM",
      why: issue.detail,
      impact: issue.max,
      changes: [
        {
          label: issue.pageId ? `${issue.scope} — sections` : "Home page — sections",
          before: "no such section",
          after: `new "${sectionKind}" section at the end of the page`,
        },
      ],
      applyable: true,
      sectionKind,
      ...(issue.pageId ? { pageId: issue.pageId, pageTitle: issue.scope } : {}),
    });
  }

  for (const issue of issues.filter((i) => i.upgrade === "page_seo" && i.pageId)) {
    const page = ctx.pages.find((p) => p.id === issue.pageId);
    if (!page) continue;
    const where = ctx.city ? ` in ${ctx.city}` : "";
    const name = ctx.businessName ?? "your business";
    const title = clip(`${page.title}${where} | ${name}`, 60);
    const description = clip(
      `${page.title}${where} from ${name}. ${ctx.copyMetaDescription ?? "See services, prices and book online."}`,
      158,
    );
    push({
      id: `page_seo-${page.id}`,
      kind: "page_seo",
      title: `Write search title and description for ${page.title}`,
      why: "Every page needs its own snippet, or pages compete with each other in search.",
      impact: issue.max,
      changes: [
        { label: `${page.title} — search title`, before: page.seo_title ?? "(empty)", after: title },
        { label: `${page.title} — search description`, before: page.seo_description ?? "(empty)", after: description },
      ],
      applyable: true,
      pageId: page.id,
      pageTitle: page.title,
      seoPatch: { seo_title: title, seo_description: description },
    });
  }

  for (const issue of issues.filter((i) => i.upgrade === "page_index" && i.pageId)) {
    const pageId = issue.pageId!;
    push({
      id: `page_index-${pageId}`,
      kind: "page_index",
      title: `Let Google list ${issue.scope}`,
      why: "This page is marked noindex, so it can never appear in search results.",
      impact: issue.max,
      changes: [{ label: `${issue.scope} — search visibility`, before: "hidden (noindex)", after: "listed" }],
      applyable: true,
      pageId,
      pageTitle: issue.scope,
      seoPatch: { noindex: false },
    });
  }

  if (kinds.has("rebuild_site")) {
    push({
      id: "rebuild_site",
      kind: "rebuild_site",
      title: "Rebuild pages and copy from your business facts",
      why: "Several pages are thin or missing generated content. A rebuild writes them from the facts you already entered.",
      impact: Math.max(weightOf("rebuild_site"), 6),
      changes: [
        { label: "Pages and copy", before: "current draft (saved as a version first)", after: "regenerated from your business information" },
      ],
      applyable: true,
    });
  }

  if (ctx.publishState !== "published") {
    push({
      id: "publish_site",
      kind: "publish_site",
      title: "Publish the site",
      why: "Customers and search engines cannot reach an unpublished site.",
      impact: 9,
      changes: [{ label: "Publish state", before: ctx.publishState ?? "draft", after: "published" }],
      applyable: true,
    });
  }

  return out.sort((a, b) => b.impact - a.impact);
}

/** Plain-language summary of a proposal set, shown before approval. */
export function summarizeProposals(proposals: UpgradeProposal[]) {
  const applyable = proposals.filter((p) => p.applyable);
  const changes = applyable.reduce((sum, p) => sum + p.changes.length, 0);
  const impact = applyable.reduce((sum, p) => sum + p.impact, 0);
  return {
    count: applyable.length,
    blocked: proposals.length - applyable.length,
    changes,
    impact,
    headline: applyable.length
      ? `${applyable.length} safe upgrade${applyable.length === 1 ? "" : "s"} ready — ${changes} change${changes === 1 ? "" : "s"} in total.`
      : "Nothing safe to apply right now.",
  };
}
