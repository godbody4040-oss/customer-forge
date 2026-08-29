UPDATE public.organizations
SET trial_ends_at = GREATEST(created_at + interval '3 days', now() + interval '3 days')
WHERE trial_ends_at IS NULL
  AND subscription_status = 'trialing'
  AND setup_paid_at IS NULL
  AND is_demo = false;

ALTER TABLE public.organizations
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '3 days');