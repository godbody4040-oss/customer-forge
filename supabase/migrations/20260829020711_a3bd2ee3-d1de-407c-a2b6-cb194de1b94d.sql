alter table public.website_settings
  add column if not exists domain_primary_host text not null default 'root',
  add column if not exists domain_force_https boolean not null default true,
  add column if not exists ssl_issued_at timestamptz,
  add column if not exists ssl_checked_at timestamptz,
  add column if not exists ssl_last_ok_at timestamptz,
  add column if not exists ssl_detail text,
  add column if not exists domain_transfer jsonb not null default '{}'::jsonb,
  add column if not exists email_forwarding jsonb not null default '{}'::jsonb,
  add column if not exists domain_seo_report jsonb not null default '{}'::jsonb,
  add column if not exists traffic_alerts_enabled boolean not null default true,
  add column if not exists traffic_checked_at timestamptz;

alter table public.website_settings
  drop constraint if exists website_settings_domain_primary_host_check;
alter table public.website_settings
  add constraint website_settings_domain_primary_host_check
  check (domain_primary_host in ('root','www'));