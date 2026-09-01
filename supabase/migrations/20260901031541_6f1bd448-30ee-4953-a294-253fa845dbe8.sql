-- Revora is Stripe-only. The two legacy PayPal reference columns hold no data
-- (verified: 0 non-null rows), so they are removed rather than left as a
-- surface that could be written to again.
ALTER TABLE public.payments DROP COLUMN IF EXISTS paypal_order_id;
ALTER TABLE public.payments DROP COLUMN IF EXISTS paypal_capture_id;

-- Enforce the single active provider at the database level, so no code path
-- (including a future regression or a direct write) can record a non-Stripe
-- payment or subscription.
ALTER TABLE public.payments
  ADD CONSTRAINT payments_provider_stripe_only
  CHECK (payment_provider = 'stripe') NOT VALID;
ALTER TABLE public.payments VALIDATE CONSTRAINT payments_provider_stripe_only;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_provider_stripe_only
  CHECK (payment_provider = 'stripe') NOT VALID;
ALTER TABLE public.subscriptions VALIDATE CONSTRAINT subscriptions_provider_stripe_only;