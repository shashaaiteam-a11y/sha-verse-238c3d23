-- Ensure viewers can refresh only their own story view row when upsert hits the unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'story_views'
      AND policyname = 'Users can update own story views'
  ) THEN
    CREATE POLICY "Users can update own story views"
    ON public.story_views
    FOR UPDATE
    USING (auth.uid() = viewer_id)
    WITH CHECK (auth.uid() = viewer_id);
  END IF;
END $$;

-- Keep stories.views_count in sync with actual viewer rows
CREATE OR REPLACE FUNCTION public.sync_story_views_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_story_id uuid;
BEGIN
  affected_story_id := COALESCE(NEW.story_id, OLD.story_id);

  IF affected_story_id IS NOT NULL THEN
    UPDATE public.stories
    SET views_count = (
      SELECT COUNT(*)::integer
      FROM public.story_views
      WHERE story_id = affected_story_id
    )
    WHERE id = affected_story_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_story_views_count ON public.story_views;
CREATE TRIGGER trg_sync_story_views_count
AFTER INSERT OR UPDATE OR DELETE ON public.story_views
FOR EACH ROW
EXECUTE FUNCTION public.sync_story_views_count();

-- Backfill existing count values once
UPDATE public.stories s
SET views_count = COALESCE(v.view_count, 0)
FROM (
  SELECT story_id, COUNT(*)::integer AS view_count
  FROM public.story_views
  GROUP BY story_id
) v
WHERE s.id = v.story_id;

UPDATE public.stories s
SET views_count = 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.story_views sv WHERE sv.story_id = s.id
);

-- Ensure realtime is enabled for story viewer/reaction tables without duplicate-publication errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'story_views'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.story_views;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'story_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.story_reactions;
  END IF;
END $$;