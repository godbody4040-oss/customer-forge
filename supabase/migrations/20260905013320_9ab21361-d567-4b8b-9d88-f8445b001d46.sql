-- 1. Authoritative account records -------------------------------------------
create table if not exists public.platform_accounts (
  user_id uuid primary key,
  created_at timestamptz not null default now(),
  first_landing_path text,
  first_referrer text,
  first_utm_source text,
  first_utm_campaign text
);

grant all on public.platform_accounts to service_role;
alter table public.platform_accounts enable row level security;
-- No anon/authenticated grants or policies on purpose: platform-wide analytics
-- is readable only through super-admin server functions (service role).

create index if not exists platform_accounts_created_at_idx
  on public.platform_accounts (created_at desc);

-- 2. Authoritative trial records ---------------------------------------------
create table if not exists public.platform_trials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null default 'free_access',
  started_by uuid,
  started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index if not exists platform_trials_org_kind_key
  on public.platform_trials (organization_id, kind);
create index if not exists platform_trials_ends_at_idx
  on public.platform_trials (trial_ends_at);

grant all on public.platform_trials to service_role;
alter table public.platform_trials enable row level security;

-- 3. Backfill from records that already exist (nothing fabricated) -----------
insert into public.platform_accounts (user_id, created_at)
select u.id, u.created_at from auth.users u
on conflict (user_id) do nothing;

insert into public.platform_trials (organization_id, kind, started_by, started_at, trial_ends_at)
select o.id, 'free_access', o.created_by, o.created_at, o.trial_ends_at
from public.organizations o
where o.trial_ends_at is not null
on conflict (organization_id, kind) do nothing;

-- 4. Indexes used by the funnel queries --------------------------------------
create index if not exists organizations_subscription_status_idx
  on public.organizations (subscription_status);
create index if not exists organizations_trial_ends_at_idx
  on public.organizations (trial_ends_at);
create index if not exists organizations_created_at_idx
  on public.organizations (created_at desc);
create index if not exists subscriptions_status_idx
  on public.subscriptions (status);
create index if not exists subscriptions_provider_customer_idx
  on public.subscriptions (provider_customer_id);
create index if not exists memberships_user_idx
  on public.memberships (user_id);

-- 5. Idempotent, atomic workspace provisioning -------------------------------
create or replace function public.provision_workspace(
  _name text,
  _industry text default null,
  _profile jsonb default '{}'::jsonb,
  _trial_days integer default 3
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_slug text;
  v_base text;
  v_ends timestamptz;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- One workspace per person: never create a second one.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 7));

  select m.organization_id into v_org
  from public.memberships m
  where m.user_id = v_user
  order by m.created_at
  limit 1;

  if v_org is null then
    v_base := nullif(regexp_replace(lower(coalesce(_name, 'workspace')), '[^a-z0-9]+', '-', 'g'), '');
    v_base := btrim(coalesce(v_base, 'workspace'), '-');
    if v_base = '' then v_base := 'workspace'; end if;
    v_base := left(v_base, 40);
    v_slug := v_base;
    while exists (select 1 from public.organizations where slug = v_slug) loop
      v_slug := v_base || '-' || floor(random() * 9000 + 1000)::int;
    end loop;

    v_ends := now() + make_interval(days => greatest(1, least(90, coalesce(_trial_days, 3))));

    insert into public.organizations (name, slug, industry, created_by, subscription_status, trial_ends_at)
    values (
      coalesce(nullif(btrim(coalesce(_name, '')), ''), 'My business'),
      v_slug,
      nullif(btrim(coalesce(_industry, '')), ''),
      v_user,
      'trialing',
      v_ends
    )
    returning id into v_org;

    insert into public.memberships (organization_id, user_id, role)
    values (v_org, v_user, 'owner')
    on conflict do nothing;

    insert into public.business_profiles (organization_id, email, phone, city, state, website, description)
    values (
      v_org,
      nullif(btrim(coalesce(_profile->>'email','')), ''),
      nullif(btrim(coalesce(_profile->>'phone','')), ''),
      nullif(btrim(coalesce(_profile->>'city','')), ''),
      nullif(btrim(coalesce(_profile->>'state','')), ''),
      nullif(btrim(coalesce(_profile->>'website','')), ''),
      nullif(btrim(coalesce(_profile->>'description','')), '')
    )
    on conflict (organization_id) do nothing;

    insert into public.platform_trials (organization_id, kind, started_by, started_at, trial_ends_at)
    values (v_org, 'free_access', v_user, now(), v_ends)
    on conflict (organization_id, kind) do nothing;
  else
    -- Recover partially provisioned workspaces without creating duplicates.
    insert into public.memberships (organization_id, user_id, role)
    values (v_org, v_user, 'owner')
    on conflict do nothing;

    insert into public.business_profiles (organization_id)
    values (v_org)
    on conflict (organization_id) do nothing;

    insert into public.platform_trials (organization_id, kind, started_by, started_at, trial_ends_at)
    select v_org, 'free_access', v_user, o.created_at, o.trial_ends_at
    from public.organizations o
    where o.id = v_org and o.trial_ends_at is not null
    on conflict (organization_id, kind) do nothing;
  end if;

  return v_org;
end;
$$;

revoke all on function public.provision_workspace(text, text, jsonb, integer) from public;
grant execute on function public.provision_workspace(text, text, jsonb, integer) to authenticated;
grant execute on function public.provision_workspace(text, text, jsonb, integer) to service_role;