import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { fetchAllRows } from "@/lib/paginate";

/**
 * Guards for the rules that protect real money and real reporting:
 *  - test-mode (sandbox) Stripe traffic can never change production billing,
 *    production access, or the paid-customer count,
 *  - refunds always go back to the environment the payment was taken in,
 *  - reporting reads every row instead of stopping at an arbitrary ceiling.
 */
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("sandbox Stripe traffic cannot change production billing", () => {
  const billing = read("./stripe-billing.server.ts");
  const webhook = read("../routes/api/public/payments/webhook.ts");
  const payments = read("./payments.server.ts");

  it("stops sandbox subscription events before the canonical workspace update", () => {
    expect(billing).toContain('if (env !== "live")');
    expect(billing).toContain("canonical: false");
  });

  it("only stamps a trial as converted from live Stripe state", () => {
    const index = billing.indexOf('if (env !== "live")');
    expect(index).toBeGreaterThan(-1);
    expect(billing.indexOf("platform_trials")).toBeGreaterThan(index);
  });

  it("only unlocks the paid setup from a live checkout session", () => {
    expect(webhook).toContain('if (env === "live")');
    expect(webhook).toContain("setup_paid_at");
  });

  it("identifies a payment by workspace, provider and environment", () => {
    expect(billing).toContain('.eq("payment_provider", "stripe")');
    expect(billing).toContain('.eq("environment", input.environment)');
  });

  it("grants production entitlement from the stored payment environment only", () => {
    expect(payments).toContain("payment.environment");
  });
});

describe("refunds use the environment of the original payment", () => {
  const source = read("./payments.functions.ts");

  it("never takes the Stripe environment from the caller", () => {
    expect(source).toContain('payment.environment === "live" ? "live" : "sandbox"');
  });
});

describe("reporting reads are complete, not capped", () => {
  const files = [
    "./platform-funnel.functions.ts",
    "./admin.functions.ts",
    "./traffic.functions.ts",
    "./site-engine.hooks.ts",
    "./payments.hooks.ts",
  ];

  it("has no arbitrary row ceilings left in reporting queries", () => {
    for (const file of files) {
      const source = read(file);
      expect(source).not.toContain(".limit(20000)");
      expect(source).not.toContain(".limit(200)");
      expect(source).toContain("fetchAllRows");
    }
  });

  it("keeps paging until the data ends", async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => ({ i }));
    const result = await fetchAllRows<{ i: number }>(
      (from, to) => ({ data: rows.slice(from, to + 1), error: null }),
      1000,
    );
    expect(result.rows).toHaveLength(2500);
    expect(result.pages).toBe(3);
  });

  it("reports a failure instead of returning partial numbers silently", async () => {
    const result = await fetchAllRows<{ i: number }>(() => ({
      data: null,
      error: { message: "boom" },
    }));
    expect(result.error?.message).toBe("boom");
    expect(result.rows).toHaveLength(0);
  });
});

describe("paid customers are counted from live Stripe state only", () => {
  const funnel = read("./platform-funnel.functions.ts");

  it("filters subscriptions and payments to live Stripe", () => {
    expect(funnel).toContain('.eq("environment", "live")');
    expect(funnel).toContain('.eq("payment_provider", "stripe")');
  });

  it("excludes demo workspaces", () => {
    expect(funnel).toContain("is_demo");
  });
});

describe("public page views are counted once", () => {
  it("does not re-track a page view inside a public page component", () => {
    expect(read("../routes/share.tsx")).not.toContain('trackConversion("page_view"');
  });
});
