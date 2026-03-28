
-- 1. Add trending_score column
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS trending_score FLOAT DEFAULT 0;

-- 2. Create function to calculate trending scores based on recent activity
CREATE OR REPLACE FUNCTION public.calculate_trending_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE videos v
  SET trending_score = (
    COALESCE((SELECT COUNT(*) FROM video_views vv WHERE vv.video_id = v.id AND vv.created_at > NOW() - INTERVAL '1 hour'), 0) * 0.5
  ) + (
    COALESCE((SELECT COUNT(*) FROM video_views vv WHERE vv.video_id = v.id AND vv.created_at > NOW() - INTERVAL '24 hours'), 0) * 0.3
  ) + (
    COALESCE((SELECT COUNT(*) FROM likes l WHERE l.video_id = v.id AND l.created_at > NOW() - INTERVAL '24 hours'), 0) * 0.2
  );
END;
$$;

-- 3. Run initial calculation
SELECT public.calculate_trending_scores();
