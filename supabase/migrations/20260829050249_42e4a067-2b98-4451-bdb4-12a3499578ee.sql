
alter table public.subscriptions
  add column if not exists payment_provider text not null default 'stripe',
  add column if not exists price_id text,
  add column if not exists environment text not null default 'sandbox',
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists current_period_start timestamptz;

alter table public.plans
  add column if not exists stripe_monthly_price_id text,
  add column if not exists stripe_annual_price_id text;

update public.plans set stripe_monthly_price_id = 'revora_starter_monthly', stripe_annual_price_id = 'revora_starter_yearly' where id = 'starter';
update public.plans set stripe_monthly_price_id = 'revora_growth_monthly', stripe_annual_price_id = 'revora_growth_yearly' where id = 'growth';
update public.plans set stripe_monthly_price_id = 'revora_pro_monthly', stripe_annual_price_id = 'revora_pro_yearly' where id = 'pro';

create table if not exists public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references public.plans(id) on delete cascade,
  feature_key text not null,
  limit_value integer,
  created_at timestamptz not null default now(),
  unique (plan_id, feature_key)
);

grant select on public.plan_entitlements to authenticated;
grant all on public.plan_entitlements to service_role;
alter table public.plan_entitlements enable row level security;

create policy plan_entitlements_read on public.plan_entitlements
  for select to authenticated using (true);
create policy plan_entitlements_admin on public.plan_entitlements
  for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());

insert into public.plan_entitlements (plan_id, feature_key, limit_value) values
  ('starter','website',1),
  ('starter','quotes',null),
  ('starter','bookings',null),
  ('starter','crm',null),
  ('starter','team_seats',2),
  ('starter','workspaces',1),
  ('growth','website',1),
  ('growth','quotes',null),
  ('growth','bookings',null),
  ('growth','crm',null),
  ('growth','automations',null),
  ('growth','reviews',null),
  ('growth','campaigns',null),
  ('growth','team_seats',5),
  ('growth','workspaces',1),
  ('pro','website',5),
  ('pro','quotes',null),
  ('pro','bookings',null),
  ('pro','crm',null),
  ('pro','automations',null),
  ('pro','reviews',null),
  ('pro','campaigns',null),
  ('pro','ai_site_agent',null),
  ('pro','custom_domain',null),
  ('pro','team_seats',25),
  ('pro','workspaces',5)
on conflict (plan_id, feature_key) do nothing;

create or replace function public.org_has_entitlement(_organization_id uuid, _feature_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    join public.plan_entitlements e on e.plan_id = s.plan_id
    where s.organization_id = _organization_id
      and e.feature_key = _feature_key
      and (
        s.status in ('trialing','active','past_due')
        or (s.status = 'canceled' and s.current_period_end > now())
      )
  )
$$;

revoke all on function public.org_has_entitlement(uuid, text) from public;
grant execute on function public.org_has_entitlement(uuid, text) to authenticated, service_role;
