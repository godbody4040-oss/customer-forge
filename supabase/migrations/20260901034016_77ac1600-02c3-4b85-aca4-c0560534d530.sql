CREATE TABLE public.offer_config (
  id text PRIMARY KEY,
  setup_price numeric NOT NULL,
  monthly_price numeric NOT NULL,
  trial_days integer NOT NULL DEFAULT 30,
  full_access_days integer NOT NULL DEFAULT 3,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offer_config_setup_range CHECK (setup_price >= 1 AND setup_price <= 100000),
  CONSTRAINT offer_config_monthly_range CHECK (monthly_price >= 1 AND monthly_price <= 100000),
  CONSTRAINT offer_config_trial_range CHECK (trial_days BETWEEN 0 AND 365),
  CONSTRAINT offer_config_full_access_range CHECK (full_access_days BETWEEN 0 AND 365)
);

GRANT SELECT ON public.offer_config TO anon, authenticated;
GRANT ALL ON public.offer_config TO service_role;

ALTER TABLE public.offer_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY offer_config_read ON public.offer_config
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY offer_config_no_client_write ON public.offer_config
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE TRIGGER offer_config_touch BEFORE UPDATE ON public.offer_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.offer_config (id, setup_price, monthly_price, trial_days, full_access_days)
VALUES ('growth_system', 750, 100, 30, 3);