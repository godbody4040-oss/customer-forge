/**
 * STAGE: SELF-CRITIQUE, then AUTO-FIX.
 *
 * Before the owner ever sees a plan, the agent grades its own work the way a
 * design lead reviews a junior's: a score out of 10 on each dimension that
 * actually decides whether a website earns customers, plus the specific fixes
 * that would raise the weakest ones.
 *
 * The score is not decoration. When the overall score falls below the
 * professional threshold, the orchestrator runs one more planning pass using
 * these fixes as the brief — so a mediocre first draft is improved
 * automatically instead of being shipped and apologised for.
 */

import { callJson } from "@/lib/site-agent.server";
import type { ModelRole } from "@/lib/ai/config";

export const CRITIQUE_DIMENSIONS = [
  "design",
  "ux",
  "branding",
  "hierarchy",
  "conversion",
  "mobile",
  "accessibility",
  "seo",
  "content",
  "consistency",
] as const;

export type CritiqueDimension = (typeof CRITIQUE_DIMENSIONS)[number];

export type Critique = {
  scores: Record<CritiqueDimension, number>;
  /** Mean of the ten scores, 0-10, one decimal. */
  overall: number;
  /** Concrete fixes, worst dimension first. */
  fixes: string[];
  /** One honest line for the owner. */
  verdict: string;
  source: "model" | "skipped";
};

/** Below this, the plan is improved automatically before it is shown. */
export const QUALITY_THRESHOLD = 7.5;

const CRITIQUE_ROLE: ModelRole = "fast";

const SYSTEM = `You are a demanding design lead reviewing a planned set of changes to a real local
business website before it goes live. You are not encouraging and you are not harsh — you are accurate.

Score each dimension 0-10, where 7 is "a competent agency would ship this" and 9+ is
"genuinely distinctive". Generic template arrangements, repeated identical cards, placeholder-ish
copy, buried calls to action, decorative motion and unwritten meta text all score below 6.

Return JSON only:
{
  "scores": {"design":0,"ux":0,"branding":0,"hierarchy":0,"conversion":0,"mobile":0,"accessibility":0,"seo":0,"content":0,"consistency":0},
  "fixes": ["specific, actionable fixes that would raise the lowest scores — name the section and what to change"],
  "verdict": "one honest sentence about the plan as it stands"
}

Rules:
- Judge the plan against the design direction and the owner's goal, not against a generic checklist.
- A fix must be something the plan can actually do to the website's pages, sections, copy, colours,
  search text, links or effects. Never suggest inventing reviews, ratings, awards or prices.
- If the plan is already strong, say so and return few or no fixes. Do not manufacture criticism.`;

const clamp = (value: unknown) => {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 6;
  return Math.max(0, Math.min(10, Math.round(number * 10) / 10));
};

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Grades one plan. Never throws: an unusable gateway returns a skipped critique. */
export async function critiquePlan(options: {
  goal: string;
  designBrief: string;
  actions: object[];
  requirements: string[];
}): Promise<Critique> {
  try {
    const raw = await callJson(CRITIQUE_ROLE, [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          `THE OWNER'S GOAL: ${options.goal}`,
          "",
          options.designBrief,
          "",
          "REQUIREMENTS THIS PLAN MUST MEET:",
          ...options.requirements.map((item, index) => `${index + 1}. ${item}`),
          "",
          "THE PLANNED CHANGES:",
          JSON.stringify(options.actions).slice(0, 14_000),
        ].join("\n"),
      },
    ], { task: "agent.critique" });

    const rawScores = (raw["scores"] ?? {}) as Record<string, unknown>;
    const scores = Object.fromEntries(
      CRITIQUE_DIMENSIONS.map((dimension) => [dimension, clamp(rawScores[dimension])]),
    ) as Record<CritiqueDimension, number>;
    const overall =
      Math.round(
        (CRITIQUE_DIMENSIONS.reduce((total, dimension) => total + scores[dimension], 0) /
          CRITIQUE_DIMENSIONS.length) *
          10,
      ) / 10;
    const fixes = (Array.isArray(raw["fixes"]) ? raw["fixes"] : [])
      .map((item) => text(item, 240))
      .filter(Boolean)
      .slice(0, 6);

    return {
      scores,
      overall,
      fixes,
      verdict: text(raw["verdict"], 300),
      source: "model",
    };
  } catch {
    return {
      scores: Object.fromEntries(CRITIQUE_DIMENSIONS.map((dimension) => [dimension, 0])) as Record<
        CritiqueDimension,
        number
      >,
      overall: 0,
      fixes: [],
      verdict: "",
      source: "skipped",
    };
  }
}

/** The auto-fix brief: raise the plan, do not restate it. */
export function improvementBrief(critique: Critique, goal: string, actions: object[]) {
  const weakest = CRITIQUE_DIMENSIONS.filter((dimension) => critique.scores[dimension] < 7).map(
    (dimension) => `${dimension} (${critique.scores[dimension]}/10)`,
  );
  return [
    "YOUR OWN REVIEW SCORED THIS PLAN BELOW A PROFESSIONAL STANDARD. RAISE IT.",
    "",
    `THE OWNER'S GOAL: ${goal}`,
    `OVERALL: ${critique.overall}/10${weakest.length ? `. Weakest: ${weakest.join(", ")}` : ""}`,
    "",
    "FIXES YOU IDENTIFIED YOURSELF:",
    ...critique.fixes.map((fix, index) => `${index + 1}. ${fix}`),
    "",
    "ACTIONS ALREADY PLANNED:",
    JSON.stringify(actions).slice(0, 12_000),
    "",
    'Return the same JSON shape. "actions" must contain ONLY the ADDITIONAL or CORRECTED actions that',
    "carry out the fixes above — do not repeat an action already listed. Write real, specific copy.",
    'Put anything you deliberately did not do in "notes". Never invent a fact to close a gap.',
  ].join("\n");
}
