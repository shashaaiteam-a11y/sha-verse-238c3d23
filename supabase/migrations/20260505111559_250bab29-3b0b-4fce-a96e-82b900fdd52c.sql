DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'story_views'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.story_views';
  END IF;
END $$;

ALTER TABLE public.story_views REPLICA IDENTITY FULL;
ALTER TABLE public.story_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.story_replies REPLICA IDENTITY FULL;