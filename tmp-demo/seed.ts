import { createClient } from "@supabase/supabase-js";
import { safeLinkUrl } from "../src/lib/website-content";
const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const org = "11111111-1111-4111-8111-111111111111";
const bp = JSON.parse(await Bun.file("/tmp/demo/bp.json").text());
const del = await db.from("website_pages").delete().eq("organization_id", org);
if (del.error) throw del.error;
let sections = 0,
  comps = 0;
for (const [pi, page] of bp.entries()) {
  const { data: p, error } = await db
    .from("website_pages")
    .insert({
      organization_id: org,
      slug: page.slug,
      title: page.title,
      kind: page.kind,
      sort_order: pi,
      seo_title: page.seo_title ?? null,
      seo_description: page.seo_description ?? null,
      noindex: page.noindex ?? false,
    })
    .select("id")
    .single();
  if (error) throw error;
  for (const [si, s] of page.sections.entries()) {
    const { data: sec, error: se } = await db
      .from("website_sections")
      .insert({
        organization_id: org,
        page_id: p!.id,
        kind: s.kind,
        variant: s.variant ?? "default",
        heading: s.heading ?? null,
        subheading: s.subheading ?? null,
        body: s.body ?? null,
        is_visible: s.is_visible ?? true,
        settings: s.needs_input ? { needs_input: true } : {},
        sort_order: si,
      })
      .select("id")
      .single();
    if (se) throw se;
    sections++;
    const cs = (s.components ?? []).map((c: any, ci: number) => ({
      organization_id: org,
      section_id: sec!.id,
      kind: c.kind,
      label: c.label ?? null,
      body: c.body ?? null,
      link_url: safeLinkUrl(c.link_url),
      link_label: c.link_label ?? null,
      sort_order: ci,
    }));
    if (cs.length) {
      const { error: ce } = await db.from("website_components").insert(cs);
      if (ce) throw ce;
      comps += cs.length;
    }
  }
}
console.log(JSON.stringify({ pages: bp.length, sections, comps }));
