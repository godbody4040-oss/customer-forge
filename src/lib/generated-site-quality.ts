export type QualityDimension =
  | "brandFit"
  | "firstScreenClarity"
  | "conversionPath"
  | "trustAndFacts"
  | "contentSpecificity"
  | "visualCraft"
  | "responsiveUx"
  | "accessibility"
  | "performance"
  | "editingSafety";

export type QualityEvidence = Partial<Record<QualityDimension, boolean>>;

export interface GeneratedSiteQualityInput {
  evidence: QualityEvidence;
  blockedReasons?: string[];
}

export interface GeneratedSiteQualityResult {
  score: number;
  dimensionScores: Record<QualityDimension, number>;
  failedDimensions: QualityDimension[];
  blockedReasons: string[];
  publishable: boolean;
}

export interface QualityRecommendation {
  dimension: QualityDimension | "blocked";
  priority: "critical" | "high" | "medium";
  action: string;
}

export const QUALITY_DIMENSIONS: QualityDimension[] = [
  "brandFit", "firstScreenClarity", "conversionPath", "trustAndFacts", "contentSpecificity", "visualCraft", "responsiveUx", "accessibility", "performance", "editingSafety",
];

export const MINIMUM_DIMENSION_SCORE = 4;
export const MINIMUM_PUBLISH_SCORE = 4.2;

const RECOMMENDATIONS: Record<QualityDimension, Omit<QualityRecommendation, "dimension">> = {
  brandFit: { priority: "high", action: "Resolve one site-wide design profile from the business category, locale, intent, and verified brand assets." },
  firstScreenClarity: { priority: "high", action: "Rewrite the hero with a specific outcome, the served audience or service, supporting proof, and one primary CTA." },
  conversionPath: { priority: "critical", action: "Add and verify one relevant primary conversion route: contact, quote, booking, purchase, or visit." },
  trustAndFacts: { priority: "critical", action: "Verify or remove business facts, reviews, credentials, results claims, pricing, availability, and third-party marks." },
  contentSpecificity: { priority: "high", action: "Replace generic copy with verified services, audience, location, process, and differentiators." },
  visualCraft: { priority: "medium", action: "Apply the resolved tokens and vary section composition, imagery, and proof patterns without template repetition." },
  responsiveUx: { priority: "critical", action: "Fix mobile overflow, CTA visibility, navigation, image crops, type density, stacking, and touch-target size." },
  accessibility: { priority: "critical", action: "Fix heading hierarchy, labels, keyboard flow, visible focus, contrast, landmarks, and image alt text." },
  performance: { priority: "high", action: "Size media, protect the LCP image, lazy-load below-fold assets, reduce scripts, and prevent layout shift." },
  editingSafety: { priority: "critical", action: "Attach provenance or verification state to generated facts and assets; block unresolved placeholders." },
};

function scoreEvidence(passed: boolean | undefined): number { return passed ? 5 : 0; }

export function evaluateGeneratedSiteQuality(input: GeneratedSiteQualityInput): GeneratedSiteQualityResult {
  const dimensionScores = Object.fromEntries(QUALITY_DIMENSIONS.map((dimension) => [dimension, scoreEvidence(input.evidence[dimension])])) as Record<QualityDimension, number>;
  const failedDimensions = QUALITY_DIMENSIONS.filter((dimension) => dimensionScores[dimension] < MINIMUM_DIMENSION_SCORE);
  const score = QUALITY_DIMENSIONS.reduce((total, dimension) => total + dimensionScores[dimension], 0) / QUALITY_DIMENSIONS.length;
  const blockedReasons = [...new Set(input.blockedReasons ?? [])].filter(Boolean);
  return { score, dimensionScores, failedDimensions, blockedReasons, publishable: failedDimensions.length === 0 && blockedReasons.length === 0 && score >= MINIMUM_PUBLISH_SCORE };
}

export function qualityFailureSummary(result: GeneratedSiteQualityResult): string[] {
  return [...result.failedDimensions.map((dimension) => `Missing quality evidence: ${dimension}`), ...result.blockedReasons];
}

export function recommendGeneratedSiteQualityImprovements(result: GeneratedSiteQualityResult): QualityRecommendation[] {
  const blocked = result.blockedReasons.map((reason) => ({ dimension: "blocked" as const, priority: "critical" as const, action: reason }));
  const dimensions = result.failedDimensions.map((dimension) => ({ dimension, ...RECOMMENDATIONS[dimension] }));
  const rank = { critical: 0, high: 1, medium: 2 };
  return [...blocked, ...dimensions].sort((a, b) => rank[a.priority] - rank[b.priority]);
}
