
-- Atomic increment for book views
CREATE OR REPLACE FUNCTION public.increment_book_views(book_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.books SET views_count = COALESCE(views_count, 0) + 1 WHERE id = book_id;
END;
$$;

-- Atomic increment for book likes
CREATE OR REPLACE FUNCTION public.increment_book_likes(book_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.books SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = book_id;
END;
$$;

-- Atomic decrement for book likes
CREATE OR REPLACE FUNCTION public.decrement_book_likes(book_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.books SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = book_id;
END;
$$;

-- Atomic increment for book downloads
CREATE OR REPLACE FUNCTION public.increment_book_downloads(book_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.books SET downloads_count = COALESCE(downloads_count, 0) + 1 WHERE id = book_id;
END;
$$;

-- Atomic increment for book comments count
CREATE OR REPLACE FUNCTION public.increment_book_comment_count(book_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.books SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = book_id;
END;
$$;

-- Atomic decrement for book comments count
CREATE OR REPLACE FUNCTION public.decrement_book_comment_count(book_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.books SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = book_id;
END;
$$;

-- Create trigger for auto-recalculating book rating on book_ratings changes
DROP TRIGGER IF EXISTS trg_recalculate_book_rating ON public.book_ratings;
CREATE TRIGGER trg_recalculate_book_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.book_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_book_rating_avg();

-- Enable realtime for likes table if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
  END IF;
END $$;
