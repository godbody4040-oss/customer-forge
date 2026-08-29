import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { GoogleListingCandidate, GoogleListingImport } from "@/lib/google-listing";

const uuid = (value: unknown) => {
  const id = String(value ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid workspace");
  return id;
};

/** Search Google's business listings so the owner can pick their own. */
export const searchGoogleListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => {
    const query = String(input?.query ?? "").trim().slice(0, 160);
    if (query.length < 3) throw new Error("Type at least three characters of your business name.");
    return { query };
  })
  .handler(async ({ data }): Promise<{ listings: GoogleListingCandidate[] }> => {
    const { searchListings } = await import("@/lib/google-listing.server");
    return { listings: await searchListings(data.query) };
  });

/**
 * Imports the selected Google listing into the workspace: real contact details,
 * address, opening hours, rating and review quotes, plus an AI first draft of
 * the tagline, description, service area and service list. Existing answers the
 * owner has already written are never overwritten.
 */
export const importGoogleListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; placeId: string }) => ({
    organizationId: uuid(input?.organizationId),
    placeId: String(input?.placeId ?? "").trim().slice(0, 200),
  }))
  .handler(async ({ data, context }): Promise<GoogleListingImport> => {
    const { supabase } = context;
    if (!data.placeId) throw new Error("Choose a listing first.");

    // RLS keeps this scoped to workspaces the caller belongs to.
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, industry")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (orgError) throw new Error(orgError.message);
    if (!org?.id) throw new Error("Workspace not found");

    const { fetchListingDetails, draftFromListing } = await import("@/lib/google-listing.server");
    const details = await fetchListingDetails(data.placeId);

    const { data: profile } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("organization_id", data.organizationId)
      .maybeSingle();

    const existing = (profile ?? {}) as Record<string, unknown>;
    const blank = (key: string) => {
      const value = existing[key];
      return !(typeof value === "string" && value.trim().length > 0);
    };

    const draft = await draftFromListing(details);
    const filled: string[] = [];
    const patch: Record<string, unknown> = { organization_id: data.organizationId };

    const set = (key: string, value: string | null | undefined, label: string) => {
      if (!value || !value.trim() || !blank(key)) return;
      patch[key] = value.trim();
      filled.push(label);
    };

    set("phone", details.phone, "Phone number");
    set("website", details.website, "Website address");
    set("address", details.address, "Address");
    set("city", details.city, "City");
    set("state", details.state, "State / region");
    set("zip", details.zip, "Postcode");
    set("review_link", details.mapsUri, "Google review link");
    set("tagline", draft?.tagline, "Tagline (AI draft)");
    set("description", draft?.description || details.summary, "Business description (AI draft)");
    set(
      "service_area",
      draft?.serviceArea || [details.city, details.county].filter(Boolean).join(", "),
      "Service area",
    );

    const currentHours = existing["hours"];
    const hasHours = !!currentHours && typeof currentHours === "object" && Object.keys(currentHours).length > 0;
    if (details.hoursLines.length && !hasHours) {
      patch["hours"] = { summary: details.hoursLines.join("\n"), source: "google" };
      filled.push("Opening hours");
    }

    const currentTestimonials = Array.isArray(existing["testimonials"]) ? (existing["testimonials"] as unknown[]) : [];
    const quotes = details.reviews
      .filter((review) => review.rating >= 4)
      .slice(0, 4)
      .map((review) => ({ name: review.name, text: review.text.slice(0, 600), source: "Google" }));
    let reviewsSaved = 0;
    if (quotes.length && currentTestimonials.length === 0) {
      patch["testimonials"] = quotes;
      reviewsSaved = quotes.length;
      filled.push(`${quotes.length} Google review quotes`);
    }

    if (Object.keys(patch).length > 1) {
      const { error } = await supabase
        .from("business_profiles")
        .upsert(patch as never, { onConflict: "organization_id" });
      if (error) throw new Error(error.message);
    }

    const orgPatch: Record<string, unknown> = {};
    if (details.name && (!org.name || /^my business$/i.test(org.name))) orgPatch["name"] = details.name.slice(0, 120);
    if (details.category && !org.industry) orgPatch["industry"] = details.category.slice(0, 80);
    if (Object.keys(orgPatch).length) {
      const { error } = await supabase.from("organizations").update(orgPatch as never).eq("id", data.organizationId);
      if (error) throw new Error(error.message);
      if (orgPatch["name"]) filled.push("Business name");
      if (orgPatch["industry"]) filled.push("Trade / category");
    }

    // Services are only drafted when the owner has none yet — never replaced.
    let servicesDrafted = 0;
    const { count: serviceCount } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", data.organizationId);
    if (!serviceCount && draft?.services.length) {
      const rows = draft.services.map((service, index) => ({
        organization_id: data.organizationId,
        name: service.name,
        description: service.description || null,
        sort_order: index,
      }));
      const { error } = await supabase.from("services").insert(rows as never);
      if (error) throw new Error(error.message);
      servicesDrafted = rows.length;
      filled.push(`${rows.length} service drafts`);
    }

    const stillNeeded = [
      details.phone ? null : "A phone number — your listing doesn't publish one.",
      "Prices or starting prices for each service.",
      "Photos of your work (five or more).",
      details.reviews.length ? null : "Review quotes — none were published on the listing.",
    ].filter((item): item is string => !!item);

    return {
      listing: {
        placeId: details.id,
        name: details.name,
        address: details.address,
        phone: details.phone,
        website: details.website,
        category: details.category,
        rating: details.rating,
        reviewCount: details.reviewCount,
        mapsUri: details.mapsUri,
      },
      filled,
      stillNeeded,
      reviewsSaved,
      servicesDrafted,
      aiWrote: !!draft,
    };
  });
