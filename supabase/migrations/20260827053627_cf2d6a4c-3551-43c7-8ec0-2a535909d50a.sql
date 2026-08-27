-- 1. Restore EXECUTE for anon on read-only membership helpers used by RLS
--    policies whose role list includes anon. Without this, anon requests fail
--    with "permission denied for function ..." instead of returning no rows.
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_group_role(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_group_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_page_role(uuid, uuid, page_role[]) TO anon;
GRANT EXECUTE ON FUNCTION public.is_page_admin(uuid, uuid) TO anon;

-- 2. has_role stays revoked from anon (admin enumeration risk). The four
--    policies that call it while still listing anon can never pass for a
--    signed-out user anyway, so scope them to authenticated. Same effective
--    access, no anon EXECUTE required.
DROP POLICY IF EXISTS "Admins can view all deletion requests" ON public.book_deletion_requests;
CREATE POLICY "Admins can view all deletion requests"
  ON public.book_deletion_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update deletion requests" ON public.book_deletion_requests;
CREATE POLICY "Admins can update deletion requests"
  ON public.book_deletion_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Fingerprints viewable by owner or admin" ON public.content_fingerprints;
CREATE POLICY "Fingerprints viewable by owner or admin"
  ON public.content_fingerprints FOR SELECT TO authenticated
  USING ((auth.uid() = owner_id) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Group posts are viewable by group members" ON public.group_posts;
CREATE POLICY "Group posts are viewable by group members"
  ON public.group_posts FOR SELECT TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_posts.group_id
        AND group_members.user_id = auth.uid()
    ))
    AND (
      COALESCE(approval_status, 'approved') = 'approved'
      OR user_id = auth.uid()
      OR get_group_role(auth.uid(), group_id) = ANY (ARRAY['admin', 'moderator'])
      OR (EXISTS (
        SELECT 1 FROM public.groups
        WHERE groups.id = group_posts.group_id AND groups.creator_id = auth.uid()
      ))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );