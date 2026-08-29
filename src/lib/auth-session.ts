/**
 * Client-side session helpers.
 *
 * Supabase persists the session in local storage and refreshes it silently, so
 * a returning client is signed in automatically. These helpers expose that
 * session to the UI and make sure every account has a saved profile row.
 */
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type SessionState = {
  loading: boolean;
  user: User | null;
};

/** Live session state for marketing/public surfaces (client-only). */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ loading: true, user: null });

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ loading: false, user: data.session?.user ?? null });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ loading: false, user: session?.user ?? null });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function displayName(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata as { full_name?: string; name?: string } | null;
  return meta?.full_name || meta?.name || user.email?.split("@")[0] || "Your account";
}

/**
 * Saves the signed-in client's details so they persist across sessions and
 * devices. Safe to call repeatedly — it upserts on the user id.
 */
export async function ensureProfile(user?: User | null): Promise<void> {
  const current = user ?? (await supabase.auth.getUser()).data.user;
  if (!current) return;
  const meta = current.user_metadata as
    | { full_name?: string; name?: string; avatar_url?: string; picture?: string }
    | null;
  await supabase.from("profiles").upsert(
    {
      id: current.id,
      email: current.email ?? null,
      full_name: meta?.full_name || meta?.name || null,
      avatar_url: meta?.avatar_url || meta?.picture || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}

/**
 * Resolves where a signed-in client belongs based on their tenant/workspace
 * access, so login always lands on the right dashboard:
 *  - no workspace yet -> onboarding
 *  - workspace with incomplete onboarding -> onboarding
 *  - workspace ready -> /app
 *  - platform staff with no client workspace -> /admin
 */
export async function resolvePostLoginPath(): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return "/auth";

  const [{ data: memberships }, { data: roles }] = await Promise.all([
    supabase
      .from("memberships")
      .select("organization_id, organizations(onboarding_completed)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const first = (memberships ?? []).find((m) => m.organizations);
  if (first?.organizations) {
    const org = first.organizations as { onboarding_completed: boolean | null };
    return org.onboarding_completed ? "/app" : "/onboarding";
  }

  const isSuperAdmin = (roles ?? []).some((r) => r.role === "super_admin");
  return isSuperAdmin ? "/admin" : "/onboarding";
}
