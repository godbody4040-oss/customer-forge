-- 1. plans: new columns for the single-offer model
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS setup_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_setup_price_id text;

-- 2. organizations: setup fee tracking
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS setup_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS setup_checkout_session_id text;

-- 3. the single plan
INSERT INTO public.plans (
  id, name, monthly_price, annual_price, setup_price, tagline, features,
  is_active, is_featured, sort_order, stripe_monthly_price_id, stripe_annual_price_id, stripe_setup_price_id
) VALUES (
  'revora_growth_system',
  'Revora Growth System',
  250,
  3000,
  1500,
  'One complete done-for-you customer acquisition and growth system.',
  ARRAY[
    'Professional business website',
    'Custom domain connection and setup',
    'Lead capture system',
    'CRM',
    'Online booking',
    'Quote and request system',
    'Automated lead follow-up',
    'Customer notifications',
    'Review and reputation automation',
    'Local SEO foundation',
    'Analytics and reporting',
    'AI-powered business tools',
    'Ongoing website and system updates',
    'Technical support'
  ],
  true, true, 1,
  'revora_system_monthly', NULL, 'revora_system_setup'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  setup_price = EXCLUDED.setup_price,
  tagline = EXCLUDED.tagline,
  features = EXCLUDED.features,
  is_active = true,
  is_featured = true,
  sort_order = 1,
  stripe_monthly_price_id = EXCLUDED.stripe_monthly_price_id,
  stripe_annual_price_id = NULL,
  stripe_setup_price_id = EXCLUDED.stripe_setup_price_id;

-- 4. re-point every reference to the single plan
UPDATE public.organizations SET plan_id = 'revora_growth_system' WHERE plan_id IS NOT NULL AND plan_id <> 'revora_growth_system';
UPDATE public.subscriptions SET plan_id = 'revora_growth_system' WHERE plan_id IS NOT NULL AND plan_id <> 'revora_growth_system';
UPDATE public.payments SET plan_id = 'revora_growth_system' WHERE plan_id IS NOT NULL AND plan_id <> 'revora_growth_system';
UPDATE public.payment_products SET plan_id = 'revora_growth_system' WHERE plan_id IS NOT NULL AND plan_id <> 'revora_growth_system';
UPDATE public.invoices SET id = id WHERE false;

-- 5. entitlements: one full set for the single plan
DELETE FROM public.plan_entitlements WHERE plan_id <> 'revora_growth_system';
DELETE FROM public.plan_entitlements WHERE plan_id = 'revora_growth_system';
INSERT INTO public.plan_entitlements (plan_id, feature_key, limit_value)
SELECT 'revora_growth_system', key, NULL FROM (VALUES
  ('website'), ('custom_domain'), ('lead_capture'), ('crm'), ('booking'), ('quotes'),
  ('automations'), ('notifications'), ('reviews'), ('local_seo'), ('analytics'),
  ('ai_tools'), ('site_updates'), ('support'), ('campaigns'), ('multi_location')
) AS t(key);

-- 6. remove the retired plans
DELETE FROM public.plans WHERE id <> 'revora_growth_system';

-- 7. products: single setup product, retire old recurring products
UPDATE public.payment_products SET is_active = false WHERE kind = 'subscription' OR billing_interval IS NOT NULL;
INSERT INTO public.payment_products (id, name, description, kind, plan_id, amount, currency, billing_interval, entitlement_key, is_active, sort_order)
VALUES (
  'revora_growth_system_setup',
  'Revora Growth System — Setup',
  'One-time implementation, customization, configuration and launch of your Revora Growth System.',
  'setup_fee',
  'revora_growth_system',
  1500,
  'USD',
  NULL,
  'website',
  true,
  1
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  kind = EXCLUDED.kind,
  plan_id = EXCLUDED.plan_id,
  is_active = true,
  sort_order = 1;