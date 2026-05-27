-- Tighten Realtime channel authorization. Default Lovable Cloud config
-- left realtime.messages with permissive policies allowing any authenticated
-- user to subscribe to any topic. Restrict to known safe topic patterns.

-- Drop existing permissive policies (names may vary; use IF EXISTS for safety)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT polname FROM pg_policy WHERE polrelid = 'realtime.messages'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', r.polname);
  END LOOP;
END $$;

-- SELECT (subscribe) policy: only allow topics that belong to the user
-- or to a conversation/group the user is a member of, or generic public
-- broadcast topics that are intentionally public.
CREATE POLICY "Realtime scoped subscribe"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- user-scoped topics: user:<uid>:*
  (realtime.topic() LIKE ('user:' || auth.uid()::text || '%'))
  -- conversation topics: conversation:<uuid> (must be a member)
  OR (
    realtime.topic() LIKE 'conversation:%'
    AND public.is_conversation_member(
      auth.uid(),
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
  -- group topics: group:<uuid> (must be a member)
  OR (
    realtime.topic() LIKE 'group:%'
    AND public.is_group_member(
      auth.uid(),
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
  -- postgres_changes topics (used by supabase.channel() for table change subscriptions)
  -- These are still protected by per-table RLS on the underlying public tables.
  OR (realtime.topic() LIKE 'realtime:%')
  OR (realtime.topic() LIKE 'postgres_changes%')
  -- generic public topics (presence, etc.) — explicit allow-list prefix
  OR (realtime.topic() LIKE 'public:%')
);

-- INSERT (broadcast/publish) policy: same scoping
CREATE POLICY "Realtime scoped broadcast"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() LIKE ('user:' || auth.uid()::text || '%'))
  OR (
    realtime.topic() LIKE 'conversation:%'
    AND public.is_conversation_member(
      auth.uid(),
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
  OR (
    realtime.topic() LIKE 'group:%'
    AND public.is_group_member(
      auth.uid(),
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
  OR (realtime.topic() LIKE 'realtime:%')
  OR (realtime.topic() LIKE 'postgres_changes%')
  OR (realtime.topic() LIKE 'public:%')
);