import { safeLinkUrl } from "../src/lib/website-content";
import { randomUUID } from "crypto";
const bp = JSON.parse(await Bun.file("/tmp/demo/bp.json").text());
const org = "11111111-1111-4111-8111-111111111111";
const q = (v: unknown) => v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`;
const out: string[] = [`delete from website_pages where organization_id='${org}';`];
bp.forEach((page: any, pi: number) => {
  const pid = randomUUID();
  out.push(`insert into website_pages (id,organization_id,slug,title,kind,sort_order,seo_title,seo_description,noindex) values (${q(pid)},${q(org)},${q(page.slug)},${q(page.title)},${q(page.kind)},${pi},${q(page.seo_title ?? null)},${q(page.seo_description ?? null)},${page.noindex ? "true" : "false"});`);
  page.sections.forEach((s: any, si: number) => {
    const sid = randomUUID();
    const settings = s.needs_input ? `'{"needs_input":true}'::jsonb` : `'{}'::jsonb`;
    out.push(`insert into website_sections (id,organization_id,page_id,kind,variant,heading,subheading,body,is_visible,settings,sort_order) values (${q(sid)},${q(org)},${q(pid)},${q(s.kind)},${q(s.variant ?? "default")},${q(s.heading ?? null)},${q(s.subheading ?? null)},${q(s.body ?? null)},${s.is_visible === false ? "false" : "true"},${settings},${si});`);
    (s.components ?? []).forEach((c: any, ci: number) => {
      out.push(`insert into website_components (id,organization_id,section_id,kind,label,body,link_url,link_label,sort_order) values (${q(randomUUID())},${q(org)},${q(sid)},${q(c.kind)},${q(c.label ?? null)},${q(c.body ?? null)},${q(safeLinkUrl(c.link_url) ?? null)},${q(c.link_label ?? null)},${ci});`);
    });
  });
});
await Bun.write("/tmp/demo/site.sql", out.join("\n"));
console.log(out.length, "statements", (await Bun.file("/tmp/demo/site.sql").text()).length, "chars");
