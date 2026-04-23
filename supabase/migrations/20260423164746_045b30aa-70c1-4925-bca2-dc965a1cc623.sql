-- Mark a single conversation as read for the current user
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(_conversation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _updated_count integer := 0;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is a member of this conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this conversation';
  END IF;

  -- Mark all incoming messages (not from current user) as read + delivered
  WITH updated AS (
    UPDATE public.messages
    SET is_read = true,
        is_delivered = true
    WHERE conversation_id = _conversation_id
      AND sender_id <> _user_id
      AND (is_read = false OR is_read IS NULL)
    RETURNING id
  )
  SELECT count(*)::int INTO _updated_count FROM updated;

  -- Update last_read_at cursor on conversation membership
  UPDATE public.conversation_members
  SET last_read_at = now()
  WHERE conversation_id = _conversation_id
    AND user_id = _user_id;

  RETURN _updated_count;
END;
$$;

-- Mark all of the current user's conversations as read
CREATE OR REPLACE FUNCTION public.mark_all_conversations_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _updated_count integer := 0;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH updated AS (
    UPDATE public.messages m
    SET is_read = true,
        is_delivered = true
    WHERE m.sender_id <> _user_id
      AND (m.is_read = false OR m.is_read IS NULL)
      AND m.conversation_id IN (
        SELECT cm.conversation_id
        FROM public.conversation_members cm
        WHERE cm.user_id = _user_id
      )
    RETURNING m.id
  )
  SELECT count(*)::int INTO _updated_count FROM updated;

  UPDATE public.conversation_members
  SET last_read_at = now()
  WHERE user_id = _user_id;

  RETURN _updated_count;
END;
$$;

-- Get unread counts per conversation for the current user
CREATE OR REPLACE FUNCTION public.get_conversation_unread_counts()
RETURNS TABLE(conversation_id uuid, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT m.conversation_id, count(*)::bigint AS unread_count
  FROM public.messages m
  WHERE m.sender_id <> auth.uid()
    AND (m.is_read = false OR m.is_read IS NULL)
    AND m.conversation_id IN (
      SELECT cm.conversation_id
      FROM public.conversation_members cm
      WHERE cm.user_id = auth.uid()
    )
  GROUP BY m.conversation_id;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_as_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_conversations_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_unread_counts() TO authenticated;