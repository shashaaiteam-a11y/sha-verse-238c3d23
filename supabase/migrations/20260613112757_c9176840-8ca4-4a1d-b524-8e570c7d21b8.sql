DROP POLICY IF EXISTS "Users can view stories from friends" ON public.stories;

CREATE POLICY "Users can view stories from friends"
  ON public.stories FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      COALESCE(privacy, 'friends') <> 'only_me'
      AND are_friends(auth.uid(), user_id)
    )
  );