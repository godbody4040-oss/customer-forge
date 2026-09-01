/**
 * Regenerating or restoring content must never silently take a live website
 * offline. A site that is already published stays published; anything else
 * stays in preview until the owner presses Launch.
 */
type StateReader = {
  from: (table: "website_settings") => {
    select: (columns: string) => {
      eq: (
        column: "organization_id",
        value: string,
      ) => { maybeSingle: () => Promise<{ data: { publish_state?: string | null } | null }> };
    };
  };
};

export async function nextPublishState(
  client: unknown,
  organizationId: string,
): Promise<"published" | "preview"> {
  const reader = client as StateReader;
  const { data } = await reader
    .from("website_settings")
    .select("publish_state")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data?.publish_state === "published" ? "published" : "preview";
}
