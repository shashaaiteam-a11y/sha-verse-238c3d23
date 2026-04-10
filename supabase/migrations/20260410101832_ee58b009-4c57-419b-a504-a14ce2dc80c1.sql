-- 1. Auto-remove friendship when a user is blocked
CREATE OR REPLACE FUNCTION public.remove_friendship_on_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.friendships 
  WHERE (user_id = NEW.blocker_id AND friend_id = NEW.blocked_id)
     OR (user_id = NEW.blocked_id AND friend_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_remove_friendship_on_block ON public.user_blocks;
CREATE TRIGGER auto_remove_friendship_on_block
  AFTER INSERT ON public.user_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.remove_friendship_on_block();

-- 2. Prevent notifications between blocked users
CREATE OR REPLACE FUNCTION public.prevent_notification_to_blocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if either user has blocked the other (using data column for sender_id)
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = NEW.user_id AND blocked_id = ((NEW.data->>'sender_id')::uuid))
       OR (blocker_id = ((NEW.data->>'sender_id')::uuid) AND blocked_id = NEW.user_id)
  ) THEN
    -- Silently skip the notification
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_notifications_to_blocked_users ON public.notifications;
CREATE TRIGGER prevent_notifications_to_blocked_users
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_notification_to_blocked();

-- 3. Silently discard messages from blocked users (WhatsApp silent block)
-- The message INSERT succeeds from the sender's perspective but is quietly dropped
CREATE OR REPLACE FUNCTION public.silent_block_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other_user_id uuid;
BEGIN
  -- Find the other user in this conversation
  SELECT cm.user_id INTO other_user_id
  FROM public.conversation_members cm
  WHERE cm.conversation_id = NEW.conversation_id
    AND cm.user_id != NEW.sender_id
  LIMIT 1;

  -- If either user has blocked the other, silently drop the message
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = other_user_id AND blocked_id = NEW.sender_id)
       OR (blocker_id = NEW.sender_id AND blocked_id = other_user_id)
  ) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS silent_block_messages ON public.messages;
CREATE TRIGGER silent_block_messages
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.silent_block_message();

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_blocked ON public.user_blocks(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_blocker ON public.user_blocks(blocked_id, blocker_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_friend_status ON public.friendships(user_id, friend_id, status);