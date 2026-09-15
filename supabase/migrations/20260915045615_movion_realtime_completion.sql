-- Cumulative, idempotent playback reports. Existing sessions and counters are preserved.
ALTER TABLE public.video_watch_sessions
  ADD COLUMN IF NOT EXISTS accepted_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content_seconds integer;
CREATE INDEX IF NOT EXISTS idx_video_views_viewer_recent
  ON public.video_views (video_id, user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_watch_session(
  _video_id uuid, _session_key text, _total_seconds integer, _position_seconds integer, _content_seconds integer DEFAULT NULL, _viewer_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid();
  sess public.video_watch_sessions%ROWTYPE;
  dur integer;
  short boolean;
  accepted integer;
  delta integer;
  position integer;
  threshold numeric;
  new_view boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to record playback' USING ERRCODE = '42501'; END IF;
  IF _viewer_id IS NOT NULL AND _viewer_id IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'Watch session account changed' USING ERRCODE = '42501';
  END IF;
  IF _session_key IS NULL OR length(_session_key) NOT BETWEEN 8 AND 80
     OR _total_seconds IS NULL OR _total_seconds < 0 THEN
    RAISE EXCEPTION 'Invalid watch report' USING ERRCODE = '22023';
  END IF;

  SELECT v.duration, COALESCE(v.is_short, false) INTO dur, short
  FROM public.videos v JOIN public.channels c ON c.id = v.channel_id
  WHERE v.id = _video_id AND (c.approval_status = 'approved' OR c.user_id = uid OR public.has_role(uid, 'admin'));
  IF NOT FOUND THEN RAISE EXCEPTION 'Video unavailable' USING ERRCODE = '42501'; END IF;

  -- All sessions for this viewer/video share a lock, including simultaneous tabs.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text || ':' || _video_id::text, 0));
  INSERT INTO public.video_watch_sessions (video_id,user_id,session_key,duration_seconds,is_short)
    VALUES (_video_id,uid,_session_key,dur,short) ON CONFLICT (session_key,video_id) DO NOTHING;
  SELECT * INTO sess FROM public.video_watch_sessions
    WHERE video_id = _video_id AND session_key = _session_key FOR UPDATE;
  IF sess.user_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'Session owner mismatch' USING ERRCODE = '42501'; END IF;

  -- Bound accepted cumulative time to elapsed server time. Small jitter allowance only.
  accepted := GREATEST(sess.accepted_seconds, LEAST(_total_seconds,
    GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (clock_timestamp() - sess.created_at)))::integer + 2),
    sess.accepted_seconds + 60));
  delta := accepted - sess.accepted_seconds;
  position := GREATEST(0, COALESCE(_position_seconds,0));
  IF dur > 0 THEN position := LEAST(position,dur); END IF;

  UPDATE public.video_watch_sessions SET accepted_seconds = accepted,
    content_seconds = GREATEST(COALESCE(content_seconds,watched_seconds),
      LEAST(COALESCE(_content_seconds,COALESCE(content_seconds,watched_seconds) + delta), (watched_seconds + delta) * 16)),
    watched_seconds = watched_seconds + delta,
    max_position_seconds = GREATEST(max_position_seconds,position),
    duration_seconds = dur, is_short = short, updated_at = clock_timestamp()
    WHERE id = sess.id RETURNING * INTO sess;

  threshold := CASE WHEN short THEN LEAST(5,GREATEST(2,COALESCE(dur,10) * 0.5))
                    ELSE LEAST(30,GREATEST(5,COALESCE(dur,60) * 0.5)) END;
  IF dur > 0 THEN threshold := LEAST(threshold,dur); END IF;
  IF NOT sess.counted_view AND sess.watched_seconds >= threshold THEN
    IF NOT EXISTS (SELECT 1 FROM public.video_views WHERE video_id = _video_id AND user_id = uid
                   AND created_at > clock_timestamp() - interval '30 minutes') THEN
      INSERT INTO public.video_views(video_id,user_id,watch_time) VALUES (_video_id,uid,sess.watched_seconds);
      new_view := true;
    END IF;
    UPDATE public.video_watch_sessions SET counted_view = true WHERE id = sess.id;
    sess.counted_view := true;
  END IF;

  IF delta > 0 THEN
    INSERT INTO public.watch_history(user_id,video_id,watch_duration_seconds,watch_percentage,watched_at)
      VALUES (uid,_video_id,sess.watched_seconds,
        CASE WHEN dur > 0 THEN LEAST(100,ROUND(COALESCE(sess.content_seconds,sess.watched_seconds)::numeric / dur * 100))::integer ELSE 0 END,
        clock_timestamp()) ON CONFLICT DO NOTHING;
    UPDATE public.watch_history SET
      watch_duration_seconds = GREATEST(COALESCE(watch_duration_seconds,0),sess.watched_seconds),
      watch_percentage = CASE WHEN dur > 0 THEN LEAST(100,ROUND(COALESCE(sess.content_seconds,sess.watched_seconds)::numeric / dur * 100))::integer ELSE 0 END,
      watched_at = clock_timestamp() WHERE user_id = uid AND video_id = _video_id;
  END IF;
  IF delta > 0 OR new_view THEN
    INSERT INTO public.video_analytics(video_id,date,views,watch_time_seconds)
      VALUES (_video_id,(clock_timestamp() AT TIME ZONE 'UTC')::date,new_view::integer,delta)
    ON CONFLICT (video_id,date) DO UPDATE SET
      views = COALESCE(public.video_analytics.views,0) + new_view::integer,
      watch_time_seconds = COALESCE(public.video_analytics.watch_time_seconds,0) + delta;
    UPDATE public.video_analytics SET avg_view_duration_seconds =
      CASE WHEN views > 0 THEN (watch_time_seconds / views)::integer ELSE 0 END
      WHERE video_id = _video_id AND date = (clock_timestamp() AT TIME ZONE 'UTC')::date;
  END IF;
  RETURN jsonb_build_object('accepted_seconds',accepted,'watched_seconds',sess.watched_seconds,
                            'counted_view',sess.counted_view,'new_view',new_view);
END $$;
REVOKE ALL ON FUNCTION public.record_watch_session(uuid,text,integer,integer,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_watch_session(uuid,text,integer,integer,integer,uuid) TO authenticated;

-- Older clients retain their endpoint, but no longer control duration/short status or bypass locking.
CREATE OR REPLACE FUNCTION public.record_watch_progress(
  _video_id uuid,_session_key text,_delta_seconds integer,_position_seconds integer,
  _duration_seconds integer DEFAULT NULL,_is_short boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE total integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to record playback' USING ERRCODE = '42501'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text || ':' || _video_id::text,0));
  SELECT accepted_seconds INTO total FROM public.video_watch_sessions WHERE video_id = _video_id AND session_key = _session_key;
  RETURN public.record_watch_session(_video_id,_session_key,
    COALESCE(total,0) + GREATEST(0,LEAST(COALESCE(_delta_seconds,0),60)),_position_seconds);
END $$;
REVOKE ALL ON FUNCTION public.record_watch_progress(uuid,text,integer,integer,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_watch_progress(uuid,text,integer,integer,integer,boolean) TO authenticated;

-- Counters must be emitted by qualified playback, not arbitrary client inserts.
REVOKE INSERT,UPDATE,DELETE ON public.video_views FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.video_watch_sessions FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.video_analytics FROM anon,authenticated;

-- Use measured watch time for retention. Seeking to the end is not 100% watched.
CREATE OR REPLACE FUNCTION public.get_channel_watch_analytics(_channel_id uuid)
RETURNS TABLE(video_id uuid,title text,is_short boolean,duration_seconds integer,views bigint,
  unique_viewers bigint,watch_seconds bigint,avg_view_duration_seconds numeric,
  avg_percent_viewed numeric,likes bigint,comments bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR (NOT EXISTS (SELECT 1 FROM public.channels c WHERE c.id = _channel_id AND c.user_id = auth.uid())
    AND NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT v.id,v.title,COALESCE(v.is_short,false),v.duration,COALESCE(v.views_count,0)::bigint,
    COALESCE(a.viewers,0),COALESCE(a.seconds,0),COALESCE(a.avg_seconds,0),COALESCE(a.percent,0),
    COALESCE(v.likes_count,0)::bigint,COALESCE(v.comments_count,0)::bigint
    FROM public.videos v LEFT JOIN LATERAL (
      SELECT count(DISTINCT s.user_id) FILTER (WHERE s.watched_seconds > 0) AS viewers,
        sum(s.watched_seconds)::bigint AS seconds,
        avg(s.watched_seconds) FILTER (WHERE s.watched_seconds > 0) AS avg_seconds,
        avg(LEAST(100,COALESCE(s.content_seconds,s.watched_seconds)::numeric / NULLIF(s.duration_seconds,0) * 100))
          FILTER (WHERE s.watched_seconds > 0) AS percent
      FROM public.video_watch_sessions s WHERE s.video_id = v.id
    ) a ON true WHERE v.channel_id = _channel_id ORDER BY v.created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.get_channel_watch_analytics(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_channel_watch_analytics(uuid) TO authenticated;

-- Serialize count snapshots after concurrent likes, comments and subscriptions.
CREATE OR REPLACE FUNCTION public.sync_video_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v uuid;
BEGIN
  v := COALESCE(NEW.video_id, OLD.video_id);
  IF v IS NOT NULL THEN
    PERFORM 1 FROM public.videos WHERE id = v FOR NO KEY UPDATE;
    PERFORM set_config('app.video_metrics_trusted', 'on', true);
    UPDATE public.videos
      SET likes_count = (SELECT count(*) FROM public.likes WHERE video_id = v)
      WHERE id = v;
    PERFORM set_config('app.video_metrics_trusted', 'off', true);
  END IF;
  RETURN NULL;
END; $function$;

CREATE OR REPLACE FUNCTION public.sync_video_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE affected_video_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN affected_video_id := OLD.video_id;
  ELSE affected_video_id := NEW.video_id; END IF;

  IF affected_video_id IS NOT NULL THEN
    PERFORM 1 FROM public.videos WHERE id = affected_video_id FOR NO KEY UPDATE;
    PERFORM set_config('app.video_metrics_trusted', 'on', true);
    UPDATE videos
    SET comments_count = (SELECT COUNT(*) FROM comments WHERE video_id = affected_video_id)
    WHERE id = affected_video_id;
    PERFORM set_config('app.video_metrics_trusted', 'off', true);
  END IF;

  RETURN NULL;
END; $function$;

CREATE OR REPLACE FUNCTION public.sync_channel_subscribers_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE affected_channel_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN affected_channel_id := OLD.channel_id;
  ELSE affected_channel_id := NEW.channel_id; END IF;
  PERFORM 1 FROM public.channels WHERE id = affected_channel_id FOR NO KEY UPDATE;
  PERFORM set_config('app.channel_metrics_trusted', 'on', true);
  UPDATE channels
  SET subscribers_count = (SELECT COUNT(*) FROM subscriptions WHERE channel_id = affected_channel_id)
  WHERE id = affected_channel_id;
  PERFORM set_config('app.channel_metrics_trusted', 'off', true);
  RETURN NULL;
END; $function$;


-- Apply like/dislike as one transaction; retries keep the requested state.
CREATE OR REPLACE FUNCTION public.set_video_reaction(_video_id uuid,_reaction text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Please sign in' USING ERRCODE = '42501'; END IF;
  IF _reaction IS NOT NULL AND _reaction NOT IN ('like','dislike') THEN
    RAISE EXCEPTION 'Invalid reaction' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.videos v JOIN public.channels c ON c.id=v.channel_id
    WHERE v.id=_video_id AND (c.approval_status='approved' OR c.user_id=uid OR public.has_role(uid,'admin'))) THEN
    RAISE EXCEPTION 'Video unavailable' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('reaction:' || uid::text || ':' || _video_id::text,0));
  IF _reaction IS DISTINCT FROM 'like' THEN DELETE FROM public.likes WHERE user_id=uid AND video_id=_video_id; END IF;
  IF _reaction IS DISTINCT FROM 'dislike' THEN DELETE FROM public.video_dislikes WHERE user_id=uid AND video_id=_video_id; END IF;
  IF _reaction='like' THEN INSERT INTO public.likes(user_id,video_id) VALUES(uid,_video_id) ON CONFLICT DO NOTHING; END IF;
  IF _reaction='dislike' THEN INSERT INTO public.video_dislikes(user_id,video_id) VALUES(uid,_video_id) ON CONFLICT DO NOTHING; END IF;
  RETURN jsonb_build_object('liked',COALESCE(_reaction='like',false),'disliked',COALESCE(_reaction='dislike',false));
END $$;
REVOKE ALL ON FUNCTION public.set_video_reaction(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_video_reaction(uuid,text) TO authenticated;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='video_dislikes'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.video_dislikes; END IF;
END $$;
