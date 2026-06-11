-- ============================================================
-- Security hardening migration (no behavior change for the app)
-- ============================================================

-- 1) MESSAGES: prevent a sender from moving an already-sent message into
--    another conversation (or spoofing sender_id) via a post-send UPDATE.
--    A BEFORE UPDATE trigger pins sender_id and conversation_id to their
--    original values. The app never changes these on update, so this is
--    transparent to all existing flows.
CREATE OR REPLACE FUNCTION public.lock_message_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.sender_id := OLD.sender_id;
  NEW.conversation_id := OLD.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_message_identity_trg ON public.messages;
CREATE TRIGGER lock_message_identity_trg
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.lock_message_identity();

-- 2) FRIENDSHIPS: stop the request sender from self-accepting their own
--    outgoing request. The recipient (friend_id) can still accept; the
--    sender (user_id) may only keep/modify rows that are not 'accepted'
--    (e.g. re-sending a pending request). Existing accept flow is done by
--    the recipient, so this is non-breaking.
DROP POLICY IF EXISTS "Users can update friendships they're part of" ON public.friendships;
CREATE POLICY "Users can update friendships they're part of"
ON public.friendships
FOR UPDATE
USING ((auth.uid() = user_id) OR (auth.uid() = friend_id))
WITH CHECK (
  (auth.uid() = friend_id)
  OR (auth.uid() = user_id AND status <> 'accepted')
);

-- 3) CHANNEL_MONETIZATION: defense-in-depth column-level privileges so
--    financial fields cannot be written by clients even if the protective
--    trigger were ever removed. The app only reads this table from the
--    client (no client writes), so restricting writable columns is safe.
REVOKE UPDATE ON public.channel_monetization FROM authenticated;
REVOKE UPDATE ON public.channel_monetization FROM anon;
GRANT UPDATE (cpm_rate_cents, minimum_payout_cents, payout_method, payout_email, total_watch_hours, updated_at)
  ON public.channel_monetization TO authenticated;

-- 4) BOOKS: keep file_hash confidential (duplicate-detection integrity).
--    Re-apply the column-level SELECT revoke that a later table-level GRANT
--    inadvertently widened. Duplicate checks now go through the
--    check_book_duplicate SECURITY DEFINER RPC, and `select(*)` queries via
--    the Data API simply omit this column for these roles (no breakage).
REVOKE SELECT (file_hash) ON public.books FROM anon;
REVOKE SELECT (file_hash) ON public.books FROM authenticated;

-- 5) NOVACHAT USAGE RPCs: prevent cross-user quota exhaustion / info leak.
--    a) The increment RPC is only ever called by the edge function with the
--       service role, so revoke direct execution from clients.
REVOKE EXECUTE ON FUNCTION public.check_and_increment_nova_usage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_nova_usage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_nova_usage(uuid) FROM authenticated;

--    b) The read RPC stays callable but only for the caller's own id
--       (service role retained for backend use). The client always passes
--       its own user id, so this is transparent.
CREATE OR REPLACE FUNCTION public.get_nova_usage_today(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _daily_limit INTEGER := 10;
  _is_pro BOOLEAN := false;
  _pro_expires TIMESTAMPTZ;
  _used INTEGER := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM _user_id
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(is_pro, false), pro_expires_at
  INTO _is_pro, _pro_expires
  FROM public.novachat_settings
  WHERE user_id = _user_id;

  IF _is_pro AND (_pro_expires IS NULL OR _pro_expires > now()) THEN
    RETURN jsonb_build_object('is_pro', true, 'used', 0, 'limit', -1);
  END IF;

  SELECT COALESCE(message_count, 0) INTO _used
  FROM public.novachat_usage
  WHERE user_id = _user_id AND usage_date = CURRENT_DATE;

  RETURN jsonb_build_object('is_pro', false, 'used', _used, 'limit', _daily_limit);
END;
$function$;