-- Least-privilege pass: remove table-level write privileges from the visitor
-- role wherever no policy grants it a write anyway. Row-level security already
-- blocked these writes; revoking the grant removes the second line of defence
-- being needed at all. analytics_events keeps INSERT (validated policy).
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname <> 'analytics_events'
      AND (
        has_table_privilege('anon', c.oid, 'INSERT')
        OR has_table_privilege('anon', c.oid, 'UPDATE')
        OR has_table_privilege('anon', c.oid, 'DELETE')
      )
      -- never touch a table that actually has a permissive visitor write rule
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename = c.relname
          AND p.permissive = 'PERMISSIVE'
          AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
          AND ('anon' = ANY (p.roles) OR 'public' = ANY (p.roles))
          AND coalesce(p.with_check, p.qual, 'false') <> 'false'
      )
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon', t.relname);
  END LOOP;
END $$;
