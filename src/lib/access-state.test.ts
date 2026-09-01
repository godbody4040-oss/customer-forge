import { describe, expect, it } from "vitest";
import { resolveAccess } from "@/lib/access-state";

const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();
const DAY = 86_400_000;

describe("resolveAccess", () => {
  it("gives a fresh workspace full trial access", () => {
    const result = resolveAccess({ created_at: iso(-DAY), trial_ends_at: iso(2 * DAY) });
    expect(result.state).toBe("TRIAL");
    expect(result.allowed).toBe(true);
  });

  it("treats a paid setup as active access", () => {
    const result = resolveAccess({ created_at: iso(-30 * DAY), setup_payment_status: "paid" });
    expect(result.state).toBe("ACTIVE_SETUP");
    expect(result.allowed).toBe(true);
  });

  it("treats an active subscription as active access", () => {
    const result = resolveAccess({ created_at: iso(-60 * DAY), subscription_status: "active" });
    expect(result.state).toBe("ACTIVE_SUBSCRIPTION");
    expect(result.allowed).toBe(true);
  });

  it("keeps the builder open while a payment is past due", () => {
    const result = resolveAccess({ created_at: iso(-60 * DAY), subscription_status: "past_due" });
    expect(result.state).toBe("PAST_DUE");
    expect(result.allowed).toBe(true);
  });

  it("locks canceled and expired workspaces", () => {
    expect(resolveAccess({ created_at: iso(-60 * DAY), subscription_status: "canceled" })).toMatchObject({
      state: "CANCELED",
      allowed: false,
    });
    expect(resolveAccess({ created_at: iso(-60 * DAY) })).toMatchObject({ state: "EXPIRED", allowed: false });
  });

  it("locks suspended workspaces", () => {
    expect(resolveAccess({ created_at: iso(-DAY), is_suspended: true }).state).toBe("SUSPENDED");
  });

  it("never blames credits and always reports builder usage as included", () => {
    const rows = [
      { created_at: iso(-DAY) },
      { created_at: iso(-60 * DAY) },
      { created_at: iso(-60 * DAY), subscription_status: "canceled" },
      { created_at: iso(-60 * DAY), subscription_status: "past_due" },
      { created_at: iso(-DAY), is_suspended: true },
      { created_at: iso(-60 * DAY), setup_payment_status: "paid" },
    ];
    for (const row of rows) {
      const result = resolveAccess(row);
      expect(result.builderUsage).toBe("included");
      expect(result.reason.toLowerCase()).not.toMatch(
        /out of credits|buy credits|purchase credits|credits required|0 credits|credits remaining/,
      );

    }
  });
});
