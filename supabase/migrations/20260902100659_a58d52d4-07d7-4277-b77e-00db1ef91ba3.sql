CREATE OR REPLACE FUNCTION public.increment_creator_badge_motions(_channel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = _channel_id AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not the channel owner';
  END IF;

  UPDATE public.creator_badges
     SET total_motions = (
           SELECT count(*) FROM public.videos v WHERE v.channel_id = _channel_id
         ),
         updated_at = now()
   WHERE channel_id = _channel_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_creator_badge_motions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_creator_badge_motions(uuid) TO authenticated;