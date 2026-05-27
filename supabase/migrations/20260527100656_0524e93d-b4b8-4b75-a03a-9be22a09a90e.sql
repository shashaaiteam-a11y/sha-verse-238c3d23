
-- All six functions: keep signature for client compat, but ignore p_admin_id and use auth.uid()

CREATE OR REPLACE FUNCTION public.admin_remove_member(p_group_id uuid, p_target_user_id uuid, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF get_group_role(_caller, p_group_id) NOT IN ('admin', 'moderator') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM group_members WHERE group_id = p_group_id AND user_id = p_target_user_id;
  DELETE FROM group_roles   WHERE group_id = p_group_id AND user_id = p_target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_block_group_user(p_group_id uuid, p_target_user_id uuid, p_admin_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF get_group_role(_caller, p_group_id) NOT IN ('admin', 'moderator') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM group_members WHERE group_id = p_group_id AND user_id = p_target_user_id;
  DELETE FROM group_roles   WHERE group_id = p_group_id AND user_id = p_target_user_id;
  INSERT INTO group_blocked_users (group_id, user_id, blocked_by, reason)
  VALUES (p_group_id, p_target_user_id, _caller, p_reason)
  ON CONFLICT DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_approve_group_post(p_post_id uuid, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group_id uuid;
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT group_id INTO v_group_id FROM group_posts WHERE id = p_post_id;
  IF v_group_id IS NULL THEN RAISE EXCEPTION 'Post not found'; END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = v_group_id AND user_id = _caller AND role IN ('admin','moderator'))
    OR EXISTS (SELECT 1 FROM groups WHERE id = v_group_id AND creator_id = _caller)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE group_posts SET approval_status = 'approved' WHERE id = p_post_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_group_post(p_post_id uuid, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group_id uuid;
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT group_id INTO v_group_id FROM group_posts WHERE id = p_post_id;
  IF v_group_id IS NULL THEN RAISE EXCEPTION 'Post not found'; END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = v_group_id AND user_id = _caller AND role IN ('admin','moderator'))
    OR EXISTS (SELECT 1 FROM groups WHERE id = v_group_id AND creator_id = _caller)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM group_posts WHERE id = p_post_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_member_role(p_group_id uuid, p_target_user_id uuid, p_new_role text, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF get_group_role(_caller, p_group_id) <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_new_role NOT IN ('admin','moderator','member') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  INSERT INTO group_roles (group_id, user_id, role)
  VALUES (p_group_id, p_target_user_id, p_new_role)
  ON CONFLICT (group_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE group_members SET role = p_new_role
  WHERE group_id = p_group_id AND user_id = p_target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_group_join_request(p_request_id uuid, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group_id uuid;
  v_user_id uuid;
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT group_id, user_id INTO v_group_id, v_user_id
  FROM group_join_requests WHERE id = p_request_id AND status = 'pending';
  IF v_group_id IS NULL THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;

  IF get_group_role(_caller, v_group_id) NOT IN ('admin','moderator') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE group_join_requests
    SET status = 'approved', approved_by = _caller, approved_at = now()
    WHERE id = p_request_id;

  INSERT INTO group_members (group_id, user_id, role, status)
  VALUES (v_group_id, v_user_id, 'member', 'active')
  ON CONFLICT DO NOTHING;
END;
$function$;
