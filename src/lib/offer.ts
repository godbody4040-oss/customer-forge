/**
 * Revora's single commercial offer. Every price shown or charged anywhere in
 * the application derives from this module — there is exactly one offer:
 * $1,500 one-time setup + $250/month.
 */
export const GROWTH_SYSTEM = {
  planId: "revora_growth_system",
  name: "Revora Growth System",
  setupProductId: "revora_growth_system_setup",
  setupPrice: 1500,
  monthlyPrice: 250,
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
  trialBadge: "30-DAY FREE PLATFORM TRIAL",
  ctaPrimary: "START MY REVORA SYSTEM — $1,500 SETUP",
  ctaSecondary:
    "$1,500 one-time setup + 30-day free platform trial + $250/month afterward. Cancel anytime. No hidden fees.",
  ctaShort: "START MY REVORA SYSTEM",
  /** The single secondary CTA label used site-wide. */
  ctaDemo: "SEE REVORA IN ACTION",

  /** The single canonical offer sentence. Use this verbatim wherever the offer is explained. */
  explainer:
    "$1,500 one-time setup. Your first 30 days of the $250/month platform fee are FREE. After the 30-day trial, your subscription automatically continues at $250/month unless canceled.",
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
