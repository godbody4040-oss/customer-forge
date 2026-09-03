/**
 * ONE place that decides whether the signed-in person may perform a sensitive
 * action inside a workspace.
 *
 * Authentication alone is never sufficient: a bearer token proves who someone
 * is, not which workspace they belong to or what they are allowed to do there.
 * Every mutating server function that accepts an `organizationId` from the
 * browser runs it through here first, so a changed id in a request body can
 * never reach another organization's data (IDOR), and a viewer can never
 * perform an owner's action.
 *
 * Roles, strongest first: owner > admin > manager > staff > viewer.
 * The same ladder is enforced in the database (see `private.org_role_at_least`),
 * so this check is a clear error message rather than the only line of defence.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type OrgRole = Database["public"]["Enums"]["app_role"];

const LEVEL: Record<string, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  staff: 1,
  viewer: 0,
};

export type MinRole = "owner" | "admin" | "manager" | "staff" | "viewer";

/** Deliberately vague: never reveal whether a workspace id exists. */
const DENIED = "You don't have permission to do that in this workspace.";

export function roleAtLeast(role: string | null | undefined, min: MinRole) {
  return (LEVEL[String(role ?? "")] ?? -1) >= (LEVEL[min] ?? 0);
}

/**
 * Resolves the caller's role in a workspace using their OWN credentials, so row
 * level security applies to the lookup too. Returns null when they are not a
 * member — including when the workspace does not exist.
 */
export async function orgRole(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
): Promise<OrgRole | null> {
  const org = String(organizationId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(org)) return null;
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("organization_id", org)
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as OrgRole | undefined) ?? null;
}

/**
 * Throws a safe, non-revealing error unless the caller holds at least `min` in
 * that workspace. Returns the verified organization id so callers use the
 * validated value rather than the raw request field.
 */
export async function requireOrgRole(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  min: MinRole,
): Promise<string> {
  const role = await orgRole(supabase, organizationId, userId);
  if (!role || !roleAtLeast(role, min)) throw new Error(DENIED);
  return String(organizationId).trim();
}
