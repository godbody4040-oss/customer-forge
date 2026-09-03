import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The operational website settings row holds internal state (domain transfer
 * progress, DNS records, certificate details, email forwarding, SEO reports,
 * monitoring timestamps). Anonymous visitors only ever need the handful of
 * columns used to render a published site, so both the query layer and the
 * database privileges keep the rest private.
 */
const OPERATIONAL_COLUMNS = [
  "domain_transfer",
  "domain_records",
  "domain_seo_report",
  "email_forwarding",
  "ssl_detail",
  "domain_error",
  "portal_code",
  "revora_host_ok",
];

function migrationSql() {
  const dir = "supabase/migrations";
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFileSync(`${dir}/${name}`, "utf8"))
    .join("\n");
}

describe("anonymous website settings exposure stays minimal", () => {
  const source = readFileSync("src/lib/public-site.server.ts", "utf8");

  /** Every `.select(...)` argument used on the website_settings table. */
  const settingsSelects = (() => {
    const selects: string[] = [];
    let cursor = source.indexOf('from("website_settings")');
    while (cursor !== -1) {
      const block = source.slice(cursor, cursor + 700);
      const match = block.match(/\.select\(([\s\S]*?)\)\s*\n/);
      if (match?.[1]) selects.push(match[1]);
      cursor = source.indexOf('from("website_settings")', cursor + 1);
    }
    return selects;
  })();

  it("never selects the whole settings row", () => {
    expect(settingsSelects.length).toBeGreaterThan(0);
    for (const select of settingsSelects) expect(select).not.toContain("*");
  });

  it.each(OPERATIONAL_COLUMNS)("does not read %s for public rendering", (column) => {
    for (const select of settingsSelects) expect(select).not.toContain(column);
  });


  it("restricts the anonymous grant to render columns only", () => {
    const sql = migrationSql();
    expect(sql).toContain("revoke all on public.website_settings from anon");
    expect(sql).toMatch(/grant select \(\s*\n?\s*id, organization_id, template/);
    for (const column of OPERATIONAL_COLUMNS) {
      expect(sql).not.toMatch(new RegExp(`grant select \\([^)]*${column}[^)]*\\) on public.website_settings`));
    }
  });
});

describe("tenant ownership cannot be reassigned", () => {
  const sql = migrationSql();

  const frozenTables = [
    "website_pages",
    "website_sections",
    "website_components",
    "website_settings",
    "leads",
    "appointments",
    "services",
    "media",
    "reviews",
    "quote_forms",
    "quote_questions",
    "quote_options",
    "quote_addons",
    "customers",
    "notifications",
    "campaigns",
    "automations",
    "automation_steps",
    "automation_runs",
    "business_profiles",
    "social_profiles",
    "generation_jobs",
    "lead_activities",
    "quote_requests",
    "website_versions",
    "website_preview_links",
    "website_requests",
    "data_backups",
    "error_events",
    "ai_generations",
  ];

  it("keeps the immutability guard raising on a changed organization", () => {
    expect(sql).toContain("ORGANIZATION_IMMUTABLE");
    expect(sql).toContain("NEW.organization_id IS DISTINCT FROM OLD.organization_id");
  });

  it.each(frozenTables)("covers %s with the freeze trigger", (table) => {
    const explicit = new RegExp(`create trigger ${table}_freeze_org`, "i");
    const looped = new RegExp(`'${table}'`);
    expect(explicit.test(sql) || looped.test(sql)).toBe(true);
  });
});
