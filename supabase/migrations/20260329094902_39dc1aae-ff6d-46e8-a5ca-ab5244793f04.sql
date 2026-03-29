
CREATE OR REPLACE FUNCTION public.approve_group_join_request(p_request_id uuid, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_group_id uuid;
BEGIN
  SELECT user_id, group_id INTO v_user_id, v_group_id
  FROM group_join_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  IF get_group_role(p_admin_id, v_group_id) NOT IN ('admin', 'moderator') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE group_join_requests
  SET status = 'approved', reviewed_by = p_admin_id, reviewed_at = NOW()
  WHERE id = p_request_id;

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;
END;
$$;
