-- ENUMS
create type public.app_role as enum ('owner','admin','manager','staff','viewer');
create type public.platform_role as enum ('super_admin');
create type public.lead_status as enum ('new','contacted','qualified','quoted','booked','completed','lost');
create type public.appointment_status as enum ('pending','confirmed','completed','cancelled','no_show');
create type public.subscription_status as enum ('trialing','active','past_due','canceled','suspended');
create type public.billing_interval as enum ('monthly','annual');
create type public.conversion_goal as enum ('calls','quotes','bookings','consultations','purchases');

-- UPDATED_AT
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- PLATFORM ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.platform_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'super_admin');
$$;

-- PLANS
create table public.plans (
  id text primary key,
  name text not null,
  monthly_price numeric(10,2) not null default 0,
  annual_price numeric(10,2) not null default 0,
  tagline text,
  features text[] not null default '{}',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.plans to anon, authenticated;
grant insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy "plans_public_read" on public.plans for select using (true);
create policy "plans_admin_write" on public.plans for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create trigger plans_touch before update on public.plans for each row execute function public.touch_updated_at();

-- ORGANIZATIONS
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  industry text,
  plan_id text references public.plans(id),
  subscription_status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz default (now() + interval '14 days'),
  conversion_goal public.conversion_goal,
  onboarding_step int not null default 1,
  onboarding_completed boolean not null default false,
  is_demo boolean not null default false,
  is_suspended boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organizations_slug_idx on public.organizations(slug);
grant select on public.organizations to anon;
grant select, insert, update, delete on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;
create trigger organizations_touch before update on public.organizations for each row execute function public.touch_updated_at();

-- MEMBERSHIPS
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'owner',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);
grant select, insert, update, delete on public.memberships to authenticated;
grant all on public.memberships to service_role;
alter table public.memberships enable row level security;

create or replace function public.is_org_member(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships where organization_id = _org and user_id = auth.uid())
      or public.is_super_admin();
$$;

create or replace function public.can_manage_org(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships
    where organization_id = _org and user_id = auth.uid()
      and role in ('owner','admin','manager')
  ) or public.is_super_admin();
$$;

-- profile / role / membership / org policies
create policy "profiles_self_read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_super_admin());
create policy "profiles_self_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_self_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "user_roles_read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_super_admin());

create policy "memberships_read" on public.memberships for select to authenticated using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy "memberships_insert" on public.memberships for insert to authenticated with check (user_id = auth.uid() or public.can_manage_org(organization_id));
create policy "memberships_update" on public.memberships for update to authenticated using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));
create policy "memberships_delete" on public.memberships for delete to authenticated using (public.can_manage_org(organization_id));

create policy "orgs_public_read" on public.organizations for select using (not is_suspended or public.is_org_member(id));
create policy "orgs_insert" on public.organizations for insert to authenticated with check (created_by = auth.uid());
create policy "orgs_update" on public.organizations for update to authenticated using (public.can_manage_org(id)) with check (public.can_manage_org(id));
create policy "orgs_delete" on public.organizations for delete to authenticated using (public.is_super_admin());

-- BUSINESS PROFILES
create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  tagline text,
  description text,
  phone text,
  email text,
  website text,
  address text,
  city text,
  state text,
  zip text,
  service_area text,
  hours jsonb not null default '{}'::jsonb,
  logo_url text,
  hero_image_url text,
  primary_color text default '#34D399',
  secondary_color text default '#0E0E10',
  accent_color text default '#F59E0B',
  font_preference text default 'Space Grotesk',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger business_profiles_touch before update on public.business_profiles for each row execute function public.touch_updated_at();

-- SERVICES
create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  category text,
  price numeric(10,2),
  starting_price numeric(10,2),
  duration_minutes int not null default 60,
  image_url text,
  bookable boolean not null default true,
  featured boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_org_idx on public.services(organization_id);
create trigger services_touch before update on public.services for each row execute function public.touch_updated_at();

-- WEBSITE SETTINGS
create table public.website_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  template text not null default 'default',
  pages jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  subdomain text,
  custom_domain text,
  domain_verified boolean not null default false,
  ssl_active boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger website_settings_touch before update on public.website_settings for each row execute function public.touch_updated_at();

-- SOCIAL PROFILES
create table public.social_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  instagram text, facebook text, tiktok text, youtube text,
  google_business text, linkedin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger social_profiles_touch before update on public.social_profiles for each row execute function public.touch_updated_at();

-- MEDIA
create table public.media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  url text not null,
  alt_text text,
  category text default 'gallery',
  file_name text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index media_org_idx on public.media(organization_id);

-- CUSTOMERS
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  notes text,
  tags text[] not null default '{}',
  total_value numeric(10,2) not null default 0,
  last_appointment_at timestamptz,
  next_appointment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_org_idx on public.customers(organization_id);
create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();

-- CAMPAIGNS
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  source text not null default 'direct',
  medium text,
  code text not null,
  target_path text default '/',
  scans int not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index campaigns_org_idx on public.campaigns(organization_id);

-- LEADS
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  service_id uuid references public.services(id) on delete set null,
  service_interest text,
  message text,
  city text,
  source text not null default 'website',
  campaign text,
  status public.lead_status not null default 'new',
  estimated_value numeric(10,2) not null default 0,
  assigned_to uuid references auth.users(id) on delete set null,
  notes text,
  customer_id uuid references public.customers(id) on delete set null,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_org_status_idx on public.leads(organization_id, status);
create index leads_org_created_idx on public.leads(organization_id, created_at desc);
create trigger leads_touch before update on public.leads for each row execute function public.touch_updated_at();

-- APPOINTMENTS
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  name text not null,
  email text,
  phone text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index appointments_org_start_idx on public.appointments(organization_id, starts_at);
create trigger appointments_touch before update on public.appointments for each row execute function public.touch_updated_at();

-- QUOTE CALCULATOR
create table public.quote_forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default 'Instant Estimate',
  base_price numeric(10,2) not null default 0,
  min_price numeric(10,2) not null default 0,
  max_price numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quote_forms_org_idx on public.quote_forms(organization_id);
create trigger quote_forms_touch before update on public.quote_forms for each row execute function public.touch_updated_at();

create table public.quote_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.quote_forms(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  helper_text text,
  question_type text not null default 'single',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index quote_questions_form_idx on public.quote_questions(form_id);

create table public.quote_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quote_questions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  price_modifier numeric(10,2) not null default 0,
  modifier_type text not null default 'add',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index quote_options_question_idx on public.quote_options(question_id);

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  form_id uuid references public.quote_forms(id) on delete set null,
  lead_id uuid references public.leads(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  estimate_min numeric(10,2) not null default 0,
  estimate_max numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index quote_requests_org_idx on public.quote_requests(organization_id);

-- REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  author_name text not null,
  rating int not null default 5,
  comment text,
  private_feedback text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index reviews_org_idx on public.reviews(organization_id);

-- AUTOMATIONS
create table public.automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  trigger_event text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index automations_org_idx on public.automations(organization_id);
create trigger automations_touch before update on public.automations for each row execute function public.touch_updated_at();

create table public.automation_steps (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sort_order int not null default 0,
  delay_minutes int not null default 0,
  action_type text not null default 'email',
  subject text,
  body text,
  created_at timestamptz not null default now()
);
create index automation_steps_automation_idx on public.automation_steps(automation_id);

-- ANALYTICS
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  path text,
  referrer text,
  source text,
  campaign text,
  device text,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index analytics_org_created_idx on public.analytics_events(organization_id, created_at desc);

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  body text,
  kind text not null default 'info',
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_org_idx on public.notifications(organization_id, created_at desc);

-- AUDIT LOGS
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_org_idx on public.audit_logs(organization_id, created_at desc);

-- SUBSCRIPTIONS
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id text references public.plans(id),
  status public.subscription_status not null default 'trialing',
  billing_interval public.billing_interval not null default 'monthly',
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_touch before update on public.subscriptions for each row execute function public.touch_updated_at();

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  amount numeric(10,2) not null default 0,
  status text not null default 'paid',
  period_start timestamptz,
  period_end timestamptz,
  provider_invoice_id text,
  created_at timestamptz not null default now()
);
create index invoices_org_idx on public.invoices(organization_id, created_at desc);

-- GRANTS + RLS FOR TENANT TABLES
do $$
declare t text;
  public_read text[] := array['business_profiles','services','website_settings','social_profiles','media','quote_forms','quote_questions','quote_options','reviews'];
  public_write text[] := array['leads','quote_requests','appointments','analytics_events','reviews'];
  all_tables text[] := array['business_profiles','services','website_settings','social_profiles','media','customers','campaigns','leads','appointments','quote_forms','quote_questions','quote_options','quote_requests','reviews','automations','automation_steps','analytics_events','notifications','audit_logs','subscriptions','invoices'];
begin
  foreach t in array all_tables loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))', t || '_member_all', t);
  end loop;

  foreach t in array public_read loop
    execute format('grant select on public.%I to anon', t);
  end loop;

  foreach t in array public_write loop
    execute format('grant insert on public.%I to anon', t);
  end loop;
end $$;

-- public read policies (anon)
create policy "bp_public_read" on public.business_profiles for select to anon using (true);
create policy "services_public_read" on public.services for select to anon using (is_active);
create policy "ws_public_read" on public.website_settings for select to anon using (published);
create policy "social_public_read" on public.social_profiles for select to anon using (true);
create policy "media_public_read" on public.media for select to anon using (true);
create policy "qf_public_read" on public.quote_forms for select to anon using (is_active);
create policy "qq_public_read" on public.quote_questions for select to anon using (true);
create policy "qo_public_read" on public.quote_options for select to anon using (true);
create policy "reviews_public_read" on public.reviews for select to anon using (is_published);

-- public submission policies (anon)
create policy "leads_public_insert" on public.leads for insert to anon with check (true);
create policy "qr_public_insert" on public.quote_requests for insert to anon with check (true);
create policy "appt_public_insert" on public.appointments for insert to anon with check (true);
create policy "analytics_public_insert" on public.analytics_events for insert to anon with check (true);
create policy "reviews_public_insert" on public.reviews for insert to anon with check (not is_published);

-- seed plans
insert into public.plans (id, name, monthly_price, annual_price, tagline, features, is_featured, sort_order) values
('starter','Starter',99,990,'Everything you need to stop losing leads.', array['Conversion-optimized website','Lead capture forms','Lead pipeline','Local SEO foundation','Email notifications'], false, 1),
('growth','Growth',249,2490,'Capture, book and follow up automatically.', array['Everything in Starter','Online booking','Smart quote calculator','Automated follow-up','Review requests','Campaign + QR tracking'], true, 2),
('pro','Pro',499,4990,'The full customer acquisition operating system.', array['Everything in Growth','Multiple locations','Team accounts + roles','Custom domain','Advanced analytics + reports','Priority support'], false, 3);