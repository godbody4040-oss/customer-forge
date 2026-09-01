-- 1. Explicit setup payment state on the workspace.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS setup_payment_status text NOT NULL DEFAULT 'unpaid';

UPDATE public.organizations
   SET setup_payment_status = 'paid'
 WHERE setup_paid_at IS NOT NULL AND setup_payment_status <> 'paid';

UPDATE public.organizations
   SET setup_payment_status = 'checkout_started'
 WHERE setup_paid_at IS NULL
   AND setup_checkout_session_id IS NOT NULL
   AND setup_payment_status = 'unpaid';

-- 2. Clients may never write their own setup/billing state.
CREATE OR REPLACE FUNCTION private.protect_org_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  IF current_setting('role', true) = 'service_role' OR private.is_super_admin() THEN
    RETURN NEW;
  END IF;
  NEW.subscription_status := OLD.subscription_status;
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.is_demo := OLD.is_demo;
  NEW.is_suspended := OLD.is_suspended;
  NEW.setup_paid_at := OLD.setup_paid_at;
  NEW.setup_checkout_session_id := OLD.setup_checkout_session_id;
  NEW.setup_payment_status := OLD.setup_payment_status;
  NEW.plan_id := OLD.plan_id;
  RETURN NEW;
END;
$function$;

-- 3. Production eligibility: verified setup payment (or a demo workspace).
CREATE OR REPLACE FUNCTION private.production_unlocked(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org
      AND NOT o.is_suspended
      AND (o.is_demo OR o.setup_paid_at IS NOT NULL OR o.setup_payment_status = 'paid')
  )
$function$;

-- 4. Database-level launch gate. Building/configuring stays open; going live does not.
CREATE OR REPLACE FUNCTION private.guard_production_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
DECLARE
  going_live boolean;
  domain_live boolean;
BEGIN
  IF current_setting('role', true) = 'service_role' OR private.is_super_admin() THEN
    RETURN NEW;
  END IF;

  going_live := COALESCE(NEW.published, false)
                OR NEW.publish_state = 'published';
  domain_live := COALESCE(NEW.domain_verified, false)
                 OR COALESCE(NEW.ssl_active, false)
                 OR NEW.domain_status IN ('connected', 'ssl_active');

  IF TG_OP = 'UPDATE' THEN
    going_live := going_live
      AND NOT (COALESCE(OLD.published, false) OR OLD.publish_state = 'published');
    domain_live := domain_live
      AND NOT (COALESCE(OLD.domain_verified, false)
               OR COALESCE(OLD.ssl_active, false)
               OR OLD.domain_status IN ('connected', 'ssl_active'));
  END IF;

  IF (going_live OR domain_live) AND NOT private.production_unlocked(NEW.organization_id) THEN
    RAISE EXCEPTION 'PRODUCTION_LOCKED: Complete your one-time $750 setup to publish your website and activate your live domain. Your build, settings and version history stay saved.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS website_settings_production_gate ON public.website_settings;
CREATE TRIGGER website_settings_production_gate
BEFORE INSERT OR UPDATE ON public.website_settings
FOR EACH ROW EXECUTE FUNCTION private.guard_production_activation();
