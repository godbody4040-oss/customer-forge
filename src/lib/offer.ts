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
  ctaPrimary: "GET STARTED — $1,500 SETUP",
  ctaSecondary:
    "First month free, then $250/month. No confusing packages. One complete growth system.",
  ctaShort: "START MY REVORA SYSTEM",
  explainer:
    "The $1,500 setup fee covers the initial build, customization, configuration, and launch of your Revora Growth System. Your first month is free — the $250/month for ongoing platform access, automation, support, maintenance, and growth services starts one month after signup.",
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
