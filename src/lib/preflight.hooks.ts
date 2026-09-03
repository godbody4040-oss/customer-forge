/**
 * Real workspace facts Pre-Flight needs that aren't already loaded by the
 * builder: how many questions the quote calculator asks, whether anyone is
 * notified about a new enquiry, and how many follow-up automations are running.
 *
 * Every value is read from the database. When a value can't be read it stays
 * `null` and Pre-Flight skips that check rather than reporting a guess.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PreflightFacts = {
  quoteQuestionCount: number | null;
  notifiesOwner: boolean;
  followUpAutomations: number;
  hasHours: boolean;
};

export function usePreflightFacts(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["preflight_facts", organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<PreflightFacts> => {
      const orgId = organizationId!;
      const [forms, profile, automations] = await Promise.all([
        supabase
          .from("quote_forms")
          .select("id, quote_questions!quote_questions_form_id_fkey(id)")
          .eq("organization_id", orgId)
          .eq("is_active", true),
        supabase
          .from("business_profiles")
          .select("notification_email, email, owner_email, notify_on_lead, hours")
          .eq("organization_id", orgId)
          .maybeSingle(),
        supabase
          .from("automations")
          .select("id")
          .eq("organization_id", orgId)
          .eq("is_active", true),
      ]);

      const questionCount = forms.error
        ? null
        : (forms.data ?? []).reduce(
            (sum, form) =>
              sum + ((form as { quote_questions?: unknown[] }).quote_questions ?? []).length,
            0,
          );

      const p = (profile.data ?? null) as Record<string, unknown> | null;
      const alertTarget = ["notification_email", "owner_email", "email"].some(
        (key) => typeof p?.[key] === "string" && String(p[key]).trim().length > 0,
      );
      const hours = p?.["hours"];

      return {
        quoteQuestionCount: questionCount,
        notifiesOwner: alertTarget && p?.["notify_on_lead"] !== false,
        followUpAutomations: (automations.data ?? []).length,
        hasHours: !!hours && typeof hours === "object" && Object.keys(hours).length > 0,
      };
    },
  });
}
