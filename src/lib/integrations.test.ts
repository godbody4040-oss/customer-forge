import { describe, expect, it } from "vitest";
import { buildIntegrationCards, integrationSummary, type IntegrationFacts } from "./integrations";

const base: IntegrationFacts = {
  setupPaymentStatus: "paid",
  subscriptionStatus: "trialing",
  leadAlertsEmail: "owner@example.com",
  leadAlertsEnabled: true,
  lastLeadAlertAt: null,
  customDomain: "example.com",
  domainVerified: true,
  dnsOk: true,
  sslOk: true,
  domainError: null,
  published: true,
  lastPublishedAt: "2026-01-01T00:00:00.000Z",
  seoIndexable: true,
  activeAutomations: 2,
  automationFailures: 0,
  aiGenerationsLast30: 3,
  unavailable: [],
};

describe("integration center", () => {
  it("reports everything connected when the facts say so", () => {
    const cards = buildIntegrationCards(base);
    expect(cards.every((card) => card.status === "connected")).toBe(true);
    expect(integrationSummary(cards).connected).toBe(cards.length);
  });

  it("never claims a domain is live before DNS and HTTPS pass", () => {
    const cards = buildIntegrationCards({ ...base, sslOk: false });
    const domain = cards.find((card) => card.key === "domain")!;
    expect(domain.status).toBe("action_needed");
    expect(domain.action?.to).toBe("/app/domain");
  });

  it("flags unpaid setup and inactive subscriptions", () => {
    const cards = buildIntegrationCards({
      ...base,
      setupPaymentStatus: "unpaid",
      subscriptionStatus: "canceled",
    });
    expect(cards.find((card) => card.key === "payments")!.status).toBe("not_connected");
  });

  it("says a source couldn't be checked instead of guessing", () => {
    const cards = buildIntegrationCards({ ...base, unavailable: ["billing", "website"] });
    expect(cards.find((card) => card.key === "payments")!.status).toBe("unknown");
    expect(cards.find((card) => card.key === "domain")!.status).toBe("unknown");
  });

  it("warns about failed automation deliveries and missing alert emails", () => {
    const failing = buildIntegrationCards({ ...base, automationFailures: 2 });
    expect(failing.find((card) => card.key === "automations")!.detail).toContain("failed");
    const noEmail = buildIntegrationCards({ ...base, leadAlertsEmail: null, leadAlertsEnabled: false });
    expect(noEmail.find((card) => card.key === "lead_alerts")!.status).toBe("not_connected");
  });
});
