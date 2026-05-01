CREATE OR REPLACE FUNCTION public.get_user_presence_safe(_target_user_id uuid)
RETURNS TABLE(user_id uuid, is_online boolean, last_seen timestamp with time zone, status text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _viewer uuid := auth.uid();
  _target_last_seen text;
  _target_online_vis text;
  _viewer_last_seen text;
  _viewer_online_vis text;
  _is_blocked boolean;
  _are_friends boolean;
BEGIN
  IF _viewer IS NULL THEN
    RETURN;
  END IF;

  -- Self always visible
  IF _viewer = _target_user_id THEN
    RETURN QUERY
      SELECT p.user_id, p.is_online, p.last_seen, p.status
      FROM public.user_presence p
      WHERE p.user_id = _target_user_id;
    RETURN;
  END IF;

  -- Either side blocked -> hide
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks ub
    WHERE (ub.blocker_id = _target_user_id AND ub.blocked_id = _viewer)
       OR (ub.blocker_id = _viewer AND ub.blocked_id = _target_user_id)
  ) INTO _is_blocked;
  IF _is_blocked THEN
    RETURN;
  END IF;

  -- Load target privacy settings (default everyone) — fully qualified to avoid ambiguity
  SELECT COALESCE(us.last_seen_visibility, 'everyone'),
         COALESCE(us.online_status_visibility, 'everyone')
  INTO _target_last_seen, _target_online_vis
  FROM public.user_settings us
  WHERE us.user_id = _target_user_id;

  _target_last_seen := COALESCE(_target_last_seen, 'everyone');
  _target_online_vis := COALESCE(_target_online_vis, 'everyone');

  -- Load viewer privacy settings
  SELECT COALESCE(us.last_seen_visibility, 'everyone'),
         COALESCE(us.online_status_visibility, 'everyone')
  INTO _viewer_last_seen, _viewer_online_vis
  FROM public.user_settings us
  WHERE us.user_id = _viewer;

  _viewer_last_seen := COALESCE(_viewer_last_seen, 'everyone');
  _viewer_online_vis := COALESCE(_viewer_online_vis, 'everyone');

  -- Give-and-take: viewer hides BOTH -> sees nothing
  IF _viewer_last_seen = 'nobody' AND _viewer_online_vis = 'nobody' THEN
    RETURN;
  END IF;

  -- Target hides everything from everyone
  IF _target_last_seen = 'nobody' AND _target_online_vis = 'nobody' THEN
    RETURN;
  END IF;

  SELECT public.are_friends(_viewer, _target_user_id) INTO _are_friends;

  RETURN QUERY
  SELECT
    p.user_id,
    CASE
      WHEN _target_online_vis = 'everyone' THEN p.is_online
      WHEN _target_online_vis = 'contacts' AND _are_friends THEN p.is_online
      ELSE false
    END AS is_online,
    CASE
      WHEN _target_last_seen = 'everyone' THEN p.last_seen
      WHEN _target_last_seen = 'contacts' AND _are_friends THEN p.last_seen
      ELSE NULL
    END AS last_seen,
    p.status
  FROM public.user_presence p
  WHERE p.user_id = _target_user_id;
END;
$function$;