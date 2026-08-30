/**
 * Free Revora Growth Assessment — pure scoring logic.
 *
 * Turns the visitor's own answers into a growth score, the specific gaps that
 * are costing them customers, and an arithmetic estimate of missed revenue.
 * Every number is derived only from what the visitor typed: no Revora
 * performance claim, no fabricated benchmarks.
 */

export interface AssessmentAnswers {
  businessName: string;
  industry: string;
  email: string;
  /** Leads (calls, forms, DMs) per month. */
  leadsPerMonth: number;
  /** Average value of one job/customer. */
  averageJobValue: number;
  /** Share of leads that become paying customers, 0-100. */
  closeRate: number;
  /** Typical time before a new lead gets a reply. */
  replySpeed: "minutes" | "hours" | "same_day" | "days";
  hasWebsite: boolean;
  hasOnlineBooking: boolean;
  hasInstantQuote: boolean;
  hasCrm: boolean;
  hasAutomatedFollowUp: boolean;
  hasReviewRequests: boolean;
  hasLocalSeo: boolean;
  tracksLeadSources: boolean;
}

export interface AssessmentGap {
  key: string;
  title: string;
  /** Plain-language cost of the gap. */
  cost: string;
  /** What Revora puts in place instead. */
  fix: string;
  /** Weight of this gap in the score (points recovered when fixed). */
  points: number;
}

export interface AssessmentResult {
  /** 0-100 readiness score. */
  score: number;
  band: "Critical" | "Leaking" | "Solid" | "Elite";
  headline: string;
  gaps: AssessmentGap[];
  strengths: string[];
  /** Estimated monthly revenue slipping through the gaps found. */
  missedRevenueMonthly: number;
  missedRevenueYearly: number;
  /** Share of leads assumed lost to the gaps found, 0-100. */
  leakagePercent: number;
  /** Recoverable customers per month at the visitor's own close rate. */
  recoverableCustomers: number;
}

const REPLY_LEAK: Record<AssessmentAnswers["replySpeed"], number> = {
  minutes: 0,
  hours: 6,
  same_day: 12,
  days: 22,
};

const CHECKS: {
  key: keyof AssessmentAnswers;
  title: string;
  cost: string;
  fix: string;
  points: number;
  /** Extra share of leads assumed lost while the gap exists, in %. */
  leak: number;
  strength: string;
}[] = [
  {
    key: "hasWebsite",
    title: "No conversion-built website",
    cost: "Searchers can't verify you, so they call the next business on the list.",
    fix: "A fast, mobile-first site with call, quote and book actions on every screen.",
    points: 16,
    leak: 14,
    strength: "You already have a website presence",
  },
  {
    key: "hasInstantQuote",
    title: "No instant quote or pricing path",
    cost: "Price-shoppers leave before you ever hear from them.",
    fix: "An instant quote calculator that returns a range and captures the lead's answers.",
    points: 14,
    leak: 10,
    strength: "Visitors can get pricing without waiting",
  },
  {
    key: "hasOnlineBooking",
    title: "No online booking",
    cost: "Anyone who won't call during business hours never books.",
    fix: "A booking calendar with your real availability and automatic confirmations.",
    points: 12,
    leak: 8,
    strength: "Customers can book themselves",
  },
  {
    key: "hasCrm",
    title: "Leads live in your phone, not a system",
    cost: "Warm leads get buried under texts, voicemails and job days.",
    fix: "One pipeline from new to booked, with owed follow-ups surfaced first.",
    points: 12,
    leak: 9,
    strength: "Leads are tracked in one place",
  },
  {
    key: "hasAutomatedFollowUp",
    title: "Follow-up depends on you remembering",
    cost: "Most lost jobs are quiet leads nobody chased a second time.",
    fix: "Automations that follow up, confirm and re-engage without you touching it.",
    points: 14,
    leak: 11,
    strength: "Follow-up already runs automatically",
  },
  {
    key: "hasReviewRequests",
    title: "Reviews aren't being asked for",
    cost: "Fewer recent reviews means lower ranking and lower trust than competitors.",
    fix: "Automatic review requests after completed jobs, with public proof on your site.",
    points: 10,
    leak: 6,
    strength: "You collect reviews after jobs",
  },
  {
    key: "hasLocalSeo",
    title: "No local SEO structure",
    cost: "You're invisible for most 'service + city' searches in your area.",
    fix: "Service and city pages, schema, sitemap and a health score that says what's next.",
    points: 12,
    leak: 9,
    strength: "You show up for local searches",
  },
  {
    key: "tracksLeadSources",
    title: "You can't tell what's working",
    cost: "Money keeps going to channels that never produced a paying customer.",
    fix: "Traffic, leads, quotes and bookings by source with conversion rate per channel.",
    points: 10,
    leak: 5,
    strength: "You know where customers come from",
  },
];

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

/** Scores the answers and estimates the revenue leaking through the gaps. */
export function scoreAssessment(answers: AssessmentAnswers): AssessmentResult {
  const leads = clampNumber(Math.round(answers.leadsPerMonth), 0, 5000);
  const value = clampNumber(Math.round(answers.averageJobValue), 0, 500_000);
  const closeRate = clampNumber(Math.round(answers.closeRate), 1, 100);

  const gaps: AssessmentGap[] = [];
  const strengths: string[] = [];
  let points = 100;
  let leakage = REPLY_LEAK[answers.replySpeed] ?? 0;

  for (const check of CHECKS) {
    if (answers[check.key] === true) {
      strengths.push(check.strength);
      continue;
    }
    points -= check.points;
    leakage += check.leak;
    gaps.push({
      key: String(check.key),
      title: check.title,
      cost: check.cost,
      fix: check.fix,
      points: check.points,
    });
  }

  if (answers.replySpeed !== "minutes") {
    gaps.unshift({
      key: "replySpeed",
      title: "Leads wait too long for a reply",
      cost: "Interest fades fast — whoever answers first usually wins the job.",
      fix: "Instant lead alerts plus automated first replies the moment a form lands.",
      points: REPLY_LEAK[answers.replySpeed],
    });
    points -= REPLY_LEAK[answers.replySpeed];
  } else {
    strengths.push("You reply to new leads within minutes");
  }

  const score = Math.round(clampNumber(points, 4, 100));
  const leakagePercent = Math.round(clampNumber(leakage, 0, 70));
  const recoverableCustomers = Math.round(((leads * leakagePercent) / 100) * (closeRate / 100));
  const missedRevenueMonthly = recoverableCustomers * value;

  const band: AssessmentResult["band"] =
    score >= 85 ? "Elite" : score >= 65 ? "Solid" : score >= 40 ? "Leaking" : "Critical";

  const headline =
    band === "Elite"
      ? "Your funnel is strong — Revora would mostly automate and compound it."
      : band === "Solid"
        ? "The foundation is there, but customers are still slipping through the cracks."
        : band === "Leaking"
          ? "You're paying for attention and losing it before it becomes revenue."
          : "Most of the people who want to hire you never make it to a booking.";

  return {
    score,
    band,
    headline,
    gaps,
    strengths,
    missedRevenueMonthly,
    missedRevenueYearly: missedRevenueMonthly * 12,
    leakagePercent,
    recoverableCustomers,
  };
}

/** Blank answer set used to seed the form. */
export const DEFAULT_ANSWERS: AssessmentAnswers = {
  businessName: "",
  industry: "",
  email: "",
  leadsPerMonth: 40,
  averageJobValue: 350,
  closeRate: 30,
  replySpeed: "hours",
  hasWebsite: false,
  hasOnlineBooking: false,
  hasInstantQuote: false,
  hasCrm: false,
  hasAutomatedFollowUp: false,
  hasReviewRequests: false,
  hasLocalSeo: false,
  tracksLeadSources: false,
};

export const CAPABILITY_QUESTIONS = CHECKS.map((c) => ({
  key: c.key as keyof AssessmentAnswers,
  label: c.strength,
}));
