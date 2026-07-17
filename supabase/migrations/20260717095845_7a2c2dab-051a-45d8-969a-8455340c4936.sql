-- Restore EXECUTE on client-facing RPCs that were revoked
DO $$
DECLARE r record;
  keep_names text[] := ARRAY[
    'upsert_my_chat_privacy','comment_likes_count','admin_reject_channel',
    'calculate_friend_suggestions','increment_member_warnings','apply_for_partner',
    'get_profile_private_fields','grant_rewarded_ad_unlock','record_story_view',
    'calculate_trending_scores','upsert_current_session','mark_all_conversations_read',
    'get_page_contact'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(keep_names)
  LOOP
    BEGIN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'grant failed on %: %', r.sig, SQLERRM;
    END;
  END LOOP;
END $$;

-- Server-side maintenance of videos.likes_count (client UPDATE was revoked)
CREATE OR REPLACE FUNCTION public.sync_video_likes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
  v := COALESCE(NEW.video_id, OLD.video_id);
  IF v IS NOT NULL THEN
    UPDATE public.videos
      SET likes_count = (SELECT count(*) FROM public.likes WHERE video_id = v)
      WHERE id = v;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_video_likes_count ON public.likes;
CREATE TRIGGER trg_sync_video_likes_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_video_likes_count();

-- Server-side maintenance of books.likes_count via likes table too (books also referenced there)
CREATE OR REPLACE FUNCTION public.sync_book_likes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b uuid;
BEGIN
  b := COALESCE(NEW.book_id, OLD.book_id);
  IF b IS NOT NULL THEN
    UPDATE public.books
      SET likes_count = (SELECT count(*) FROM public.likes WHERE book_id = b)
      WHERE id = b;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_book_likes_count ON public.likes;
CREATE TRIGGER trg_sync_book_likes_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_book_likes_count();