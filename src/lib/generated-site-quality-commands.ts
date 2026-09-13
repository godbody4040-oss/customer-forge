import type { QualityRecommendation } from "./generated-site-quality";

export type QualityCommandScope =
  | "design-profile"
  | "hero"
  | "conversion"
  | "claims"
  | "content"
  | "composition"
  | "responsive"
  | "accessibility"
  | "performance"
  | "provenance"
  | "manual-review";

export interface GeneratedSiteQualityCommand {
  scope: QualityCommandScope;
  prompt: string;
  requiresApproval: boolean;
}

const scopeForRecommendation = (
  recommendation: QualityRecommendation,
): QualityCommandScope => {
  if (recommendation.dimension === "blocked") return "manual-review";
  const scopes: Record<Exclude<QualityRecommendation["dimension"], "blocked">, QualityCommandScope> = {
    brandFit: "design-profile",
    firstScreenClarity: "hero",
    conversionPath: "conversion",
    trustAndFacts: "claims",
    contentSpecificity: "content",
    visualCraft: "composition",
    responsiveUx: "responsive",
    accessibility: "accessibility",
    performance: "performance",
    editingSafety: "provenance",
  };
  return scopes[recommendation.dimension];
};

export function commandFromQualityRecommendation(
  recommendation: QualityRecommendation,
): GeneratedSiteQualityCommand {
  const scope = scopeForRecommendation(recommendation);
  const requiresApproval =
    scope === "claims" || scope === "provenance" || scope === "manual-review";

  return {
    scope,
    requiresApproval,
    prompt: requiresApproval
      ? `Prepare a proposed fix only. Do not change business facts, testimonials, ratings, credentials, availability, pricing, third-party marks, or asset provenance without owner approval. Task: ${recommendation.action}`
      : `Prepare a focused ${scope} improvement. Preserve verified facts, the persisted design profile, and the page's primary conversion path. Task: ${recommendation.action}`,
  };
}
