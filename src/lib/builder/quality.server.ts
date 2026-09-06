/**
 * Runs the website quality audit against the workspace's real rows.
 *
 * Nothing here writes: it reads the published pages, sections, business profile,
 * reviews and photos, normalises them through the presentation layer, and
 * returns the score plus the blockers that must be cleared before publishing.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { businessFacts } from "./facts";
import { auditWebsite, type QualityInput, type QualityReport } from "./quality";

type Db = SupabaseClient<never>;

/** Audits one workspace's website. Every count comes from a real table. */
export async function auditWorkspaceWebsite(db: Db, orgId: string): Promise<QualityReport> {
  const client = db as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: unknown) => Promise<{ data: unknown[] | null }> & {
          eq: (column: string, value: unknown) => Promise<{ data: unknown[] | null }>;
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
        };
      };
    };
  };

  const [profile, org, pages, sections, reviews, media, quoteForms, bookable] = await Promise.all([
    client.from("business_profiles").select("*").eq("organization_id", orgId).maybeSingle(),
    client.from("organizations").select("id, name").eq("id", orgId).maybeSingle(),
    client
      .from("website_pages")
      .select("id, slug, title, seo_title, seo_description, is_visible")
      .eq("organization_id", orgId),
    client
      .from("website_sections")
      .select("id, page_id, kind, heading, subheading, body, is_visible")
      .eq("organization_id", orgId),
    client.from("reviews").select("id").eq("organization_id", orgId).eq("is_published", true),
    client.from("media").select("id").eq("organization_id", orgId),
    client.from("quote_forms").select("id").eq("organization_id", orgId).eq("is_active", true),
    client.from("services").select("id").eq("organization_id", orgId).eq("bookable", true),
  ]);

  const profileRow = (profile.data ?? null) as Record<string, unknown> | null;
  const orgRow = (org.data ?? null) as Record<string, unknown> | null;
  const pageRows = ((pages.data ?? []) as Record<string, unknown>[]).filter(
    (page) => page["is_visible"] !== false,
  );
  const sectionRows = ((sections.data ?? []) as Record<string, unknown>[]).filter(
    (section) => section["is_visible"] !== false,
  );

  const facts = businessFacts(profileRow, orgRow?.["name"]);
  const reviewCount = (reviews.data ?? []).length;
  const galleryCount = (media.data ?? []).length;
  const hasQuote = (quoteForms.data ?? []).length > 0;
  const hasBooking = (bookable.data ?? []).length > 0;

  const input: QualityInput = {
    facts,
    raw: {
      phone: profileRow?.["phone"],
      email: profileRow?.["email"],
      hours: profileRow?.["hours"],
    },
    pages: pageRows.map((page) => ({
      slug: String(page["slug"] ?? ""),
      title: page["title"],
      sections: sectionRows.filter((section) => section["page_id"] === page["id"]).length,
    })),
    texts: sectionRows.flatMap((section) => [
      section["heading"],
      section["subheading"],
      section["body"],
    ]),
    navLabels: pageRows.map((page) => page["title"]),
    conversion: {
      hasPhone: !!facts.phone,
      hasBooking,
      hasQuote,
      hasContact: !!facts.email || sectionRows.some((s) => s["kind"] === "contact"),
    },
    reviewCount,
    galleryCount,
    showsReviews: sectionRows.some((section) => section["kind"] === "reviews"),
    showsGallery: sectionRows.some((section) => section["kind"] === "gallery"),
    metadata: pageRows.map((page) => ({
      title: page["seo_title"] ?? page["title"],
      description: page["seo_description"],
    })),
  };

  return auditWebsite(input);
}
