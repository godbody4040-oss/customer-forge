-- Public org read no longer depends on a security-definer helper
drop policy "orgs_public_read" on public.organizations;
create policy "orgs_public_read" on public.organizations for select to anon using (not is_suspended);
create policy "orgs_member_read" on public.organizations for select to authenticated using (not is_suspended or public.is_org_member(id));

-- Internal permission helpers must not be callable by anonymous visitors
revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.can_manage_org(uuid) from public, anon;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.can_manage_org(uuid) to authenticated;
grant execute on function public.is_super_admin() to authenticated;