-- The platform owner is the only administrator. Remove anyone else, then grant.
alter table public.user_roles disable trigger guard_platform_role_writes;

delete from public.user_roles
where role = 'super_admin'
  and user_id <> (select id from auth.users where lower(email) = 'revorabusiness0@gmail.com');

insert into public.user_roles (user_id, role)
select id, 'super_admin'::public.platform_role
from auth.users
where lower(email) = 'revorabusiness0@gmail.com'
on conflict (user_id, role) do nothing;

alter table public.user_roles enable trigger guard_platform_role_writes;