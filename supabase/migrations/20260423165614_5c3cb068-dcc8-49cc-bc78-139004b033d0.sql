-- 1. Add missing columns to user_presence
ALTER TABLE public.user_presence
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;

-- Backfill is_online from existing status column
UPDATE public.user_presence SET is_online = (status = 'online') WHERE is_online IS DISTINCT FROM (status = 'online');

-- 2. Add online_status_visibility to user_settings (separate control)
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS online_status_visibility text DEFAULT 'everyone';

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_online_status_visibility_check;
ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_online_status_visibility_check
  CHECK (online_status_visibility IN ('everyone','contacts','nobody'));

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_last_seen_visibility_check;
ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_last_seen_visibility_check
  CHECK (last_seen_visibility IN ('everyone','contacts','nobody'));

-- 3. Tighten user_presence RLS: only the user can write their own row.
DROP POLICY IF EXISTS "Users can update own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users can insert own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users can upsert own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users can view all presence" ON public.user_presence;

CREATE POLICY "presence_select_all"
  ON public.user_presence FOR SELECT
  USING (true);

CREATE POLICY "presence_insert_own"
  ON public.user_presence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "presence_update_own"
  ON public.user_presence FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Privacy-enforcing RPC: returns presence ONLY if viewer is allowed to see it,
-- and respects the "Give and Take" rule (if viewer hides their own status, they
-- don't get to see others' either).
CREATE OR REPLACE FUNCTION public.get_user_presence_safe(_target_user_id uuid)
RETURNS TABLE(user_id uuid, is_online boolean, last_seen timestamptz, status text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = _target_user_id AND blocked_id = _viewer)
       OR (blocker_id = _viewer AND blocked_id = _target_user_id)
  ) INTO _is_blocked;
  IF _is_blocked THEN
    RETURN;
  END IF;

  -- Load privacy settings (default everyone)
  SELECT COALESCE(last_seen_visibility, 'everyone'),
         COALESCE(online_status_visibility, 'everyone')
  INTO _target_last_seen, _target_online_vis
  FROM public.user_settings
  WHERE user_id = _target_user_id;

  _target_last_seen := COALESCE(_target_last_seen, 'everyone');
  _target_online_vis := COALESCE(_target_online_vis, 'everyone');

  SELECT COALESCE(last_seen_visibility, 'everyone'),
         COALESCE(online_status_visibility, 'everyone')
  INTO _viewer_last_seen, _viewer_online_vis
  FROM public.user_settings
  WHERE user_id = _viewer;

  _viewer_last_seen := COALESCE(_viewer_last_seen, 'everyone');
  _viewer_online_vis := COALESCE(_viewer_online_vis, 'everyone');

  -- Give-and-take: if viewer hides BOTH, they can't see anything
  IF _viewer_last_seen = 'nobody' AND _viewer_online_vis = 'nobody' THEN
    RETURN;
  END IF;

  -- Target hides everything from everyone
  IF _target_last_seen = 'nobody' AND _target_online_vis = 'nobody' THEN
    RETURN;
  END IF;

  SELECT public.are_friends(_viewer, _target_user_id) INTO _are_friends;

  -- Determine what to expose
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
$$;

GRANT EXECUTE ON FUNCTION public.get_user_presence_safe(uuid) TO authenticated;

-- 5. Helper: ensure a user_settings row exists for a user (used by UI on first save)
CREATE OR REPLACE FUNCTION public.upsert_my_chat_privacy(
  _last_seen text DEFAULT NULL,
  _online_status text DEFAULT NULL,
  _read_receipts boolean DEFAULT NULL
)
RETURNS public.user_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.user_settings;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF _last_seen IS NOT NULL AND _last_seen NOT IN ('everyone','contacts','nobody') THEN
    RAISE EXCEPTION 'Invalid last_seen visibility';
  END IF;
  IF _online_status IS NOT NULL AND _online_status NOT IN ('everyone','contacts','nobody') THEN
    RAISE EXCEPTION 'Invalid online_status visibility';
  END IF;

  INSERT INTO public.user_settings (user_id, last_seen_visibility, online_status_visibility, read_receipts_enabled)
  VALUES (
    _uid,
    COALESCE(_last_seen, 'everyone'),
    COALESCE(_online_status, 'everyone'),
    COALESCE(_read_receipts, true)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_seen_visibility = COALESCE(_last_seen, public.user_settings.last_seen_visibility),
    online_status_visibility = COALESCE(_online_status, public.user_settings.online_status_visibility),
    read_receipts_enabled = COALESCE(_read_receipts, public.user_settings.read_receipts_enabled),
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_my_chat_privacy(text, text, boolean) TO authenticated;