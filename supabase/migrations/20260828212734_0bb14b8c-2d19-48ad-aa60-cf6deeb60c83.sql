-- Use invoker views + column-level grants so anon can only see public columns.
drop view if exists public.public_organizations;
drop view if exists public.public_business_profiles;
drop view if exists public.public_reviews;

create view public.public_organizations
with (security_invoker = true) as
select id, name, slug, industry, is_demo
from public.organizations
where not is_suspended;

create view public.public_business_profiles
with (security_invoker = true) as
select
  id, organization_id, tagline, description, phone, email, website,
  address, city, state, zip, service_area, hours, logo_url, hero_image_url,
  primary_color, secondary_color, accent_color, font_preference, review_link
from public.business_profiles;

create view public.public_reviews
with (security_invoker = true) as
select id, organization_id, author_name, rating, comment, created_at
from public.reviews
where is_published;

grant select on public.public_organizations to anon, authenticated;
grant select on public.public_business_profiles to anon, authenticated;
grant select on public.public_reviews to anon, authenticated;

-- Restore anon row policies, but narrow anon privileges to public columns only.
create policy "orgs_public_read" on public.organizations
  for select to anon using (not is_suspended);
create policy "bp_public_read" on public.business_profiles
  for select to anon using (true);
create policy "reviews_public_read" on public.reviews
  for select to anon using (is_published);

revoke select on public.organizations from anon;
revoke select on public.business_profiles from anon;
revoke select on public.reviews from anon;

grant select (id, name, slug, industry, is_demo) on public.organizations to anon;
grant select (
  id, organization_id, tagline, description, phone, email, website,
  address, city, state, zip, service_area, hours, logo_url, hero_image_url,
  primary_color, secondary_color, accent_color, font_preference, review_link
) on public.business_profiles to anon;
grant select (id, organization_id, author_name, rating, comment, created_at) on public.reviews to anon;