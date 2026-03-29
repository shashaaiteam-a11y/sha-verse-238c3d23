
-- 1. Add engagement_score column to videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS engagement_score FLOAT DEFAULT 0;

-- 2. Create user_interests table
CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  score FLOAT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own interests" ON public.user_interests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interests" ON public.user_interests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interests" ON public.user_interests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. Create ad_impressions table
CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  revenue FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ad_impressions" ON public.ad_impressions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert ad_impressions" ON public.ad_impressions
  FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Create trigger function to auto-update engagement_score
CREATE OR REPLACE FUNCTION public.update_engagement_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.engagement_score := (COALESCE(NEW.views_count, 0) * 0.4) + (COALESCE(NEW.likes_count, 0) * 0.3) + (COALESCE(NEW.comments_count, 0) * 0.2);
  RETURN NEW;
END;
$$;

-- 5. Attach trigger to videos table (BEFORE UPDATE so we can modify NEW)
CREATE TRIGGER trigger_update_engagement_score
  BEFORE UPDATE OF views_count, likes_count, comments_count ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_engagement_score();

-- 6. Also attach the 3 missing sync triggers
CREATE TRIGGER trigger_sync_video_likes_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_video_likes_count();

CREATE TRIGGER trigger_sync_video_comments_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_video_comments_count();

CREATE TRIGGER trigger_sync_video_views_count
  AFTER INSERT ON public.video_views
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_video_views_count();

-- 7. Initialize engagement_score for existing videos
UPDATE public.videos SET engagement_score = (COALESCE(views_count, 0) * 0.4) + (COALESCE(likes_count, 0) * 0.3) + (COALESCE(comments_count, 0) * 0.2);

-- 8. Enable realtime for user_interests
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_interests;
