CREATE OR REPLACE FUNCTION public.enforce_message_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sender may edit their own message freely (existing behaviour).
  IF auth.uid() IS NULL OR auth.uid() = OLD.sender_id THEN
    RETURN NEW;
  END IF;

  -- Non-sender conversation members may ONLY update read/delivery status.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.metadata IS DISTINCT FROM OLD.metadata
     OR NEW.edited IS DISTINCT FROM OLD.edited
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only read/delivery status can be updated by a recipient';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_message_update_scope ON public.messages;
CREATE TRIGGER enforce_message_update_scope
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_update_scope();