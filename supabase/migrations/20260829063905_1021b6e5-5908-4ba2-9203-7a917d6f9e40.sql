ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_organization_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_workspace_provider_environment_key
  ON public.subscriptions (organization_id, payment_provider, environment);