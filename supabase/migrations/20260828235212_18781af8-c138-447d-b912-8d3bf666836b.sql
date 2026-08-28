create type public.payment_status as enum (
  'created','pending','approved','completed','failed','cancelled','refunded','partially_refunded','disputed'
);
create type public.payment_product_kind as enum ('one_time','subscription','setup_fee','deposit','addon','service');

create table public.payment_products (
  id text primary key,
  name text not null,
  description text,
  kind public.payment_product_kind not null default 'one_time',
  plan_id text references public.plans(id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  billing_interval public.billing_interval,
  entitlement_key text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.payment_products to anon, authenticated;
grant all on public.payment_products to service_role;
alter table public.payment_products enable row level security;
create policy "payment_products_read_active" on public.payment_products for select to anon, authenticated using (is_active);
create policy "payment_products_admin_write" on public.payment_products for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create trigger payment_products_touch before update on public.payment_products for each row execute function public.touch_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  product_id text references public.payment_products(id) on delete set null,
  plan_id text references public.plans(id) on delete set null,
  payment_provider text not null default 'paypal',
  environment text not null default 'sandbox',
  paypal_order_id text unique,
  paypal_capture_id text,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status public.payment_status not null default 'created',
  customer_email text,
  description text,
  refund_status text,
  refunded_amount numeric(12,2) not null default 0,
  provider_subscription_id text,
  billing_interval public.billing_interval,
  period_start timestamptz,
  period_end timestamptz,
  cancelled_at timestamptz,
  entitlement_applied boolean not null default false,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index payments_org_idx on public.payments (organization_id, created_at desc);
create index payments_order_idx on public.payments (paypal_order_id);

grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "payments_member_read" on public.payments for select to authenticated
  using (private.is_org_member(organization_id) or private.is_super_admin());
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  provider text not null default 'paypal',
  provider_event_id text not null,
  event_type text not null,
  resource_id text,
  verification_status text,
  processed boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index payment_events_provider_event_idx on public.payment_events (provider, provider_event_id);

grant select on public.payment_events to authenticated;
grant all on public.payment_events to service_role;
alter table public.payment_events enable row level security;
create policy "payment_events_member_read" on public.payment_events for select to authenticated
  using ((organization_id is not null and private.is_org_member(organization_id)) or private.is_super_admin());

insert into public.payment_products (id, name, description, kind, amount, currency, billing_interval, entitlement_key, sort_order) values
  ('website-build','Website Build','Complete conversion-focused website build, generated and reviewed by Revora.','one_time',750.00,'USD',null,'website_build',10),
  ('growth-setup','Growth System Setup','CRM, quote calculator, booking and follow-up automations configured for your business.','setup_fee',500.00,'USD',null,'growth_setup',20),
  ('deposit','Project Deposit','Deposit to reserve your build slot, credited against your project total.','deposit',250.00,'USD',null,null,30);

insert into public.payment_products (id, name, description, kind, plan_id, amount, currency, billing_interval, sort_order)
select 'plan-' || p.id || '-monthly', p.name || ' Plan (monthly)', coalesce(p.tagline, 'Monthly Revora subscription.'), 'subscription', p.id, p.monthly_price, 'USD', 'monthly', 100 + p.sort_order
from public.plans p where p.is_active and p.monthly_price > 0;

insert into public.payment_products (id, name, description, kind, plan_id, amount, currency, billing_interval, sort_order)
select 'plan-' || p.id || '-annual', p.name || ' Plan (annual)', coalesce(p.tagline, 'Annual Revora subscription.'), 'subscription', p.id, p.annual_price, 'USD', 'annual', 200 + p.sort_order
from public.plans p where p.is_active and p.annual_price > 0;