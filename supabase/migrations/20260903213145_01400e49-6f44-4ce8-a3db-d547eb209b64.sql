-- 1. Tenant ownership immutability on the remaining organization-owned tables.
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers','notifications','campaigns','automations','automation_steps','automation_runs',
    'business_profiles','social_profiles','generation_jobs','lead_activities','quote_requests',
    'website_versions','website_preview_links','website_requests','data_backups','error_events',
    'ai_generations'
  ]
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'organization_id'
    ) then
      execute format('drop trigger if exists %I on public.%I', t || '_freeze_org', t);
      execute format(
        'create trigger %I before update on public.%I for each row execute function private.freeze_organization_id()',
        t || '_freeze_org', t
      );
    end if;
  end loop;
end $$;

-- 2. Public website rendering boundary: only render-relevant columns, and only
-- for published, active sites. Runs as owner (security_invoker off) so the
-- underlying table needs no anonymous policy at all.
create or replace view public.public_website_settings
with (security_invoker = false) as
  select
    ws.id,
    ws.organization_id,
    ws.template,
    ws.pages,
    ws.seo,
    ws.subdomain,
    ws.custom_domain,
    ws.published,
    ws.publish_state,
    ws.last_published_at,
    ws.generation,
    ws.created_at,
    ws.updated_at
  from public.website_settings ws
  where ws.published
    and ws.publish_state = 'published'
    and private.org_site_published(ws.organization_id);

revoke all on public.public_website_settings from anon, authenticated;
grant select on public.public_website_settings to anon, authenticated;
grant all on public.public_website_settings to service_role;

-- 3. Remove the blanket anonymous read of the operational settings table.
drop policy if exists ws_public_read on public.website_settings;
revoke all on public.website_settings from anon;