-- Canonical Revora offer: $750 one-time setup + $100/month, 30-day monthly
-- trial, 3-day full access. Corrective migration: fixes current state only.

UPDATE public.plans
SET monthly_price = 100, setup_price = 750, annual_price = 0, is_active = true
WHERE id = 'revora_growth_system';

UPDATE public.payment_products
SET amount = 750, currency = 'USD', kind = 'setup_fee', billing_interval = NULL, is_active = true
WHERE id = 'revora_growth_system_setup';

UPDATE public.payment_products
SET amount = 100, currency = 'USD', kind = 'subscription', billing_interval = 'monthly', is_active = true
WHERE id = 'revora_growth_system_monthly';

-- Retire any other product that claims to be the Revora Growth System offer.
UPDATE public.payment_products
SET is_active = false
WHERE id <> 'revora_growth_system_setup'
  AND id <> 'revora_growth_system_monthly'
  AND plan_id = 'revora_growth_system';

ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS plans_revora_offer_locked,
  ADD CONSTRAINT plans_revora_offer_locked CHECK (
    id <> 'revora_growth_system'
    OR (monthly_price = 100 AND setup_price = 750 AND annual_price = 0)
  );

ALTER TABLE public.payment_products
  DROP CONSTRAINT IF EXISTS payment_products_revora_offer_locked,
  ADD CONSTRAINT payment_products_revora_offer_locked CHECK (
    (
      id <> 'revora_growth_system_setup'
      OR (amount = 750 AND upper(currency) = 'USD' AND kind = 'setup_fee')
    )
    AND (
      id <> 'revora_growth_system_monthly'
      OR (amount = 100 AND upper(currency) = 'USD' AND kind = 'subscription' AND billing_interval = 'monthly')
    )
  );

UPDATE public.offer_config
SET setup_price = 750, monthly_price = 100, trial_days = 30, full_access_days = 3
WHERE id = 'growth_system';

INSERT INTO public.offer_config (id, setup_price, monthly_price, trial_days, full_access_days)
SELECT 'growth_system', 750, 100, 30, 3
WHERE NOT EXISTS (SELECT 1 FROM public.offer_config WHERE id = 'growth_system');

ALTER TABLE public.offer_config
  DROP CONSTRAINT IF EXISTS offer_config_setup_price_check,
  DROP CONSTRAINT IF EXISTS offer_config_monthly_price_check,
  DROP CONSTRAINT IF EXISTS offer_config_revora_offer_locked,
  ADD CONSTRAINT offer_config_revora_offer_locked CHECK (
    id <> 'growth_system'
    OR (setup_price = 750 AND monthly_price = 100 AND trial_days = 30 AND full_access_days = 3)
  );

-- Pricing records are deployment-controlled: no client-side writes at all.
REVOKE INSERT, UPDATE, DELETE ON public.offer_config FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.plans FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.payment_products FROM authenticated, anon;
GRANT ALL ON public.offer_config TO service_role;
GRANT ALL ON public.plans TO service_role;
GRANT ALL ON public.payment_products TO service_role;
