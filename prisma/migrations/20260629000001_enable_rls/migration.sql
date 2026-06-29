-- Phase C: Row Level Security (defense-in-depth tenant isolation)
--
-- Enables RLS + FORCE on every public BASE TABLE that has a tenant_id column, with a
-- policy matching the per-request GUC the app sets (set_config('app.tenant_id', ...)).
-- current_setting(..., true) returns NULL when unset -> NULL::int -> zero rows
-- (fail-closed).
--
-- SAFETY: turn this on in lockstep with (a) switching DATABASE_URL to the non-superuser
-- app_user role and (b) setting RLS_ENABLED=true in the app. A role with BYPASSRLS
-- (e.g. Supabase's 'postgres') is unaffected until you switch, so this migration is
-- inert on the current connection. Verify on a Supabase branch DB first.
-- Idempotent: safe to re-run.

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
      AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I '
      'USING (tenant_id = current_setting(''app.tenant_id'', true)::int) '
      'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::int)',
      t
    );
  END LOOP;
END $$;
