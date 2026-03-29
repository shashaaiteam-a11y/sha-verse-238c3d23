
-- RPC: Admin updates member role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_update_member_role(
  p_group_id uuid,
  p_target_user_id uuid,
  p_new_role text,
  p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is admin
  IF get_group_role(p_admin_id, p_group_id) NOT IN ('admin') THEN
    RAISE EXCEPTION 'Not authorized: only admins can change roles';
  END IF;

  -- Update group_members role
  UPDATE group_members
  SET role = p_new_role
  WHERE group_id = p_group_id AND user_id = p_target_user_id;

  -- Sync group_roles table
  IF p_new_role IN ('admin', 'moderator') THEN
    INSERT INTO group_roles (group_id, user_id, role, assigned_by)
    VALUES (p_group_id, p_target_user_id, p_new_role, p_admin_id)
    ON CONFLICT (group_id, user_id) DO UPDATE SET role = p_new_role, assigned_by = p_admin_id;
  ELSE
    DELETE FROM group_roles WHERE group_id = p_group_id AND user_id = p_target_user_id;
  END IF;
END;
$$;

-- RPC: Admin removes member (bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_remove_member(
  p_group_id uuid,
  p_target_user_id uuid,
  p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is admin or moderator
  IF get_group_role(p_admin_id, p_group_id) NOT IN ('admin', 'moderator') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Remove from group_members
  DELETE FROM group_members WHERE group_id = p_group_id AND user_id = p_target_user_id;
  
  -- Also remove from group_roles
  DELETE FROM group_roles WHERE group_id = p_group_id AND user_id = p_target_user_id;
END;
$$;

-- RPC: Admin blocks user (remove + block, bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_block_group_user(
  p_group_id uuid,
  p_target_user_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is admin or moderator
  IF get_group_role(p_admin_id, p_group_id) NOT IN ('admin', 'moderator') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Remove from group_members
  DELETE FROM group_members WHERE group_id = p_group_id AND user_id = p_target_user_id;

  -- Remove from group_roles
  DELETE FROM group_roles WHERE group_id = p_group_id AND user_id = p_target_user_id;

  -- Add to blocked users
  INSERT INTO group_blocked_users (group_id, user_id, blocked_by, reason)
  VALUES (p_group_id, p_target_user_id, p_admin_id, p_reason)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Check unique constraint exists on group_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'group_roles_group_id_user_id_key'
  ) THEN
    BEGIN
      ALTER TABLE group_roles ADD CONSTRAINT group_roles_group_id_user_id_key UNIQUE (group_id, user_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
