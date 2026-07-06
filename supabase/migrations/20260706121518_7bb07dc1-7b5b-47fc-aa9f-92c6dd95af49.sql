-- Restrict comment visibility so private group post comments are members-only
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by authorized users"
ON public.comments
FOR SELECT
USING (
  -- Group post comments: only visible to members of that group
  (group_post_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.group_posts gp
    WHERE gp.id = comments.group_post_id
      AND public.is_group_member(auth.uid(), gp.group_id)
  ))
  OR
  -- Regular post comments: respect the post's visibility
  (post_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = comments.post_id
      AND (
        COALESCE(p.visibility, 'public') = 'public'
        OR auth.uid() = p.user_id
        OR (p.visibility = 'friends' AND auth.uid() IS NOT NULL AND public.are_friends(auth.uid(), p.user_id))
      )
  ))
  OR
  -- Public content (books, videos, or standalone) stays publicly viewable
  (group_post_id IS NULL AND post_id IS NULL)
);

-- Restrict like/reaction visibility with the same rules
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
CREATE POLICY "Likes are viewable by authorized users"
ON public.likes
FOR SELECT
USING (
  (group_post_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.group_posts gp
    WHERE gp.id = likes.group_post_id
      AND public.is_group_member(auth.uid(), gp.group_id)
  ))
  OR
  (post_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = likes.post_id
      AND (
        COALESCE(p.visibility, 'public') = 'public'
        OR auth.uid() = p.user_id
        OR (p.visibility = 'friends' AND auth.uid() IS NOT NULL AND public.are_friends(auth.uid(), p.user_id))
      )
  ))
  OR
  (group_post_id IS NULL AND post_id IS NULL)
);