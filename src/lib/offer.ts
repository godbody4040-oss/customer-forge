/**
 * Revora's single commercial offer. Every price shown or charged anywhere in
 * the application derives from this module — there is exactly one offer:
 * $750 one-time setup + $100/month.
 */
export const GROWTH_SYSTEM = {
  planId: "revora_growth_system",
  name: "Revora Growth System",
  setupProductId: "revora_growth_system_setup",
  setupPrice: 750,
  monthlyPrice: 100,
  /** Stripe lookup keys (stable across test and live). */
  setupPriceKey: "revora_system_setup",
  monthlyPriceKey: "revora_system_monthly",
  headline: "Launch Your Revora Growth System",
  positioning:
    "A complete done-for-you customer acquisition and growth system for local businesses — built, launched and managed for you.",
  setupLabel: "One-time implementation and customization.",
  monthlyLabel:
    "Ongoing platform, automation, support, hosting/system management, and growth services.",
  /** Length of the free platform trial, in days. Mirrors the Stripe trial. */
  trialDays: 30,
  /** Length of the full-system free access window at signup, in days. */
  fullAccessTrialDays: 3,
  trialBadge: "FIRST MONTH FREE",
  ctaPrimary: "START MY REVORA SYSTEM — $750 SETUP",
  ctaSecondary:
    "$750 one-time setup + first month free + $100/month from month two. Cancel anytime. No hidden fees.",
  ctaShort: "START MY REVORA SYSTEM",
  /** The single secondary CTA label used site-wide. */
  ctaDemo: "SEE REVORA IN ACTION",

  /** The single canonical offer sentence. Use this verbatim wherever the offer is explained. */
  explainer:
    "$750 one-time setup, charged today. Your first month of the $100/month platform fee is FREE — your first monthly payment is charged 30 days later (month two) and continues at $100/month unless canceled.",
  setupIncludes: [
    "Custom website",
    "Domain setup",
    "CRM configuration",
    "Lead capture",
    "Quote system",
    "Booking system",
    "Automated follow-up",
    "Local SEO foundation",
    "Analytics setup",
    "System configuration",
    "Launch",
  ],
  monthlyIncludes: [
    "Platform access",
    "Hosting/system management",
    "Automation",
    "Maintenance",
    "Website updates",
    "Technical support",
    "Reporting",
    "Ongoing optimization",
  ],
  includes: [
    "Professional business website",
    "Custom domain connection/setup",
    "Lead capture system",
    "CRM",
    "Online booking",
    "Quote/request system",
    "Automated lead follow-up",
    "Customer notifications",
    "Review/reputation automation",
    "Local SEO foundation",
    "Analytics and reporting",
    "AI-powered business tools",
    "Ongoing website/system updates",
    "Technical support",
  ],
} as const;

export const usd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);

export const usdExact = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
