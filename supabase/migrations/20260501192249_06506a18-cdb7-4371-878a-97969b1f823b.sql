-- Enable realtime for reader_bookmarks (multi-device bookmark sync)
DO $$
BEGIN
  -- Ensure full row payloads on UPDATE/DELETE so clients can match by id
  EXECUTE 'ALTER TABLE public.reader_bookmarks REPLICA IDENTITY FULL';
EXCEPTION WHEN OTHERS THEN
  -- ignore if already set
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'reader_bookmarks'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.reader_bookmarks';
  END IF;
END $$;