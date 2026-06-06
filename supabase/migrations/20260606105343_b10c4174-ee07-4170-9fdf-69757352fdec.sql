-- Hide books.file_hash from the API while keeping every other column readable.
-- (select('*') will simply return the granted subset, excluding file_hash.)
REVOKE SELECT ON public.books FROM anon, authenticated;

GRANT SELECT (
  id, channel_id, title, author, description, cover_url, book_url, pages,
  views_count, likes_count, comments_count, created_at, category, language,
  tags, visibility, age_restriction, comments_enabled, ratings_enabled,
  downloads_count, rating_avg, rating_count
) ON public.books TO anon, authenticated;

-- Secure pre-flight duplicate check (replaces the client-side file_hash filter,
-- which no longer has column access). Returns the strongest match (file first).
CREATE OR REPLACE FUNCTION public.check_book_duplicate(
  _file_hash text DEFAULT NULL,
  _title text DEFAULT NULL,
  _author text DEFAULT NULL
)
RETURNS TABLE(id uuid, title text, author text, match_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  (
    SELECT b.id, b.title, b.author, 'file'::text AS match_type
    FROM public.books b
    WHERE _file_hash IS NOT NULL AND b.file_hash = _file_hash
    LIMIT 1
  )
  UNION ALL
  (
    SELECT b.id, b.title, b.author, 'metadata'::text AS match_type
    FROM public.books b
    WHERE _title IS NOT NULL AND _author IS NOT NULL
      AND b.title ILIKE _title AND b.author ILIKE _author
    LIMIT 1
  )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.check_book_duplicate(text, text, text) TO authenticated;
