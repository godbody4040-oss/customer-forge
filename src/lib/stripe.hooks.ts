import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getBillingState } from "@/lib/stripe.functions";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";

/** Active Revora plans (public catalog). */
export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, monthly_price, annual_price, tagline, features, is_featured, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((plan) => ({
        ...plan,
        monthly_price: Number(plan.monthly_price),
        annual_price: Number(plan.annual_price),
      }));
    },
  });
}

/** Verified subscription state + entitlements for a workspace. */
export function useBillingState(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["billing_state", organizationId],
    enabled: !!organizationId && isPaymentsConfigured(),
    queryFn: () =>
      getBillingState({
        data: { organizationId: organizationId!, environment: getStripeEnvironment() },
      }),
  });
}
