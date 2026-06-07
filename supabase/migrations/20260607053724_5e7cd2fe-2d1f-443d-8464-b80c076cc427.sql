-- Restore SELECT (read) access on public.books that was inadvertently revoked.
-- RLS policy "Books are viewable by everyone" (USING true) remains the access control;
-- the table-level GRANT is required for PostgREST to reach the table at all.
GRANT SELECT ON public.books TO anon;
GRANT SELECT ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;