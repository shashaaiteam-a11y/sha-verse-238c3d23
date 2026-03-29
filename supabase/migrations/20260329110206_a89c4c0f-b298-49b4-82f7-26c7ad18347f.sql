
-- RPC to approve a pending group post (bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_approve_group_post(p_post_id uuid, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
BEGIN
  -- Get the group_id from the post
  SELECT group_id INTO v_group_id FROM group_posts WHERE id = p_post_id;
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Verify caller is admin/moderator
  IF NOT (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = v_group_id AND user_id = p_admin_id AND role IN ('admin', 'moderator'))
    OR EXISTS (SELECT 1 FROM groups WHERE id = v_group_id AND creator_id = p_admin_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Approve the post
  UPDATE group_posts SET approval_status = 'approved' WHERE id = p_post_id;
END;
$$;

-- RPC to reject (delete) a pending group post (bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_reject_group_post(p_post_id uuid, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT group_id INTO v_group_id FROM group_posts WHERE id = p_post_id;
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = v_group_id AND user_id = p_admin_id AND role IN ('admin', 'moderator'))
    OR EXISTS (SELECT 1 FROM groups WHERE id = v_group_id AND creator_id = p_admin_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Delete the rejected post
  DELETE FROM group_posts WHERE id = p_post_id;
END;
$$;
