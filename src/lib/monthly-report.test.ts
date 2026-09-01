import { describe, expect, it } from "vitest";
import {
  buildMonthlyReport,
  conversionRate,
  growth,
  monthKey,
  monthLabel,
  netRevenue,
  recentMonths,
  windowStart,
} from "@/lib/monthly-report";

describe("month bucketing", () => {
  it("buckets timestamps into UTC months", () => {
    expect(monthKey("2026-08-31T23:59:59.000Z")).toBe("2026-08");
    expect(monthKey("2026-09-01T00:00:00.000Z")).toBe("2026-09");
  });

  it("ignores unusable timestamps instead of inventing a month", () => {
    expect(monthKey(null)).toBeNull();
    expect(monthKey("not a date")).toBeNull();
  });

  it("labels months for humans", () => {
    expect(monthLabel("2026-01")).toBe("Jan 2026");
    expect(monthLabel("2026-12")).toBe("Dec 2026");
  });

  it("walks back across a year boundary", () => {
    const months = recentMonths(3, new Date("2026-01-15T00:00:00.000Z"));
    expect(months).toEqual(["2026-01", "2025-12", "2025-11"]);
  });

  it("starts the query window at the first day of the oldest month", () => {
    expect(windowStart(["2026-03", "2026-02"])).toBe("2026-02-01T00:00:00.000Z");
  });
});

describe("revenue recognition", () => {
  const base = { organization_id: "a", created_at: "2026-08-02T00:00:00.000Z" };

  it("counts completed payments", () => {
    expect(netRevenue({ ...base, amount: 750, status: "completed" }).net).toBe(750);
  });

  it("does not count money that was never captured", () => {
    for (const status of ["created", "pending", "approved", "failed", "cancelled"]) {
      expect(netRevenue({ ...base, amount: 750, status }).net).toBe(0);
    }
  });

  it("nets out a partial refund", () => {
    const row = { ...base, amount: 750, status: "partially_refunded", refunded_amount: 250 };
    expect(netRevenue(row)).toEqual({ gross: 750, refunded: 250, net: 500 });
  });

  it("treats a full refund as zero revenue even without a refunded amount", () => {
    const row = { ...base, amount: 750, status: "refunded" };
    expect(netRevenue(row)).toEqual({ gross: 750, refunded: 750, net: 0 });
  });

  it("never lets a refund push revenue negative", () => {
    const row = { ...base, amount: 100, status: "partially_refunded", refunded_amount: 500 };
    expect(netRevenue(row).net).toBe(0);
  });

  it("reads numeric strings from the database", () => {
    expect(netRevenue({ ...base, amount: "100.50", status: "completed" }).net).toBe(100.5);
  });
});

describe("monthly report", () => {
  const months = ["2026-08", "2026-07"];

  const report = () =>
    buildMonthlyReport({
      months,
      payments: [
        {
          organization_id: "org-a",
          amount: 750,
          status: "completed",
          created_at: "2026-07-30T00:00:00.000Z",
          completed_at: "2026-08-01T00:00:00.000Z",
        },
        {
          organization_id: "org-a",
          amount: 100,
          status: "completed",
          created_at: "2026-08-05T00:00:00.000Z",
          completed_at: "2026-08-05T00:00:00.000Z",
        },
        {
          organization_id: "org-b",
          amount: 100,
          status: "failed",
          created_at: "2026-08-06T00:00:00.000Z",
          completed_at: null,
        },
        {
          organization_id: "org-b",
          amount: 100,
          status: "completed",
          created_at: "2026-07-04T00:00:00.000Z",
          completed_at: "2026-07-04T00:00:00.000Z",
        },
        // Outside the window — must be ignored entirely.
        {
          organization_id: "org-a",
          amount: 9999,
          status: "completed",
          created_at: "2025-01-04T00:00:00.000Z",
          completed_at: "2025-01-04T00:00:00.000Z",
        },
      ],
      leads: [
        { organization_id: "org-a", created_at: "2026-08-09T00:00:00.000Z" },
        { organization_id: "org-a", created_at: "2026-08-10T00:00:00.000Z" },
        { organization_id: "org-b", created_at: "2026-08-11T00:00:00.000Z" },
        { organization_id: null, created_at: "2026-08-11T00:00:00.000Z" },
      ],
      bookings: [{ organization_id: "org-b", created_at: "2026-08-12T00:00:00.000Z" }],
      traffic: [
        {
          organization_id: "org-a",
          created_at: "2026-08-09T00:00:00.000Z",
          session_id: "s1",
        },
        {
          organization_id: "org-a",
          created_at: "2026-08-09T10:00:00.000Z",
          session_id: "s1",
        },
        {
          organization_id: "org-a",
          created_at: "2026-08-09T11:00:00.000Z",
          session_id: "s2",
        },
      ],
    });

  it("recognizes revenue in the month it was captured, not created", () => {
    const august = report().months.find((m) => m.month === "2026-08")!;
    expect(august.revenue).toBe(850); // 750 setup captured 1 Aug + 100 monthly
  });

  it("keeps each workspace's numbers separate", () => {
    const rows = report().rows;
    const augA = rows.find((r) => r.month === "2026-08" && r.organizationId === "org-a")!;
    const augB = rows.find((r) => r.month === "2026-08" && r.organizationId === "org-b")!;
    expect(augA.revenue).toBe(850);
    expect(augA.leads).toBe(2);
    expect(augB.revenue).toBe(0); // failed payment is not revenue
    expect(augB.leads).toBe(1);
    expect(augB.bookings).toBe(1);
  });

  it("counts visits and de-duplicates visitors by session", () => {
    const augA = report().rows.find(
      (r) => r.month === "2026-08" && r.organizationId === "org-a",
    )!;
    expect(augA.visits).toBe(3);
    expect(augA.visitors).toBe(2);
  });

  it("drops rows with no workspace so nothing is attributed to the wrong tenant", () => {
    const august = report().months.find((m) => m.month === "2026-08")!;
    expect(august.leads).toBe(3); // the null-org lead is excluded
  });

  it("returns a row for every requested month, even an empty one", () => {
    const result = buildMonthlyReport({
      months: ["2026-08", "2026-07"],
      payments: [],
      leads: [],
      bookings: [],
      traffic: [],
    });
    expect(result.months.map((m) => m.month)).toEqual(["2026-08", "2026-07"]);
    expect(result.months.every((m) => m.revenue === 0 && m.workspaces === 0)).toBe(true);
  });

  it("counts July separately", () => {
    const july = report().months.find((m) => m.month === "2026-07")!;
    expect(july.revenue).toBe(100);
    expect(july.workspaces).toBe(1);
  });
});

describe("derived metrics", () => {
  it("computes month over month growth", () => {
    expect(growth(150, 100)).toBe(50);
    expect(growth(50, 100)).toBe(-50);
    expect(growth(100, 0)).toBe(100);
    expect(growth(0, 0)).toBeNull();
  });

  it("computes visit to lead conversion", () => {
    expect(conversionRate({ leads: 5, visits: 100 })).toBe(5);
    expect(conversionRate({ leads: 0, visits: 0 })).toBeNull();
  });
});
