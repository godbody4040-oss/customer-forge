-- ============ point-in-time tenant backups ============
CREATE TABLE public.data_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'scheduled' CHECK (kind IN ('scheduled','manual','pre_restore')),
  label text,
  snapshot jsonb NOT NULL,
  row_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  size_bytes bigint NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  restored_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX data_backups_org_created_idx ON public.data_backups (organization_id, created_at DESC);

GRANT SELECT ON public.data_backups TO authenticated;
GRANT ALL ON public.data_backups TO service_role;

ALTER TABLE public.data_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY data_backups_member_read ON public.data_backups
  FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id));

CREATE POLICY data_backups_no_client_insert ON public.data_backups
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY data_backups_no_client_update ON public.data_backups
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY data_backups_no_client_delete ON public.data_backups
  FOR DELETE TO authenticated, anon USING (false);

CREATE TRIGGER data_backups_touch BEFORE UPDATE ON public.data_backups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ production error tracking ============
CREATE TABLE public.error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  fingerprint text NOT NULL,
  level text NOT NULL DEFAULT 'error' CHECK (level IN ('fatal','error','warning','info')),
  source text NOT NULL DEFAULT 'server' CHECK (source IN ('server','client','job','webhook')),
  message text NOT NULL,
  stack text,
  route text,
  status_code int,
  duration_ms int,
  release text,
  environment text NOT NULL DEFAULT 'production',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  forwarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX error_events_created_idx ON public.error_events (created_at DESC);
CREATE INDEX error_events_fingerprint_idx ON public.error_events (fingerprint, created_at DESC);
CREATE INDEX error_events_org_idx ON public.error_events (organization_id, created_at DESC);

GRANT SELECT ON public.error_events TO authenticated;
GRANT ALL ON public.error_events TO service_role;

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY error_events_member_read ON public.error_events
  FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND private.is_org_member(organization_id));

CREATE POLICY error_events_no_client_insert ON public.error_events
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY error_events_no_client_update ON public.error_events
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY error_events_no_client_delete ON public.error_events
  FOR DELETE TO authenticated, anon USING (false);