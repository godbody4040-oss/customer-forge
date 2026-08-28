-- 1. Move tenant-isolation SECURITY DEFINER helpers out of the exposed API schema.
create schema if not exists private;
grant usage on schema private to authenticated, anon, service_role;

alter function public.is_org_member(uuid) set schema private;
alter function public.can_manage_org(uuid) set schema private;
alter function public.has_support_access(uuid) set schema private;
alter function public.is_super_admin() set schema private;

-- 2. Replace whole-row anonymous reads with column-limited public views.
drop policy if exists "orgs_public_read" on public.organizations;
drop policy if exists "bp_public_read" on public.business_profiles;
drop policy if exists "reviews_public_read" on public.reviews;

create or replace view public.public_organizations
with (security_invoker = false) as
select id, name, slug, industry, is_demo
from public.organizations
where not is_suspended;

create or replace view public.public_business_profiles
with (security_invoker = false) as
select
  id, organization_id, tagline, description, phone, email, website,
  address, city, state, zip, service_area, hours, logo_url, hero_image_url,
  primary_color, secondary_color, accent_color, font_preference, review_link
from public.business_profiles;

create or replace view public.public_reviews
with (security_invoker = false) as
select id, organization_id, author_name, rating, comment, created_at
from public.reviews
where is_published;

grant select on public.public_organizations to anon, authenticated;
grant select on public.public_business_profiles to anon, authenticated;
grant select on public.public_reviews to anon, authenticated;