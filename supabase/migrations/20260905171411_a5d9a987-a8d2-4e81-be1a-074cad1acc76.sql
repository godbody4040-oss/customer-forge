create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id text not null,
  provider text not null,
  model text not null,
  task text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  latency_ms integer not null default 0,
  ok boolean not null,
  error_category text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 6),
  fallback_used boolean not null default false,
  tool_calls integer not null default 0
);

create index if not exists ai_usage_events_created_idx on public.ai_usage_events (created_at desc);
create index if not exists ai_usage_events_org_created_idx on public.ai_usage_events (organization_id, created_at desc);
create index if not exists ai_usage_events_user_created_idx on public.ai_usage_events (user_id, created_at desc);
create index if not exists ai_usage_events_request_idx on public.ai_usage_events (request_id);

grant all on public.ai_usage_events to service_role;

alter table public.ai_usage_events enable row level security;

drop policy if exists "ai usage events service role only" on public.ai_usage_events;
create policy "ai usage events service role only"
  on public.ai_usage_events
  for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.ai_tool_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id text not null,
  tool text not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  ok boolean not null,
  reason text,
  duration_ms integer not null default 0
);

create index if not exists ai_tool_audit_created_idx on public.ai_tool_audit (created_at desc);
create index if not exists ai_tool_audit_org_created_idx on public.ai_tool_audit (organization_id, created_at desc);
create index if not exists ai_tool_audit_request_idx on public.ai_tool_audit (request_id);

grant all on public.ai_tool_audit to service_role;

alter table public.ai_tool_audit enable row level security;

drop policy if exists "ai tool audit service role only" on public.ai_tool_audit;
create policy "ai tool audit service role only"
  on public.ai_tool_audit
  for all
  to service_role
  using (true)
  with check (true);