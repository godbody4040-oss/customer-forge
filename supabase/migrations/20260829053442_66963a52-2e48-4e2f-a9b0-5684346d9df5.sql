ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trial_start timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS payment_events_provider_event_uniq
  ON public.payment_events (provider, provider_event_id);