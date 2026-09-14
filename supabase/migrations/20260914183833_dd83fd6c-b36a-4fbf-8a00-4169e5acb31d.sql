-- 1) Remove duplicate view trigger (was double-counting views)
DROP TRIGGER IF EXISTS trigger_sync_video_views_count ON public.video_views;

-- 2) Allow trusted internal metric syncing on videos
CREATE OR REPLACE FUNCTION public.protect_video_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.video_metrics_trusted', true) = 'on'
     OR current_setting('role', true) = 'service_role'
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.likes_count := OLD.likes_count;
  NEW.comments_count := OLD.comments_count;
  NEW.views_count := OLD.views_count;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.sync_video_views_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.video_metrics_trusted', 'on', true);
  UPDATE videos
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = NEW.video_id;
  PERFORM set_config('app.video_metrics_trusted', 'off', true);
  RETURN NEW;
END; $function$;

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
  PERFORM set_config('app.channel_metrics_trusted', 'on', true);
  UPDATE channels
  SET subscribers_count = (SELECT COUNT(*) FROM subscriptions WHERE channel_id = affected_channel_id)
  WHERE id = affected_channel_id;
  PERFORM set_config('app.channel_metrics_trusted', 'off', true);
  RETURN NULL;
END; $function$;

-- 3) Raw watch sessions (analytics source of truth)
CREATE TABLE IF NOT EXISTS public.video_watch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid,
  session_key text NOT NULL,
  watched_seconds integer NOT NULL DEFAULT 0,
  max_position_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  is_short boolean NOT NULL DEFAULT false,
  counted_view boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_key, video_id)
);

CREATE INDEX IF NOT EXISTS idx_vws_video_created ON public.video_watch_sessions (video_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vws_user_video ON public.video_watch_sessions (user_id, video_id);

GRANT SELECT ON public.video_watch_sessions TO authenticated;
GRANT ALL ON public.video_watch_sessions TO service_role;

ALTER TABLE public.video_watch_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Viewer or channel owner can read watch sessions" ON public.video_watch_sessions;
CREATE POLICY "Viewer or channel owner can read watch sessions"
ON public.video_watch_sessions FOR SELECT TO authenticated
USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.channels c ON c.id = v.channel_id
    WHERE v.id = video_watch_sessions.video_id AND c.user_id = auth.uid()
  )
);

-- unique daily analytics row per video
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_analytics_video_date
  ON public.video_analytics (video_id, date);

-- 4) Server-validated watch progress + view counting
CREATE OR REPLACE FUNCTION public.record_watch_progress(
  _video_id uuid,
  _session_key text,
  _delta_seconds integer,
  _position_seconds integer,
  _duration_seconds integer DEFAULT NULL,
  _is_short boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  delta integer;
  sess public.video_watch_sessions%ROWTYPE;
  dur integer;
  threshold numeric;
  qualifies boolean := false;
  recent_view boolean := false;
  new_view boolean := false;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('counted_view', false, 'watched_seconds', 0);
  END IF;
  IF _session_key IS NULL OR length(_session_key) < 8 OR length(_session_key) > 80 THEN
    RAISE EXCEPTION 'invalid session key';
  END IF;

  -- clamp: never trust the client with big jumps
  delta := GREATEST(0, LEAST(COALESCE(_delta_seconds, 0), 60));

  dur := NULLIF(GREATEST(COALESCE(_duration_seconds, 0), 0), 0);
  IF dur IS NULL THEN
    SELECT duration INTO dur FROM public.videos WHERE id = _video_id;
  END IF;

  INSERT INTO public.video_watch_sessions
    (video_id, user_id, session_key, watched_seconds, max_position_seconds, duration_seconds, is_short)
  VALUES
    (_video_id, uid, _session_key, delta, GREATEST(COALESCE(_position_seconds, 0), 0), dur, COALESCE(_is_short, false))
  ON CONFLICT (session_key, video_id) DO UPDATE
    SET watched_seconds = public.video_watch_sessions.watched_seconds + delta,
        max_position_seconds = GREATEST(public.video_watch_sessions.max_position_seconds, GREATEST(COALESCE(_position_seconds, 0), 0)),
        duration_seconds = COALESCE(public.video_watch_sessions.duration_seconds, dur),
        updated_at = now()
  RETURNING * INTO sess;

  IF sess.user_id IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'session does not belong to this user';
  END IF;

  -- view qualification
  IF NOT sess.counted_view THEN
    IF COALESCE(_is_short, false) THEN
      threshold := LEAST(5, GREATEST(2, COALESCE(dur, 10) * 0.5));
    ELSE
      threshold := LEAST(30, GREATEST(5, COALESCE(dur, 60) * 0.5));
    END IF;
    qualifies := sess.watched_seconds >= threshold;

    IF qualifies THEN
      SELECT EXISTS (
        SELECT 1 FROM public.video_views
        WHERE video_id = _video_id AND user_id = uid
          AND created_at > now() - interval '30 minutes'
      ) INTO recent_view;

      IF NOT recent_view THEN
        INSERT INTO public.video_views (video_id, user_id, watch_time)
        VALUES (_video_id, uid, sess.watched_seconds);
        new_view := true;
      END IF;

      UPDATE public.video_watch_sessions SET counted_view = true WHERE id = sess.id;
      sess.counted_view := true;
    END IF;
  END IF;

  -- watch history (per user, latest state)
  IF delta > 0 OR new_view THEN
    INSERT INTO public.watch_history (user_id, video_id, watch_duration_seconds, watch_percentage, watched_at)
    VALUES (
      uid, _video_id, sess.watched_seconds,
      CASE WHEN dur > 0 THEN LEAST(100, ROUND((sess.max_position_seconds::numeric / dur) * 100))::int ELSE NULL END,
      now()
    )
    ON CONFLICT DO NOTHING;

    UPDATE public.watch_history
      SET watch_duration_seconds = GREATEST(COALESCE(watch_duration_seconds, 0), sess.watched_seconds),
          watch_percentage = CASE WHEN dur > 0
            THEN GREATEST(COALESCE(watch_percentage, 0), LEAST(100, ROUND((sess.max_position_seconds::numeric / dur) * 100))::int)
            ELSE watch_percentage END,
          watched_at = now()
      WHERE user_id = uid AND video_id = _video_id;
  END IF;

  -- daily aggregate
  IF delta > 0 OR new_view THEN
    INSERT INTO public.video_analytics (video_id, date, views, watch_time_seconds)
    VALUES (_video_id, current_date, CASE WHEN new_view THEN 1 ELSE 0 END, delta)
    ON CONFLICT (video_id, date) DO UPDATE
      SET views = public.video_analytics.views + CASE WHEN new_view THEN 1 ELSE 0 END,
          watch_time_seconds = public.video_analytics.watch_time_seconds + delta;

    UPDATE public.video_analytics
      SET avg_view_duration_seconds = CASE WHEN views > 0 THEN (watch_time_seconds / views)::int ELSE 0 END
      WHERE video_id = _video_id AND date = current_date;
  END IF;

  RETURN jsonb_build_object(
    'counted_view', sess.counted_view,
    'new_view', new_view,
    'watched_seconds', sess.watched_seconds
  );
END; $function$;

REVOKE ALL ON FUNCTION public.record_watch_progress(uuid, text, integer, integer, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_watch_progress(uuid, text, integer, integer, integer, boolean) TO authenticated;

-- 5) Channel analytics for Creator Studio (owner only)
CREATE OR REPLACE FUNCTION public.get_channel_watch_analytics(_channel_id uuid)
RETURNS TABLE (
  video_id uuid,
  title text,
  is_short boolean,
  duration_seconds integer,
  views bigint,
  unique_viewers bigint,
  watch_seconds bigint,
  avg_view_duration_seconds numeric,
  avg_percent_viewed numeric,
  likes bigint,
  comments bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.channels c WHERE c.id = _channel_id AND c.user_id = auth.uid()
  ) AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    v.id,
    v.title,
    COALESCE(v.is_short, false),
    v.duration,
    COALESCE(v.views_count, 0)::bigint,
    COALESCE((SELECT count(DISTINCT s.user_id) FROM public.video_watch_sessions s WHERE s.video_id = v.id), 0)::bigint,
    COALESCE((SELECT sum(s.watched_seconds) FROM public.video_watch_sessions s WHERE s.video_id = v.id), 0)::bigint,
    COALESCE((SELECT avg(s.watched_seconds) FROM public.video_watch_sessions s WHERE s.video_id = v.id AND s.counted_view), 0)::numeric,
    COALESCE((SELECT avg(LEAST(100, (s.max_position_seconds::numeric / NULLIF(s.duration_seconds, 0)) * 100))
              FROM public.video_watch_sessions s
              WHERE s.video_id = v.id AND COALESCE(s.duration_seconds, 0) > 0), 0)::numeric,
    COALESCE(v.likes_count, 0)::bigint,
    COALESCE(v.comments_count, 0)::bigint
  FROM public.videos v
  WHERE v.channel_id = _channel_id
  ORDER BY v.created_at DESC;
END; $function$;

REVOKE ALL ON FUNCTION public.get_channel_watch_analytics(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_channel_watch_analytics(uuid) TO authenticated;

-- 6) Realtime for analytics
ALTER TABLE public.video_analytics REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'video_analytics'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_analytics;
  END IF;
END $$;