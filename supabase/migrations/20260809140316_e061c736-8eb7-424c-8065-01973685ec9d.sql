-- Guard table for de-duplicating view/download counting
CREATE TABLE IF NOT EXISTS public.book_counter_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('view','download')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS book_counter_events_lookup
  ON public.book_counter_events (user_id, book_id, kind, created_at DESC);

GRANT SELECT ON public.book_counter_events TO authenticated;
GRANT ALL ON public.book_counter_events TO service_role;

ALTER TABLE public.book_counter_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "book_counter_events_select_own" ON public.book_counter_events;
CREATE POLICY "book_counter_events_select_own"
  ON public.book_counter_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Likes: recompute from the real likes table, ignore any client-supplied delta
CREATE OR REPLACE FUNCTION public.increment_book_likes(book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.books b
     SET likes_count = (SELECT count(*) FROM public.likes l WHERE l.book_id = b.id)
   WHERE b.id = increment_book_likes.book_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_book_likes(book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.books b
     SET likes_count = (SELECT count(*) FROM public.likes l WHERE l.book_id = b.id)
   WHERE b.id = decrement_book_likes.book_id;
END;
$function$;

-- Views: auth required, book must be visible, 30 minute cooldown per user/book
CREATE OR REPLACE FUNCTION public.increment_book_views(book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
  _exists boolean;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT true INTO _exists FROM public.books b WHERE b.id = increment_book_views.book_id;
  IF _exists IS NOT TRUE THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM public.book_counter_events e
    WHERE e.user_id = _caller
      AND e.book_id = increment_book_views.book_id
      AND e.kind = 'view'
      AND e.created_at > now() - interval '30 minutes'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.book_counter_events (user_id, book_id, kind)
  VALUES (_caller, increment_book_views.book_id, 'view');

  UPDATE public.books b
     SET views_count = COALESCE(b.views_count, 0) + 1
   WHERE b.id = increment_book_views.book_id;
END;
$function$;

-- Downloads: auth required, once per user/book per 24h
CREATE OR REPLACE FUNCTION public.increment_book_downloads(book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
  _exists boolean;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT true INTO _exists FROM public.books b WHERE b.id = increment_book_downloads.book_id;
  IF _exists IS NOT TRUE THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM public.book_counter_events e
    WHERE e.user_id = _caller
      AND e.book_id = increment_book_downloads.book_id
      AND e.kind = 'download'
      AND e.created_at > now() - interval '24 hours'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.book_counter_events (user_id, book_id, kind)
  VALUES (_caller, increment_book_downloads.book_id, 'download');

  UPDATE public.books b
     SET downloads_count = COALESCE(b.downloads_count, 0) + 1
   WHERE b.id = increment_book_downloads.book_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.increment_book_views(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_book_downloads(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_book_likes(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrement_book_likes(uuid) FROM anon;