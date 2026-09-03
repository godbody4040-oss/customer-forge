/**
 * Pure math behind the free public calculators.
 *
 * These are real calculations on numbers the visitor supplies — no estimates
 * invented on their behalf, no industry "averages" pretending to be data.
 * Kept pure and separate so the arithmetic is unit-tested.
 */

export interface MissedCallInput {
  /** Enquiries received per week (calls, forms, texts). */
  enquiriesPerWeek: number;
  /** Share of enquiries that go unanswered, 0-100. */
  missedPercent: number;
  /** Share of answered enquiries that become jobs, 0-100. */
  closeRatePercent: number;
  /** Average revenue of one job. */
  averageJobValue: number;
}

export interface MissedCallResult {
  missedPerWeek: number;
  missedPerMonth: number;
  lostJobsPerMonth: number;
  lostRevenuePerMonth: number;
  lostRevenuePerYear: number;
}

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

const WEEKS_PER_MONTH = 52 / 12;

/** What unanswered enquiries cost, using only the owner's own numbers. */
export function missedCallImpact(input: MissedCallInput): MissedCallResult {
  const enquiries = clamp(input.enquiriesPerWeek, 0, 100000);
  const missedShare = clamp(input.missedPercent, 0, 100) / 100;
  const closeShare = clamp(input.closeRatePercent, 0, 100) / 100;
  const jobValue = clamp(input.averageJobValue, 0, 10000000);

  const missedPerWeek = enquiries * missedShare;
  const missedPerMonth = missedPerWeek * WEEKS_PER_MONTH;
  const lostJobsPerMonth = missedPerMonth * closeShare;
  const lostRevenuePerMonth = lostJobsPerMonth * jobValue;

  return {
    missedPerWeek,
    missedPerMonth,
    lostJobsPerMonth,
    lostRevenuePerMonth,
    lostRevenuePerYear: lostRevenuePerMonth * 12,
  };
}

export interface LeadValueInput {
  /** Leads received in the period. */
  leads: number;
  /** Leads that became paying customers in the period. */
  customers: number;
  /** Average revenue per customer, first job. */
  averageJobValue: number;
  /** Average number of repeat jobs per customer over their life (1 = one job only). */
  repeatJobs: number;
  /** Gross margin percent, 0-100. */
  marginPercent: number;
  /** What was spent to generate those leads in the period. */
  spend: number;
}

export interface LeadValueResult {
  conversionRate: number;
  revenuePerCustomer: number;
  profitPerCustomer: number;
  valuePerLead: number;
  costPerLead: number;
  costPerCustomer: number;
  /** Profit per lead minus cost per lead. */
  netPerLead: number;
  /** Return per 1 unit spent, null when nothing was spent. */
  roas: number | null;
  breakEvenLeads: number | null;
}

/** What a lead is actually worth, and what it currently costs. */
export function leadValue(input: LeadValueInput): LeadValueResult {
  const leads = clamp(input.leads, 0, 10000000);
  const customers = Math.min(clamp(input.customers, 0, 10000000), leads || Infinity);
  const jobValue = clamp(input.averageJobValue, 0, 10000000);
  const repeats = clamp(input.repeatJobs, 1, 1000);
  const margin = clamp(input.marginPercent, 0, 100) / 100;
  const spend = clamp(input.spend, 0, 100000000);

  const conversionRate = leads > 0 ? customers / leads : 0;
  const revenuePerCustomer = jobValue * repeats;
  const profitPerCustomer = revenuePerCustomer * margin;
  const valuePerLead = profitPerCustomer * conversionRate;
  const costPerLead = leads > 0 ? spend / leads : 0;
  const costPerCustomer = customers > 0 ? spend / customers : 0;
  const netPerLead = valuePerLead - costPerLead;
  const revenuePerLead = revenuePerCustomer * conversionRate;

  return {
    conversionRate,
    revenuePerCustomer,
    profitPerCustomer,
    valuePerLead,
    costPerLead,
    costPerCustomer,
    netPerLead,
    roas: spend > 0 ? (revenuePerLead * leads) / spend : null,
    breakEvenLeads: valuePerLead > 0 ? spend / valuePerLead : null,
  };
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(fraction: number): string {
  return `${(Number.isFinite(fraction) ? fraction * 100 : 0).toFixed(1)}%`;
}
