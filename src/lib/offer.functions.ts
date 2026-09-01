import { createServerFn } from "@tanstack/react-start";
import { GROWTH_SYSTEM } from "@/lib/offer";

export type PublicOfferRates = {
  setupPrice: number;
  monthlyPrice: number;
  trialDays: number;
  fullAccessDays: number;
};

/**
 * The live offer rates the platform actually charges. Checkout validates
 * against the same `offer_config` row, so public marketing copy, the admin
 * pricing page and Stripe can never drift apart. Falls back to the canonical
 * constants when the row is missing or unreadable.
 */
export const getPublicOfferRates = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicOfferRates> => {
    const fallback: PublicOfferRates = {
      setupPrice: GROWTH_SYSTEM.setupPrice,
      monthlyPrice: GROWTH_SYSTEM.monthlyPrice,
      trialDays: GROWTH_SYSTEM.trialDays,
      fullAccessDays: GROWTH_SYSTEM.fullAccessTrialDays,
    };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("offer_config")
        .select("setup_price, monthly_price, trial_days, full_access_days")
        .eq("id", "growth_system")
        .maybeSingle();
      if (!data) return fallback;

      const num = (value: unknown, fb: number) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fb;
      };

      return {
        setupPrice: num(data.setup_price, fallback.setupPrice),
        monthlyPrice: num(data.monthly_price, fallback.monthlyPrice),
        trialDays: num(data.trial_days, fallback.trialDays),
        fullAccessDays: num(data.full_access_days, fallback.fullAccessDays),
      };
    } catch {
      return fallback;
    }
  },
);
