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
