/**
 * Server-only AI copy engine for the Revora Site Engine.
 *
 * Hard rule enforced in every prompt: the model may only use facts supplied by
 * the client. It must never invent reviews, awards, certifications, licences,
 * guarantees, business history, addresses, prices or credentials.
 */

import type { SiteCopy } from "@/lib/site-engine";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const COPY_MODEL = "google/gemini-3-flash-preview";
/**
 * Analysis is a reasoning job, not a writing job, so it runs on a stronger
 * model. If that model isn't available to the workspace the call falls back to
 * the copy model, and if the whole pass fails the build still completes using
 * the deterministic brief in `fallbackBrief`.
 */
export const ANALYSIS_MODEL = "google/gemini-3-pro-preview";

const SAFETY = `You write marketing copy for local business websites.
ABSOLUTE RULES:
- Use only the facts given. Never invent reviews, testimonials, ratings, awards,
  certifications, licences, insurance, guarantees, years in business, addresses,
  staff, prices or credentials.
- Never write "5-star", "award-winning", "licensed", "insured", "certified",
  "trusted by hundreds" or similar unless that exact fact is supplied.
- If a fact is missing, write around it. Do not use placeholder brackets.
- Plain, confident, specific. No emoji. No keyword stuffing. British or American
  spelling consistent with the input.`;

export type CopyFacts = {
  businessName: string;
  industry: string;
  description: string | null;
  city: string | null;
  state: string | null;
  serviceArea: string | null;
  phone: string | null;
  email: string | null;
  yearsInBusiness: number | null;
  hasHours: boolean;
  style: string | null;
  goals: string[];
  ctaLabel: string;
  services: { name: string; description?: string | null; price?: number | null; starting_price?: number | null }[];
};

/** Carries the gateway HTTP status so the worker can pause or retry correctly. */
export class AiGatewayError extends Error {
  status: number;
  retryAfterSeconds: number | null;
  constructor(status: number, message: string, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "AiGatewayError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function chatJson(
  system: string,
  prompt: string,
  model: string = COPY_MODEL,
): Promise<Record<string, unknown>> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI copywriting isn't configured for this workspace.");

  const response = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `${SAFETY}\n\n${system}` },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after")) || null;
      throw new AiGatewayError(429, "AI is busy right now. The build will retry automatically.", retryAfter);
    }
    if (response.status === 402)
      throw new AiGatewayError(402, "AI credits are exhausted for this workspace. Top up to continue building sites.");
    if (response.status === 403)
      throw new AiGatewayError(403, "AI is blocked for this workspace by a policy or spend limit.");
    console.error("[site-engine] gateway error", response.status, body);
    throw new AiGatewayError(response.status, "The copy engine couldn't be reached. Try again.");
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = payload.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad shape");
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("The copy engine returned an unexpected response. Try again.");
  }
}

const factSheet = (facts: CopyFacts) =>
  JSON.stringify(
    {
      business: facts.businessName,
      category: facts.industry,
      ownerDescription: facts.description,
      location: [facts.city, facts.state].filter(Boolean).join(", ") || null,
      serviceArea: facts.serviceArea,
      hasPhone: Boolean(facts.phone),
      hasEmail: Boolean(facts.email),
      publishedHours: facts.hasHours,
      yearsInBusiness: facts.yearsInBusiness,
      preferredStyle: facts.style,
      websiteGoals: facts.goals,
      services: facts.services.map((s) => ({
        name: s.name,
        detail: s.description ?? null,
        price: s.price ?? null,
        startingPrice: s.starting_price ?? null,
      })),
    },
    null,
    2,
  );

const str = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

/** Full website copy pass. */
export async function generateSiteCopy(facts: CopyFacts, brief?: SiteBrief | null): Promise<SiteCopy> {
  const data = await chatJson(
    `Return JSON with exactly these keys: heroHeadline (max 70 chars), heroSubheadline (max 160 chars),
primaryCta (max 24 chars), secondaryCta (max 24 chars), intro (2 sentences),
about (2 short paragraphs, plain text with \\n\\n between), benefits (array of 3-5 short strings),
serviceCards (array of {name, copy} — one per supplied service, copy max 220 chars, keep the exact service name),
faqs (array of 4-6 {question, answer} relevant to this category, services and area — never promise anything not supplied),
areaCopy (2 sentences about where they work; omit places not supplied),
metaTitle (max 60 chars), metaDescription (max 155 chars), ogTitle (max 60 chars), ogDescription (max 155 chars).`,
    `Write the website copy for this business. The main action visitors should take is: ${facts.ctaLabel}.${briefContext(brief)}\n\nFACTS:\n${factSheet(facts)}`,
  );

  const cards = Array.isArray(data["serviceCards"]) ? (data["serviceCards"] as Record<string, unknown>[]) : [];
  const faqs = Array.isArray(data["faqs"]) ? (data["faqs"] as Record<string, unknown>[]) : [];

  return {
    heroHeadline: str(data["heroHeadline"], facts.businessName),
    heroSubheadline: str(data["heroSubheadline"]),
    primaryCta: str(data["primaryCta"], facts.ctaLabel),
    secondaryCta: str(data["secondaryCta"], "See services"),
    intro: str(data["intro"]),
    about: str(data["about"], facts.description ?? ""),
    benefits: (Array.isArray(data["benefits"]) ? (data["benefits"] as unknown[]) : [])
      .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
      .slice(0, 5),
    serviceCards: cards
      .map((c) => ({ name: str(c["name"]), copy: str(c["copy"]) }))
      .filter((c) => c.name),
    faqs: faqs
      .map((f) => ({ question: str(f["question"]), answer: str(f["answer"]) }))
      .filter((f) => f.question && f.answer)
      .slice(0, 6),
    areaCopy: str(data["areaCopy"]),
    metaTitle: str(data["metaTitle"], facts.businessName).slice(0, 60),
    metaDescription: str(data["metaDescription"]).slice(0, 158),
    ogTitle: str(data["ogTitle"], str(data["metaTitle"], facts.businessName)).slice(0, 60),
    ogDescription: str(data["ogDescription"], str(data["metaDescription"])).slice(0, 158),
  };
}

/** Targeted rewrite: only the supplied fields change. */
export async function rewriteCopyFields(
  facts: CopyFacts,
  current: Record<string, string>,
  instruction: string,
): Promise<Record<string, string>> {
  const data = await chatJson(
    `Rewrite only the fields given in "current". Return JSON with the same keys and no others.
Keep every field's role and length limits. Do not add facts. Do not change structure.`,
    `Instruction from the business owner: "${instruction}"\n\ncurrent:\n${JSON.stringify(current, null, 2)}\n\nFACTS:\n${factSheet(facts)}`,
  );

  const out: Record<string, string> = {};
  for (const key of Object.keys(current)) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return out;
}

/* --------------------------- Section edit assistant ------------------------ */

export type SectionForEdit = {
  id: string;
  label: string;
  heading: string | null;
  subheading: string | null;
  body: string | null;
};

export type ProposedEdit = {
  sectionId: string;
  field: "heading" | "subheading" | "body";
  after: string;
};

/**
 * Proposes section edits from a plain-language instruction. Returns only the
 * fields it wants to change — nothing is written until the client confirms.
 */
export async function proposeSectionEdits(
  facts: CopyFacts,
  sections: SectionForEdit[],
  instruction: string,
): Promise<{ edits: ProposedEdit[]; reply: string }> {
  const data = await chatJson(
    `You edit sections of a local business website on request.
Return JSON: { "reply": string (one short sentence describing what you changed),
"edits": [ { "sectionId": string, "field": "heading" | "subheading" | "body", "after": string } ] }.
Rules:
- Only include sections listed in "sections", using their exact id.
- Only include fields you actually changed. Never return unchanged text.
- Headings max 70 characters, subheadings max 160, body max 900.
- Add no new facts. If the request needs information not supplied, return an
  empty edits array and explain that in "reply".`,
    `Instruction: "${instruction}"\n\nsections:\n${JSON.stringify(sections, null, 2)}\n\nFACTS:\n${factSheet(facts)}`,
  );

  const ids = new Set(sections.map((s) => s.id));
  const allowed = new Set(["heading", "subheading", "body"]);
  const raw = Array.isArray(data["edits"]) ? (data["edits"] as Record<string, unknown>[]) : [];
  const edits: ProposedEdit[] = [];
  for (const entry of raw.slice(0, 24)) {
    const sectionId = str(entry["sectionId"]);
    const field = str(entry["field"]);
    const after = str(entry["after"]);
    if (!ids.has(sectionId) || !allowed.has(field) || !after) continue;
    edits.push({
      sectionId,
      field: field as ProposedEdit["field"],
      after: after.slice(0, field === "body" ? 900 : field === "subheading" ? 200 : 90),
    });
  }
  return { edits, reply: str(data["reply"], edits.length ? "Here are the changes I suggest." : "I couldn't make that change without more information.") };
}
