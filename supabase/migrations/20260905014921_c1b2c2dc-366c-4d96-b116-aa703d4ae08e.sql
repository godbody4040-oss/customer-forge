-- Platform admin membership is the highest privilege in the system. Nothing
-- reachable from the browser may create, alter or remove it.

revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

-- Restrictive policies: even if a permissive policy is added later by mistake,
-- these still block every write from browser-facing roles.
drop policy if exists user_roles_no_client_insert on public.user_roles;
drop policy if exists user_roles_no_client_update on public.user_roles;
drop policy if exists user_roles_no_client_delete on public.user_roles;

create policy user_roles_no_client_insert on public.user_roles
  as restrictive for insert to anon, authenticated with check (false);
create policy user_roles_no_client_update on public.user_roles
  as restrictive for update to anon, authenticated using (false) with check (false);
create policy user_roles_no_client_delete on public.user_roles
  as restrictive for delete to anon, authenticated using (false);

-- Final backstop at the table level: privilege escalation is refused for any
-- caller that is not the service role / database owner, regardless of grants,
-- policies or a SECURITY DEFINER function that forgot to check.
create or replace function public.guard_platform_role_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Platform admin access can only be changed by the platform owner';
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.guard_platform_role_writes() from public, anon, authenticated;

drop trigger if exists guard_platform_role_writes on public.user_roles;
create trigger guard_platform_role_writes
  before insert or update or delete on public.user_roles
  for each row execute function public.guard_platform_role_writes();