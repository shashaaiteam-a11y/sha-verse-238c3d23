
-- 1. video_views table for watch time tracking
CREATE TABLE IF NOT EXISTS public.video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  watch_time int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert views" ON public.video_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read views" ON public.video_views
  FOR SELECT USING (true);

-- 2. earnings table for creator monetization
CREATE TABLE IF NOT EXISTS public.earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  amount_cents int DEFAULT 0,
  earning_type text DEFAULT 'ad_revenue',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own earnings" ON public.earnings
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Trigger: auto-sync video views_count on video_views INSERT
CREATE OR REPLACE FUNCTION public.sync_video_views_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE videos
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_video_views_count
AFTER INSERT ON public.video_views
FOR EACH ROW EXECUTE FUNCTION public.sync_video_views_count();

-- 4. Trigger: auto-sync video likes_count on likes INSERT/DELETE
CREATE OR REPLACE FUNCTION public.sync_video_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE affected_video_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN affected_video_id := OLD.video_id;
  ELSE affected_video_id := NEW.video_id; END IF;
  
  IF affected_video_id IS NOT NULL THEN
    UPDATE videos
    SET likes_count = (SELECT COUNT(*) FROM likes WHERE video_id = affected_video_id)
    WHERE id = affected_video_id;
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_video_likes_count
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.sync_video_likes_count();

-- 5. Trigger: auto-sync video comments_count on comments INSERT/DELETE
CREATE OR REPLACE FUNCTION public.sync_video_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE affected_video_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN affected_video_id := OLD.video_id;
  ELSE affected_video_id := NEW.video_id; END IF;
  
  IF affected_video_id IS NOT NULL THEN
    UPDATE videos
    SET comments_count = (SELECT COUNT(*) FROM comments WHERE video_id = affected_video_id)
    WHERE id = affected_video_id;
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_video_comments_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.sync_video_comments_count();

-- 6. Enable realtime on video_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_views;
