-- Views that bypass the caller's permissions are flagged as unsafe, so the
-- public boundary is enforced with column-level privileges instead: anonymous
-- visitors may read only the render columns, and only for published sites.
create or replace view public.public_website_settings
with (security_invoker = true) as
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

-- Column-level read grant: operational/domain columns stay invisible to anon.
revoke all on public.website_settings from anon;
grant select (
  id, organization_id, template, pages, seo, subdomain, custom_domain,
  published, publish_state, last_published_at, generation, created_at, updated_at
) on public.website_settings to anon;

drop policy if exists ws_public_read on public.website_settings;
create policy ws_public_read on public.website_settings
  for select to anon
  using (published and publish_state = 'published' and private.org_site_published(organization_id));