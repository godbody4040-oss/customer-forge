create or replace function public.org_team_members(_organization_id uuid)
returns table (id uuid, role text, created_at timestamptz, user_id uuid, full_name text, email text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.role::text, m.created_at, m.user_id, p.full_name, p.email, p.avatar_url
  from public.memberships m
  left join public.profiles p on p.id = m.user_id
  where m.organization_id = _organization_id
    and exists (
      select 1 from public.memberships me
      where me.organization_id = _organization_id and me.user_id = auth.uid()
    )
  order by m.created_at
$$;

revoke all on function public.org_team_members(uuid) from public, anon;
grant execute on function public.org_team_members(uuid) to authenticated;
grant execute on function public.org_team_members(uuid) to service_role;