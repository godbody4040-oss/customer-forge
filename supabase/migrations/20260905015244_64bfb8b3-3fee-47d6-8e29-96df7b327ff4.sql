-- A privacy-safe visitor identifier: a random value generated in the browser
-- and kept in that browser only. It is not derived from IP, user agent, email
-- or any other personal detail, so it cannot identify a person - it only lets
-- repeat visits from the same browser be counted once.
alter table public.marketing_conversions
  add column if not exists visitor_id text;

create index if not exists marketing_conversions_visitor_idx
  on public.marketing_conversions (visitor_id, created_at desc);