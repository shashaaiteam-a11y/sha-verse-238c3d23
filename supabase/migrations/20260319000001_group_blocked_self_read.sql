-- Allow a user to read their own blocked-user record so the frontend
-- can prevent them from attempting to join/request a group they're banned from.

DROP POLICY IF EXISTS "User can check own blocked status" ON public.group_blocked_users;

CREATE POLICY "User can check own blocked status"
ON public.group_blocked_users FOR SELECT TO authenticated
USING (
  -- The blocked user themselves can read the row
  auth.uid() = user_id
  OR
  -- Admins/moderators can still read all rows for their group
  public.is_group_admin(group_id, auth.uid())
);

-- Also add group_join_requests to realtime if not already present,
-- so per-user filtered subscriptions work for request status updates.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'group_join_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_join_requests;
  END IF;
END $$;
