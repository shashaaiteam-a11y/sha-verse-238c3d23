ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS request_status text NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS requested_by uuid;

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_request_status_check;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_request_status_check
  CHECK (request_status IN ('pending', 'accepted'));

-- Members of a pending request must still be insertable by the requester.
DROP POLICY IF EXISTS conversation_members_insert ON public.conversation_members;
CREATE POLICY conversation_members_insert
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_members.conversation_id
      AND c.created_by = auth.uid()
  )
  AND (
    user_id = auth.uid()
    OR public.are_friends(auth.uid(), user_id)
    OR NOT public.is_user_blocked(user_id, auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.respond_message_request(_conversation_id uuid, _accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT requested_by INTO v_requester
    FROM public.conversations
   WHERE id = _conversation_id AND request_status = 'pending';

  IF v_requester IS NULL THEN
    RAISE EXCEPTION 'Message request not found';
  END IF;

  IF v_requester = auth.uid()
     OR NOT public.is_conversation_member(auth.uid(), _conversation_id) THEN
    RAISE EXCEPTION 'Not allowed to respond to this request';
  END IF;

  IF _accept THEN
    UPDATE public.conversations
       SET request_status = 'accepted', updated_at = now()
     WHERE id = _conversation_id;
  ELSE
    DELETE FROM public.conversations WHERE id = _conversation_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_message_request(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_message_request(uuid, boolean) TO authenticated;