/**
 * A dropped webhook is a lost payment, so the claim classifier must never
 * mistake a database outage for a duplicate delivery.
 */
import { describe, expect, it } from "vitest";
import { classifyClaimError, organizationIdFromStripeObject } from "@/lib/webhook-claim";

describe("classifyClaimError", () => {
  it("treats a unique violation as a duplicate", () => {
    expect(classifyClaimError({ code: "23505", message: "duplicate key value" })).toBe("duplicate");
    expect(
      classifyClaimError({ code: null, message: "duplicate key value violates unique constraint" }),
    ).toBe("duplicate");
  });

  it("treats outages, timeouts and permission errors as retryable", () => {
    for (const error of [
      { code: "57014", message: "canceling statement due to statement timeout" },
      { code: "08006", message: "connection failure" },
      { code: "42501", message: "permission denied for table payment_events" },
      { code: null, message: "fetch failed" },
      { code: "XX000", message: "internal error" },
    ]) {
      expect(classifyClaimError(error)).toBe("transient");
    }
  });
});

describe("organizationIdFromStripeObject", () => {
  it("reads the tenant from every supported metadata location", () => {
    expect(organizationIdFromStripeObject({ metadata: { organizationId: "a" } })).toBe("a");
    expect(
      organizationIdFromStripeObject({
        subscription_details: { metadata: { organizationId: "b" } },
      }),
    ).toBe("b");
    expect(
      organizationIdFromStripeObject({ lines: { data: [{ metadata: { organizationId: "c" } }] } }),
    ).toBe("c");
    expect(
      organizationIdFromStripeObject({ customer: { metadata: { organizationId: "d" } } }),
    ).toBe("d");
  });

  it("returns null when no tenant is present", () => {
    expect(organizationIdFromStripeObject({})).toBeNull();
    expect(organizationIdFromStripeObject(null)).toBeNull();
  });
});
