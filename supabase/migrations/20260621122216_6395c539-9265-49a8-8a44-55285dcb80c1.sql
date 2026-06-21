-- 1) Enforce presence privacy at the database level.
-- Direct reads of other users' presence must go through get_user_presence_safe RPC,
-- which enforces block checks + visibility settings. Restrict direct table SELECT to own row.
DROP POLICY IF EXISTS "presence_select_all" ON public.user_presence;
CREATE POLICY "presence_select_own"
  ON public.user_presence
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2) Prevent audit-log forgery: remove the direct user INSERT policy.
-- All audit entries are written through the SECURITY DEFINER log_security_event() RPC,
-- which whitelists allowed event types server-side and runs as the table owner.
DROP POLICY IF EXISTS "Users can insert own audit events" ON public.security_audit_log;

-- 3) Restore device session revocation.
-- The session revocation watcher subscribes to DELETE events on user_sessions.
-- Re-add the table to the realtime publication. RLS (SELECT own row only) ensures
-- each user receives ONLY their own session changes, so there is no broadcast leakage.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
  END IF;
END $$;