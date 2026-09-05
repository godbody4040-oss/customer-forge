-- 1. Quote form family: anon and signed-in users had table-wide TRUNCATE
--    (plus REFERENCES/TRIGGER/MAINTAIN) privileges. TRUNCATE ignores row level
--    security entirely, so any visitor or member could have destroyed every
--    business's quote configuration. Re-grant only what each role needs.
revoke all on public.quote_forms from anon, authenticated;
revoke all on public.quote_questions from anon, authenticated;
revoke all on public.quote_options from anon, authenticated;
revoke all on public.quote_addons from anon, authenticated;

-- Public site rendering: column-scoped reads only. Pricing is required for the
-- public quote calculator; no other column is exposed to anonymous visitors.
grant select (id, organization_id, name, base_price, min_price, max_price, is_active)
  on public.quote_forms to anon;
grant select (id, form_id, organization_id, label, helper_text, question_type, sort_order)
  on public.quote_questions to anon;
grant select (id, question_id, organization_id, label, price_modifier, modifier_type, sort_order)
  on public.quote_options to anon;
grant select (id, organization_id, form_id, label, description, price, sort_order)
  on public.quote_addons to anon;

-- Signed-in staff manage their own business's quote configuration; row level
-- security policies still scope every statement to their organization.
grant select, insert, update, delete on public.quote_forms to authenticated;
grant select, insert, update, delete on public.quote_questions to authenticated;
grant select, insert, update, delete on public.quote_options to authenticated;
grant select, insert, update, delete on public.quote_addons to authenticated;

grant all on public.quote_forms to service_role;
grant all on public.quote_questions to service_role;
grant all on public.quote_options to service_role;
grant all on public.quote_addons to service_role;

-- 2. Subscriptions are billing truth: readable by members of the business,
--    writable only by the verified Stripe webhook path (service role).
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

-- Belt-and-braces: keep the restrictive write policies explicit so a future
-- grant cannot silently re-open member self-service subscription writes.
drop policy if exists subscriptions_no_member_insert on public.subscriptions;
drop policy if exists subscriptions_no_member_update on public.subscriptions;
drop policy if exists subscriptions_no_member_delete on public.subscriptions;

create policy subscriptions_no_member_insert on public.subscriptions
  as restrictive for insert to anon, authenticated with check (false);
create policy subscriptions_no_member_update on public.subscriptions
  as restrictive for update to anon, authenticated using (false) with check (false);
create policy subscriptions_no_member_delete on public.subscriptions
  as restrictive for delete to anon, authenticated using (false);