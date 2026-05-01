-- Fix: Allow conversation recipients to mark messages as delivered/read.
-- Previously only the sender could UPDATE rows, which silently blocked
-- recipients from setting is_delivered / is_read → tick state stuck on single tick.

-- Keep the existing sender update policy (sender can edit their own message content)
-- and ADD a separate, narrowly-scoped policy for recipients that ONLY allows
-- toggling delivery/read flags. The stamp_message_status_times trigger already
-- maintains delivered_at / read_at timestamps automatically.

DROP POLICY IF EXISTS "messages_recipient_status_update" ON public.messages;

CREATE POLICY "messages_recipient_status_update"
ON public.messages
FOR UPDATE
USING (
  -- Recipient (any conversation member who is NOT the sender)
  auth.uid() <> sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = messages.conversation_id
      AND cm.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() <> sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = messages.conversation_id
      AND cm.user_id = auth.uid()
  )
);

-- Defense-in-depth trigger: ensure recipients can ONLY change status flags,
-- not content / metadata / sender_id, even though the policy permits UPDATE.
CREATE OR REPLACE FUNCTION public.guard_message_recipient_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when the updater is NOT the sender
  IF auth.uid() IS NOT NULL AND auth.uid() <> OLD.sender_id THEN
    -- Recipients may only toggle delivery/read flags (and their *_at stamps via trigger).
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.metadata IS DISTINCT FROM OLD.metadata
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.edited IS DISTINCT FROM OLD.edited
    THEN
      RAISE EXCEPTION 'Recipients can only update delivery/read status fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_message_recipient_update ON public.messages;
CREATE TRIGGER trg_guard_message_recipient_update
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.guard_message_recipient_update();