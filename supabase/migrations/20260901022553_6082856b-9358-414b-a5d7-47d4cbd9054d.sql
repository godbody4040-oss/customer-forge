ALTER TABLE public.payments ALTER COLUMN payment_provider SET DEFAULT 'stripe';
ALTER TABLE public.payment_events ALTER COLUMN provider SET DEFAULT 'stripe';