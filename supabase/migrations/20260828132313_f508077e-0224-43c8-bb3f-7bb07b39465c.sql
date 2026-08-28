-- Allow trusted server-side counter functions to update book metrics,
-- while still blocking direct client updates to metric columns.

CREATE OR REPLACE FUNCTION public.protect_book_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.book_metrics_trusted', true) = 'on'
     OR current_setting('role', true) = 'service_role'
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.likes_count := OLD.likes_count;
  NEW.comments_count := OLD.comments_count;
  NEW.views_count := OLD.views_count;
  NEW.downloads_count := OLD.downloads_count;
  NEW.rating_avg := OLD.rating_avg;
  NEW.rating_count := OLD.rating_count;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.increment_book_views(book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _ins int;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  INSERT INTO public.book_counter_events (user_id, book_id, kind)
  VALUES (_uid, book_id, 'view') ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS _ins = ROW_COUNT;
  IF _ins > 0 THEN
    PERFORM set_config('app.book_metrics_trusted', 'on', true);
    UPDATE public.books SET views_count = COALESCE(views_count,0) + 1 WHERE id = book_id;
    PERFORM set_config('app.book_metrics_trusted', 'off', true);
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.increment_book_downloads(book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _ins int;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  INSERT INTO public.book_counter_events (user_id, book_id, kind)
  VALUES (_uid, book_id, 'download') ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS _ins = ROW_COUNT;
  IF _ins > 0 THEN
    PERFORM set_config('app.book_metrics_trusted', 'on', true);
    UPDATE public.books SET downloads_count = COALESCE(downloads_count,0) + 1 WHERE id = book_id;
    PERFORM set_config('app.book_metrics_trusted', 'off', true);
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.increment_book_likes(book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM set_config('app.book_metrics_trusted', 'on', true);
  UPDATE public.books b
     SET likes_count = (SELECT count(*) FROM public.likes l WHERE l.book_id = b.id)
   WHERE b.id = increment_book_likes.book_id;
  PERFORM set_config('app.book_metrics_trusted', 'off', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.decrement_book_likes(book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM set_config('app.book_metrics_trusted', 'on', true);
  UPDATE public.books b
     SET likes_count = (SELECT count(*) FROM public.likes l WHERE l.book_id = b.id)
   WHERE b.id = decrement_book_likes.book_id;
  PERFORM set_config('app.book_metrics_trusted', 'off', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.sync_book_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE b uuid;
BEGIN
  b := COALESCE(NEW.book_id, OLD.book_id);
  IF b IS NOT NULL THEN
    PERFORM set_config('app.book_metrics_trusted', 'on', true);
    UPDATE public.books
      SET likes_count = (SELECT count(*) FROM public.likes WHERE book_id = b)
      WHERE id = b;
    PERFORM set_config('app.book_metrics_trusted', 'off', true);
  END IF;
  RETURN NULL;
END; $function$;

CREATE OR REPLACE FUNCTION public.sync_book_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE affected_book_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN affected_book_id := OLD.book_id;
  ELSE affected_book_id := NEW.book_id; END IF;
  PERFORM set_config('app.book_metrics_trusted', 'on', true);
  UPDATE public.books SET comments_count = (
    SELECT COUNT(*) FROM public.book_comments WHERE book_id = affected_book_id
  ) WHERE id = affected_book_id;
  PERFORM set_config('app.book_metrics_trusted', 'off', true);
  RETURN NULL;
END; $function$;

CREATE OR REPLACE FUNCTION public.increment_book_comment_count(p_book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.book_metrics_trusted', 'on', true);
  UPDATE public.books SET comments_count = COALESCE(comments_count,0) + 1 WHERE id = p_book_id;
  PERFORM set_config('app.book_metrics_trusted', 'off', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.decrement_book_comment_count(p_book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.book_metrics_trusted', 'on', true);
  UPDATE public.books SET comments_count = GREATEST(0, COALESCE(comments_count,0) - 1) WHERE id = p_book_id;
  PERFORM set_config('app.book_metrics_trusted', 'off', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.update_book_rating_avg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.book_metrics_trusted', 'on', true);
  UPDATE public.books
  SET
    rating_avg = COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM public.book_ratings WHERE book_id = COALESCE(NEW.book_id, OLD.book_id)), 0),
    rating_count = (SELECT COUNT(*) FROM public.book_ratings WHERE book_id = COALESCE(NEW.book_id, OLD.book_id))
  WHERE id = COALESCE(NEW.book_id, OLD.book_id);
  PERFORM set_config('app.book_metrics_trusted', 'off', true);
  RETURN COALESCE(NEW, OLD);
END; $function$;
