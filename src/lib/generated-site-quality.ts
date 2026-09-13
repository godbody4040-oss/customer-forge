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

export const QUALITY_DIMENSIONS: QualityDimension[] = [
  "brandFit",
  "firstScreenClarity",
  "conversionPath",
  "trustAndFacts",
  "contentSpecificity",
  "visualCraft",
  "responsiveUx",
  "accessibility",
  "performance",
  "editingSafety",
];

export const MINIMUM_DIMENSION_SCORE = 4;
export const MINIMUM_PUBLISH_SCORE = 4.2;

function scoreEvidence(passed: boolean | undefined): number {
  return passed ? 5 : 0;
}

export function evaluateGeneratedSiteQuality(
  input: GeneratedSiteQualityInput,
): GeneratedSiteQualityResult {
  const dimensionScores = Object.fromEntries(
    QUALITY_DIMENSIONS.map((dimension) => [
      dimension,
      scoreEvidence(input.evidence[dimension]),
    ]),
  ) as Record<QualityDimension, number>;

  const failedDimensions = QUALITY_DIMENSIONS.filter(
    (dimension) => dimensionScores[dimension] < MINIMUM_DIMENSION_SCORE,
  );
  const score = QUALITY_DIMENSIONS.reduce(
    (total, dimension) => total + dimensionScores[dimension], 0) /
    QUALITY_DIMENSIONS.length;
  const blockedReasons = [...new Set(input.blockedReasons ?? [])].filter(Boolean);

  return {
    score,
    dimensionScores,
    failedDimensions,
    blockedReasons,
    publishable:
      failedDimensions.length === 0 &&
      blockedReasons.length === 0 &&
      score >= MINIMUM_PUBLISH_SCORE,
  };
}

export function qualityFailureSummary(
  result: GeneratedSiteQualityResult,
): string[] {
  return [
    ...result.failedDimensions.map((dimension) => `Missing quality evidence: ${dimension}`),
    ...result.blockedReasons,
  ];
}
