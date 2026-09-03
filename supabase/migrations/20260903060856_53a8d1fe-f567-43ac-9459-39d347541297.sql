-- 1) Memberships: no self-add to arbitrary organizations.
DROP POLICY IF EXISTS memberships_insert ON public.memberships;
CREATE POLICY memberships_insert ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    private.can_manage_org(organization_id)
    OR (
      user_id = auth.uid()
      AND role = 'owner'
      AND EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = organization_id AND o.created_by = auth.uid()
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.memberships m WHERE m.organization_id = organization_id
      )
    )
  );

-- 2) Billing/entitlement fields are system-owned on INSERT too.
CREATE OR REPLACE FUNCTION private.default_org_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR private.is_super_admin() THEN
    RETURN NEW;
  END IF;
  NEW.subscription_status := 'trialing';
  NEW.trial_ends_at := now() + interval '3 days';
  NEW.is_demo := false;
  NEW.is_suspended := false;
  NEW.setup_paid_at := NULL;
  NEW.setup_checkout_session_id := NULL;
  NEW.setup_payment_status := 'unpaid';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS default_org_billing_columns ON public.organizations;
CREATE TRIGGER default_org_billing_columns
  BEFORE INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION private.default_org_billing_columns();

-- 3) Public submissions only through the validated transactional RPC.
DROP POLICY IF EXISTS leads_public_insert ON public.leads;
DROP POLICY IF EXISTS appt_public_insert ON public.appointments;
DROP POLICY IF EXISTS qr_public_insert ON public.quote_requests;
DROP POLICY IF EXISTS reviews_public_insert ON public.reviews;

REVOKE INSERT, UPDATE, DELETE ON public.leads FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.appointments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.quote_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.reviews FROM anon;

CREATE POLICY leads_no_public_write ON public.leads
  FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY appointments_no_public_write ON public.appointments
  FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY quote_requests_no_public_write ON public.quote_requests
  FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY reviews_no_public_write ON public.reviews
  FOR INSERT TO anon WITH CHECK (false);
