
-- Add rich media columns to group_posts
ALTER TABLE public.group_posts
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'text';

-- Allow content to be optional (for media-only posts)
ALTER TABLE public.group_posts
  ALTER COLUMN content DROP NOT NULL;
ALTER TABLE public.group_posts
  ALTER COLUMN content SET DEFAULT '';

-- Enable realtime for group_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_posts;
  END IF;
END $$;
