CREATE OR REPLACE FUNCTION public.record_story_view(p_story_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.story_views (story_id, viewer_id, viewed_at)
  VALUES (p_story_id, v_user_id, now())
  ON CONFLICT (story_id, viewer_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.record_story_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_story_view(uuid) TO authenticated;