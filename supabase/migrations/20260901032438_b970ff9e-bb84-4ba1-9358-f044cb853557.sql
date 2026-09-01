-- Billing records are read-only for customers and writable only by the
-- Stripe webhook (service_role). Revoke the write privileges that were
-- granted to signed-in users and to anonymous visitors on public.payments,
-- and revoke every anonymous privilege: no visitor has any business reading
-- or altering a billing record.
REVOKE ALL ON public.payments FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.payments FROM authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- Subscriptions: same posture, made explicit and idempotent.
REVOKE ALL ON public.subscriptions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- Belt and braces at the row level: an explicit RESTRICTIVE policy means that
-- even if a future migration re-grants writes or adds a permissive policy by
-- mistake, no signed-in user can insert, update or delete a billing row.
DROP POLICY IF EXISTS subscriptions_no_member_writes ON public.subscriptions;
CREATE POLICY subscriptions_no_member_writes ON public.subscriptions
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS payments_no_member_writes ON public.payments;
CREATE POLICY payments_no_member_writes ON public.payments
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- The restrictive policy above applies to every command, so re-state the
-- member read paths as their own permissive SELECT policies (restrictive
-- policies are ANDed only with policies of the same command; SELECT keeps
-- working because a RESTRICTIVE ... FOR ALL applies USING(false) to SELECT
-- too, which we must not do -- so scope the restriction to writes only).
DROP POLICY IF EXISTS subscriptions_no_member_writes ON public.subscriptions;
DROP POLICY IF EXISTS payments_no_member_writes ON public.payments;

CREATE POLICY subscriptions_no_member_insert ON public.subscriptions
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY subscriptions_no_member_update ON public.subscriptions
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY subscriptions_no_member_delete ON public.subscriptions
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

CREATE POLICY payments_no_member_insert ON public.payments
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY payments_no_member_update ON public.payments
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY payments_no_member_delete ON public.payments
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);