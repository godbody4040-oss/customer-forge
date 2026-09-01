revoke all on function public.website_settings_assign_subdomain() from public, anon, authenticated;
revoke all on function public.revora_reserved_subdomains() from public, anon;
grant execute on function public.revora_reserved_subdomains() to authenticated, service_role;