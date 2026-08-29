
drop function if exists public.org_has_entitlement(uuid, text);

create or replace function private.org_has_entitlement(_organization_id uuid, _feature_key text)
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

revoke all on function private.org_has_entitlement(uuid, text) from public, anon, authenticated;
