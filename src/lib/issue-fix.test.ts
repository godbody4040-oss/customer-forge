import { describe, expect, it } from "vitest";
import type { AuditIssue } from "./site-audit";
import { criticalFirst, fixTargets, gapTargets } from "./issue-fix";
import type { UpgradeProposal } from "./auto-upgrade";

const issue = (patch: Partial<AuditIssue>): AuditIssue => ({
  key: "no-cta-page1",
  scope: "Home",
  title: "Dead-end page",
  detail: "No call to action.",
  action: "Add a closing CTA.",
  severity: "critical",
  points: 0,
  max: 4,
  upgrade: "add_cta_section",
  pageId: "page1",
  ...patch,
});

const proposal = (patch: Partial<UpgradeProposal>): UpgradeProposal => ({
  id: "add_cta_section-page1",
  kind: "add_cta_section",
  title: "Add a closing call to action",
  why: "",
  impact: 4,
  changes: [],
  applyable: true,
  pageId: "page1",
  ...patch,
});

describe("issue → fix routing", () => {
  it("routes a dead-end page to Pages & content with an automatic fix", () => {
    const [target] = fixTargets([issue({})], [proposal({})]);
    expect(target?.area).toBe("pages");
    expect(target?.category).toBe("conversion");
    expect(target?.proposalId).toBe("add_cta_section-page1");
  });

  it("offers no automatic fix when the matching proposal needs owner input", () => {
    const [target] = fixTargets(
      [issue({})],
      [proposal({ applyable: false, needs: "Run the build first." })],
    );
    expect(target?.proposalId).toBeNull();
  });

  it("does not match a proposal for another page", () => {
    const [target] = fixTargets([issue({})], [proposal({ pageId: "other", id: "other" })]);
    expect(target?.proposalId).toBeNull();
  });

  it("sends publishing failures to Launch and alt text to Design", () => {
    const statusIssue: AuditIssue = {
      key: "live-status-/",
      scope: "/",
      title: "Page doesn't load",
      detail: "HTTP 500.",
      action: "Republish.",
      severity: "critical",
      points: 0,
      max: 8,
      upgrade: "publish_site",
    };
    const altIssue: AuditIssue = {
      key: "live-alt-/",
      scope: "/",
      title: "Images missing alt text",
      detail: "2 of 5 images have no alt text.",
      action: "Describe each photo.",
      severity: "warning",
      points: 0,
      max: 2,
    };
    const targets = fixTargets([statusIssue, altIssue], []);
    expect(targets[0]?.area).toBe("launch");
    expect(targets[1]?.area).toBe("design");
    expect(targets[1]?.category).toBe("accessibility");
  });

  it("routes missing contact facts to the business answers area", () => {
    const [target] = gapTargets([
      {
        key: "no-phone",
        title: "No phone number",
        detail: "Visitors cannot call you.",
        action: "Add your phone number.",
        severity: "critical",
      },
    ]);
    expect(target?.area).toBe("answers");
    expect(target?.category).toBe("business");
    expect(target?.proposalId).toBeNull();
  });

  it("sorts critical findings first", () => {
    const sorted = criticalFirst(
      fixTargets(
        [issue({ severity: "opportunity", key: "a" }), issue({ severity: "critical", key: "b" })],
        [],
      ),
    );
    expect(sorted[0]?.severity).toBe("critical");
  });
});
