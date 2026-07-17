
-- 1) Chat media storage: remove public read
DROP POLICY IF EXISTS "Chat media is publicly accessible" ON storage.objects;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can read chat media"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'chat-media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Profiles PII column-level REVOKE
REVOKE SELECT (phone, phone_number, birthdate, relationship_status, education, work, hometown, current_city)
  ON public.profiles FROM anon, authenticated;

-- 3) Group members role escalation guard
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
CREATE POLICY "Users can join public groups as member"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'member'
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_members.group_id
        AND g.is_private = false
        AND COALESCE(g.require_join_approval, false) = false
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_group_member_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR COALESCE(auth.jwt() ->> 'role','') = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.groups WHERE id = NEW.group_id AND creator_id = auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF public.get_group_role(auth.uid(), NEW.group_id) IN ('admin','moderator') THEN
    RETURN NEW;
  END IF;
  NEW.role := 'member';
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_group_member_role ON public.group_members;
CREATE TRIGGER trg_enforce_group_member_role
  BEFORE INSERT OR UPDATE OF role ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_group_member_role();

-- 4) Channel memberships: remove client INSERT
DROP POLICY IF EXISTS "Users can create memberships" ON public.channel_memberships;

-- 5) Counter columns: revoke client writes
REVOKE UPDATE (subscribers_count) ON public.channels FROM anon, authenticated;
REVOKE UPDATE (views_count, likes_count) ON public.videos FROM anon, authenticated;
REVOKE UPDATE (views_count, likes_count, downloads_count) ON public.books FROM anon, authenticated;
REVOKE UPDATE (total_motions, total_followers, total_boosts_received) ON public.creator_badges FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_channel_subscribers_count ON public.subscriptions;
CREATE TRIGGER trg_sync_channel_subscribers_count
  AFTER INSERT OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_channel_subscribers_count();

-- 6) Creator boosts: no client insert; scoped message visibility
DROP POLICY IF EXISTS "Authenticated users can send boosts" ON public.creator_boosts;
DROP POLICY IF EXISTS "Anyone can view boosts" ON public.creator_boosts;
CREATE POLICY "Boosts viewable by participants"
  ON public.creator_boosts FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.channels c WHERE c.id = creator_boosts.channel_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 7) Superchats: no client insert
DROP POLICY IF EXISTS "Users can send superchats" ON public.superchats;

-- 8) Books visibility + channel approval
DROP POLICY IF EXISTS "Books are viewable by everyone" ON public.books;
CREATE POLICY "Books viewable by visibility & approval"
  ON public.books FOR SELECT TO anon, authenticated
  USING (
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.channels c WHERE c.id = books.channel_id AND c.user_id = auth.uid()
    ))
    OR (
      COALESCE(visibility, 'public') = 'public'
      AND EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = books.channel_id
          AND COALESCE(c.approval_status, 'approved') = 'approved'
      )
    )
  );

-- 9) Videos: only approved channels' videos are public
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON public.videos;
CREATE POLICY "Videos viewable when channel approved or owner"
  ON public.videos FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = videos.channel_id
        AND (
          COALESCE(c.approval_status, 'approved') = 'approved'
          OR c.user_id = auth.uid()
        )
    )
  );

-- 10) Channels: hide non-approved channels from non-owners
DROP POLICY IF EXISTS "Channels are viewable by everyone" ON public.channels;
CREATE POLICY "Channels viewable when approved or owner"
  ON public.channels FOR SELECT TO anon, authenticated
  USING (
    COALESCE(approval_status, 'approved') = 'approved'
    OR user_id = auth.uid()
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
  );

-- 11) Poll options: honor parent post visibility
DROP POLICY IF EXISTS "Poll options viewable by everyone" ON public.poll_options;
CREATE POLICY "Poll options viewable via post visibility"
  ON public.poll_options FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = poll_options.post_id
        AND (
          COALESCE(p.visibility, 'public') = 'public'
          OR p.user_id = auth.uid()
          OR (
            COALESCE(p.visibility, 'public') = 'friends'
            AND auth.uid() IS NOT NULL
            AND public.are_friends(auth.uid(), p.user_id)
          )
        )
    )
  );

-- 12) Shares: honor referenced post visibility
DROP POLICY IF EXISTS "Shares viewable by everyone" ON public.shares;
CREATE POLICY "Shares viewable via post visibility"
  ON public.shares FOR SELECT TO anon, authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = shares.post_id
        AND (
          COALESCE(p.visibility, 'public') = 'public'
          OR p.user_id = auth.uid()
          OR (
            COALESCE(p.visibility, 'public') = 'friends'
            AND auth.uid() IS NOT NULL
            AND public.are_friends(auth.uid(), p.user_id)
          )
        )
    )
  );

-- 13) Definer functions: revoke public EXECUTE on internal helpers
DO $$
DECLARE r record;
  keep_names text[] := ARRAY[
    'has_role','is_admin','are_friends','is_group_member','is_group_public',
    'is_conversation_member','is_page_admin','has_page_role',
    'get_shared_ai_conversation','get_nova_usage_today','get_user_presence_safe',
    'get_conversation_unread_counts','mark_conversation_as_read',
    'accept_friend_request','deactivate_my_account',
    'subscribe_to_channel','unsubscribe_from_channel',
    'approve_group_join_request','admin_remove_member','admin_block_group_user',
    'admin_reject_group_post','admin_approve_channel',
    'log_security_event','check_book_duplicate','check_rate_limit',
    'increment_book_downloads','increment_book_views',
    'increment_book_likes','decrement_book_likes','get_book_file_hash',
    'get_group_role','is_user_blocked'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    IF NOT (r.proname = ANY(keep_names)) THEN
      BEGIN
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped revoke on %: %', r.sig, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;
