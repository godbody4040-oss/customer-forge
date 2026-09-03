import { describe, expect, it } from "vitest";

import { leadValue, missedCallImpact, formatPercent, formatUsd } from "@/lib/tools-calc";

describe("missedCallImpact", () => {
  it("computes lost revenue from the owner's own numbers", () => {
    const r = missedCallImpact({
      enquiriesPerWeek: 20,
      missedPercent: 25,
      closeRatePercent: 40,
      averageJobValue: 500,
    });
    expect(r.missedPerWeek).toBe(5);
    expect(r.missedPerMonth).toBeCloseTo(5 * (52 / 12), 6);
    expect(r.lostJobsPerMonth).toBeCloseTo(5 * (52 / 12) * 0.4, 6);
    expect(r.lostRevenuePerMonth).toBeCloseTo(5 * (52 / 12) * 0.4 * 500, 4);
    expect(r.lostRevenuePerYear).toBeCloseTo(r.lostRevenuePerMonth * 12, 4);
  });

  it("returns zero when nothing is missed and clamps nonsense input", () => {
    expect(
      missedCallImpact({
        enquiriesPerWeek: 30,
        missedPercent: 0,
        closeRatePercent: 50,
        averageJobValue: 400,
      }).lostRevenuePerYear,
    ).toBe(0);

    const clamped = missedCallImpact({
      enquiriesPerWeek: -5,
      missedPercent: 500,
      closeRatePercent: -20,
      averageJobValue: Number.NaN,
    });
    expect(clamped.missedPerWeek).toBe(0);
    expect(clamped.lostRevenuePerMonth).toBe(0);
  });
});

describe("leadValue", () => {
  it("computes lead economics including repeat value and margin", () => {
    const r = leadValue({
      leads: 100,
      customers: 20,
      averageJobValue: 600,
      repeatJobs: 2,
      marginPercent: 50,
      spend: 1000,
    });
    expect(r.conversionRate).toBeCloseTo(0.2, 6);
    expect(r.revenuePerCustomer).toBe(1200);
    expect(r.profitPerCustomer).toBe(600);
    expect(r.valuePerLead).toBeCloseTo(120, 6);
    expect(r.costPerLead).toBe(10);
    expect(r.costPerCustomer).toBe(50);
    expect(r.netPerLead).toBeCloseTo(110, 6);
    expect(r.roas).toBeCloseTo(24, 6);
    expect(r.breakEvenLeads).toBeCloseTo(1000 / 120, 6);
  });

  it("never divides by zero and never reports more customers than leads", () => {
    const empty = leadValue({
      leads: 0,
      customers: 5,
      averageJobValue: 500,
      repeatJobs: 1,
      marginPercent: 40,
      spend: 0,
    });
    expect(empty.conversionRate).toBe(0);
    expect(empty.costPerLead).toBe(0);
    expect(empty.roas).toBeNull();
    expect(empty.breakEvenLeads).toBeNull();

    const capped = leadValue({
      leads: 10,
      customers: 50,
      averageJobValue: 100,
      repeatJobs: 1,
      marginPercent: 100,
      spend: 0,
    });
    expect(capped.conversionRate).toBe(1);
  });
});

describe("formatters", () => {
  it("formats currency and percentages for display", () => {
    expect(formatUsd(1234.56)).toBe("$1,235");
    expect(formatUsd(12.5)).toBe("$12.50");
    expect(formatPercent(0.2)).toBe("20.0%");
    expect(formatUsd(Number.NaN)).toBe("$0.00");
  });
});
