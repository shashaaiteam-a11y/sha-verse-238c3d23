-- 1. Superchats: remove public exposure
DROP POLICY IF EXISTS "Anyone can view superchats" ON public.superchats;
CREATE POLICY "Superchats viewable by participants"
ON public.superchats FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.channels c WHERE c.id = superchats.channel_id AND c.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
REVOKE SELECT ON public.superchats FROM anon;

-- 2. Owners cannot fabricate metrics: column-level REVOKE of counter/trust columns
REVOKE UPDATE (likes_count, comments_count, shares_count) ON public.posts FROM authenticated, anon;
REVOKE UPDATE (likes_count, comments_count, views_count) ON public.videos FROM authenticated, anon;
REVOKE UPDATE (likes_count, comments_count, views_count, downloads_count, rating_avg, rating_count) ON public.books FROM authenticated, anon;
REVOKE UPDATE (subscribers_count) ON public.channels FROM authenticated, anon;
REVOKE UPDATE (vote_count) ON public.poll_options FROM authenticated, anon;
REVOKE UPDATE (badge_level, verified_at, total_followers, total_boosts_received, achievements) ON public.creator_badges FROM authenticated, anon;
REVOKE UPDATE (is_verified) ON public.profiles FROM authenticated, anon;

-- 3. Book counters: per-user dedupe, authenticated only, no direct like manipulation
CREATE UNIQUE INDEX IF NOT EXISTS book_counter_events_unique
  ON public.book_counter_events (user_id, book_id, kind);

CREATE OR REPLACE FUNCTION public.increment_book_views(book_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _ins int;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  INSERT INTO public.book_counter_events (user_id, book_id, kind)
  VALUES (_uid, book_id, 'view') ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS _ins = ROW_COUNT;
  IF _ins > 0 THEN
    UPDATE public.books SET views_count = COALESCE(views_count,0) + 1 WHERE id = book_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.increment_book_downloads(book_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _ins int;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  INSERT INTO public.book_counter_events (user_id, book_id, kind)
  VALUES (_uid, book_id, 'download') ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS _ins = ROW_COUNT;
  IF _ins > 0 THEN
    UPDATE public.books SET downloads_count = COALESCE(downloads_count,0) + 1 WHERE id = book_id;
  END IF;
END; $$;

-- like counters are maintained by trg_sync_book_likes_count on public.likes
REVOKE EXECUTE ON FUNCTION public.increment_book_likes(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.decrement_book_likes(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_book_views(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_book_downloads(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.increment_book_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_book_downloads(uuid) TO authenticated;

-- 4. Boosts / revenue cannot be inserted from the client
REVOKE INSERT, UPDATE, DELETE ON public.creator_boosts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.revenue_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.superchats FROM anon, authenticated;
GRANT ALL ON public.creator_boosts TO service_role;
GRANT ALL ON public.revenue_transactions TO service_role;
GRANT ALL ON public.superchats TO service_role;

-- 5. Rewarded ad unlocks: server decides reward value/expiry, never the client
CREATE OR REPLACE FUNCTION public.grant_rewarded_ad_unlock(
  _reward_type text, _reward_value integer DEFAULT NULL,
  _resource_id uuid DEFAULT NULL, _expires_minutes integer DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_id uuid;
  _recent_count int;
  _value int;
  _minutes int;
  _expires timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Server-side reward catalogue; client-supplied value/expiry are ignored.
  CASE _reward_type
    WHEN 'novachat_messages'  THEN _value := 5; _minutes := NULL;
    WHEN 'bookshelf_premium'  THEN _value := 1; _minutes := 60;
    WHEN 'movion_ad_free'     THEN _value := 1; _minutes := 30;
    WHEN 'group_boost'        THEN _value := 1; _minutes := 1440;
    ELSE RAISE EXCEPTION 'Invalid reward type';
  END CASE;

  SELECT count(*) INTO _recent_count
  FROM public.rewarded_ad_unlocks
  WHERE user_id = _uid AND created_at > now() - interval '1 hour';
  IF _recent_count >= 10 THEN RAISE EXCEPTION 'Rate limit exceeded'; END IF;

  IF _minutes IS NOT NULL THEN _expires := now() + make_interval(mins => _minutes); END IF;

  INSERT INTO public.rewarded_ad_unlocks (user_id, reward_type, reward_value, resource_id, expires_at)
  VALUES (_uid, _reward_type, _value, _resource_id, _expires)
  RETURNING id INTO _new_id;

  RETURN _new_id;
END; $$;

REVOKE UPDATE ON public.rewarded_ad_unlocks FROM anon, authenticated;
DROP POLICY IF EXISTS "Users can update their own rewards" ON public.rewarded_ad_unlocks;
REVOKE EXECUTE ON FUNCTION public.grant_rewarded_ad_unlock(text, integer, uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.grant_rewarded_ad_unlock(text, integer, uuid, integer) TO authenticated;

-- 6. Lock down needlessly exposed SECURITY DEFINER functions
DO $$
DECLARE
  r record;
  anon_allow text[] := ARRAY['get_shared_ai_conversation','are_friends','is_group_public','has_role'];
  auth_deny text[] := ARRAY[
    'calculate_trending_scores','cleanup_expired_stories','process_book_auto_deletions',
    'email_queue_dispatch','enqueue_email','delete_email','move_to_dlq',
    'calculate_friend_suggestions','generate_feed_for_user','get_book_file_hash',
    'increment_book_likes','decrement_book_likes'
  ];
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.prorettype
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF r.prorettype = 'trigger'::regtype THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, authenticated, public', r.proname, r.args);
    ELSE
      IF NOT (r.proname = ANY(anon_allow)) THEN
        EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', r.proname, r.args);
      END IF;
      IF r.proname = ANY(auth_deny) THEN
        EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated, public', r.proname, r.args);
      END IF;
    END IF;
  END LOOP;
END $$;