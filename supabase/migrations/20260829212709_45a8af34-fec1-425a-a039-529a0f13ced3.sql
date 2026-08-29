REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
REVOKE ALL ON public.subscriptions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.job_queue_state FROM authenticated;
REVOKE ALL ON public.job_queue_state FROM anon;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.job_queue_state TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.job_queue_state TO service_role;