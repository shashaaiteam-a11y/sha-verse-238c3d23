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
    SET status = 'approved', reviewed_by = _caller, reviewed_at = now()
    WHERE id = p_request_id;

  INSERT INTO group_members (group_id, user_id, role, status)
  VALUES (v_group_id, v_user_id, 'member', 'active')
  ON CONFLICT DO NOTHING;
END;
$function$;