-- 1) Members may read their subscription, never write it. Writes come from the
--    Stripe/PayPal webhooks and admin server functions (service_role).
DROP POLICY IF EXISTS subscriptions_member_all ON public.subscriptions;
CREATE POLICY subscriptions_member_read ON public.subscriptions
  FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id));
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- 2) Billing-relevant organization columns cannot be changed by tenant members.
CREATE OR REPLACE FUNCTION private.protect_org_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR private.is_super_admin() THEN
    RETURN NEW;
  END IF;
  NEW.subscription_status := OLD.subscription_status;
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.is_demo := OLD.is_demo;
  NEW.is_suspended := OLD.is_suspended;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_org_billing_columns ON public.organizations;
CREATE TRIGGER protect_org_billing_columns
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION private.protect_org_billing_columns();

-- 3) Anonymous booking / quote submissions must target a real, non-suspended
--    business with a published website instead of an arbitrary tenant id.
DROP POLICY IF EXISTS appt_public_insert ON public.appointments;
CREATE POLICY appt_public_insert ON public.appointments
  FOR INSERT TO anon
  WITH CHECK (
    private.org_site_published(organization_id)
    AND status = 'pending'
    AND starts_at > now() - interval '1 day'
    AND starts_at < now() + interval '1 year'
    AND char_length(coalesce(name, '')) BETWEEN 2 AND 120
    AND char_length(coalesce(notes, '')) <= 2000
  );

DROP POLICY IF EXISTS qr_public_insert ON public.quote_requests;
CREATE POLICY qr_public_insert ON public.quote_requests
  FOR INSERT TO anon
  WITH CHECK (private.org_site_published(organization_id));

-- 4) Conversion records contain emails: platform-admin reads only, no anon access.
REVOKE ALL ON public.marketing_conversions FROM anon;
GRANT ALL ON public.marketing_conversions TO service_role;
