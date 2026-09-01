-- 1. Reserved names a client may never claim as a Revora address.
create or replace function public.revora_reserved_subdomains()
returns text[]
language sql
immutable
set search_path = public
as $$
  select array[
    'www','app','apps','api','admin','administrator','auth','login','logout','signup','signin',
    'mail','email','smtp','imap','pop','webmail','mx','ns','ns1','ns2','dns','cdn','assets',
    'static','media','files','img','images','s','p','preview','staging','stage','test','dev',
    'demo','docs','doc','help','support','status','blog','news','shop','store','pay','payments',
    'billing','checkout','stripe','dashboard','portal','account','accounts','settings','security',
    'revora','revoragrowthsystems','growth','system','root','host','server','vpn','ftp','git',
    'internal','private','public','sitemap','robots','well-known','onboarding','invite','客'
  ]::text[];
$$;

-- 2. Normalise what already exists, then fill the gaps from the business slug.
update public.website_settings
   set subdomain = lower(trim(subdomain))
 where subdomain is not null and subdomain <> lower(trim(subdomain));

with candidates as (
  select ws.id,
         regexp_replace(
           regexp_replace(lower(coalesce(o.slug, 'client')), '[^a-z0-9-]+', '-', 'g'),
           '(^-+|-+$)', '', 'g'
         ) as base,
         row_number() over (
           partition by regexp_replace(
             regexp_replace(lower(coalesce(o.slug, 'client')), '[^a-z0-9-]+', '-', 'g'),
             '(^-+|-+$)', '', 'g') order by ws.created_at
         ) as n
    from public.website_settings ws
    join public.organizations o on o.id = ws.organization_id
   where ws.subdomain is null or ws.subdomain = ''
)
update public.website_settings ws
   set subdomain = case
         when c.base = '' or c.base = any(public.revora_reserved_subdomains())
           then 'client-' || left(replace(ws.organization_id::text, '-', ''), 8)
         when c.n = 1 then c.base
         else c.base || '-' || c.n::text
       end
  from candidates c
 where c.id = ws.id;

-- Break any pre-existing duplicates so the unique index can be created.
with dupes as (
  select id, subdomain,
         row_number() over (partition by subdomain order by created_at) as n
    from public.website_settings
   where subdomain is not null
)
update public.website_settings ws
   set subdomain = ws.subdomain || '-' || d.n::text
  from dupes d
 where d.id = ws.id and d.n > 1;

-- 3. Shape + uniqueness + reserved-name guards.
alter table public.website_settings
  drop constraint if exists website_settings_subdomain_format;
alter table public.website_settings
  add constraint website_settings_subdomain_format
  check (
    subdomain is null
    or (subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' and subdomain !~ '--')
  );

alter table public.website_settings
  drop constraint if exists website_settings_subdomain_not_reserved;
alter table public.website_settings
  add constraint website_settings_subdomain_not_reserved
  check (subdomain is null or not (subdomain = any(public.revora_reserved_subdomains())));

drop index if exists website_settings_subdomain_key;
create unique index if not exists website_settings_subdomain_key
  on public.website_settings (subdomain)
  where subdomain is not null;

-- 4. Every new website automatically gets a free address that is unique.
create or replace function public.website_settings_assign_subdomain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  n int := 1;
begin
  if new.subdomain is not null then
    new.subdomain := lower(trim(new.subdomain));
  end if;

  if new.subdomain is null or new.subdomain = '' then
    select regexp_replace(
             regexp_replace(lower(coalesce(o.slug, 'client')), '[^a-z0-9-]+', '-', 'g'),
             '(^-+|-+$)', '', 'g')
      into base
      from public.organizations o
     where o.id = new.organization_id;

    base := left(coalesce(nullif(base, ''), 'client'), 48);
    if base = any(public.revora_reserved_subdomains()) then
      base := base || '-site';
    end if;

    candidate := base;
    while exists (
      select 1 from public.website_settings
       where subdomain = candidate
         and (new.id is null or id <> new.id)
    ) loop
      n := n + 1;
      candidate := base || '-' || n::text;
    end loop;
    new.subdomain := candidate;
  end if;

  return new;
end;
$$;

drop trigger if exists website_settings_assign_subdomain on public.website_settings;
create trigger website_settings_assign_subdomain
  before insert or update of subdomain, organization_id on public.website_settings
  for each row execute function public.website_settings_assign_subdomain();