-- Enhanced blocking system with automatic unfriending and notification/chat blocking

-- Create function to automatically remove friendship when user is blocked
CREATE OR REPLACE FUNCTION public.remove_friendship_on_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove friendship in both directions when someone is blocked
  DELETE FROM public.friendships 
  WHERE (user_id = NEW.blocker_id AND friend_id = NEW.blocked_id AND status = 'accepted')
     OR (user_id = NEW.blocked_id AND friend_id = NEW.blocker_id AND status = 'accepted');
  
  -- Also remove any pending friend requests between the users
  DELETE FROM public.friendships 
  WHERE (user_id = NEW.blocker_id AND friend_id = NEW.blocked_id)
     OR (user_id = NEW.blocked_id AND friend_id = NEW.blocker_id);
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically remove friendship when user is blocked
DROP TRIGGER IF EXISTS auto_remove_friendship_on_block ON public.user_blocks;
CREATE TRIGGER auto_remove_friendship_on_block
  AFTER INSERT ON public.user_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.remove_friendship_on_block();

-- Create function to prevent notifications to blocked users
CREATE OR REPLACE FUNCTION public.prevent_notification_to_blocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if recipient has blocked the sender
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE blocker_id = NEW.user_id  -- recipient has blocked sender
      AND blocked_id = NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'Cannot send notification to blocked user';
  END IF;
  
  -- Check if sender has blocked the recipient
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE blocker_id = NEW.sender_id  -- sender has blocked recipient
      AND blocked_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Cannot send notification to user you have blocked';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to prevent notifications to blocked users
DROP TRIGGER IF EXISTS prevent_notifications_to_blocked_users ON public.notifications;
CREATE TRIGGER prevent_notifications_to_blocked_users
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_notification_to_blocked();

-- Create function to prevent messages to blocked users
CREATE OR REPLACE FUNCTION public.prevent_message_to_blocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_creator uuid;
BEGIN
  -- Get the conversation creator
  SELECT created_by INTO conversation_creator
  FROM public.conversations
  WHERE id = NEW.conversation_id;
  
  -- If this is the first message in conversation, check if sender is blocked by any member
  IF conversation_creator = NEW.sender_id THEN
    -- Check if any existing member has blocked the sender
    IF EXISTS (
      SELECT 1 FROM public.conversation_members cm
      JOIN public.user_blocks ub ON cm.user_id = ub.blocker_id
      WHERE cm.conversation_id = NEW.conversation_id
        AND ub.blocked_id = NEW.sender_id
    ) THEN
      RAISE EXCEPTION 'Cannot send message to conversation with blocked user';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to prevent messages to blocked users
DROP TRIGGER IF EXISTS prevent_messages_to_blocked_users ON public.messages;
CREATE TRIGGER prevent_messages_to_blocked_users
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_message_to_blocked();

-- Create function to automatically remove blocked users from conversation
CREATE OR REPLACE FUNCTION public.remove_blocked_user_from_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove the blocked user from any conversations they're in with the blocker
  DELETE FROM public.conversation_members cm
  WHERE cm.user_id = NEW.blocked_id
    AND cm.conversation_id IN (
      SELECT c.id 
      FROM public.conversations c
      JOIN public.conversation_members cm2 ON c.id = cm2.conversation_id
      WHERE cm2.user_id = NEW.blocker_id
    );
  
  RETURN NEW;
END;
$$;

-- Create trigger to remove blocked user from conversations
DROP TRIGGER IF EXISTS auto_remove_blocked_user_from_conversations ON public.user_blocks;
CREATE TRIGGER auto_remove_blocked_user_from_conversations
  AFTER INSERT ON public.user_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.remove_blocked_user_from_conversation();

-- Create function to require new friend request after unblocking
CREATE OR REPLACE FUNCTION public.require_new_friend_request_after_unblock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When unblocking, ensure no automatic friendship restoration
  -- This is handled by application logic - no database action needed
  -- The application should require explicit new friend request
  RETURN OLD;
END;
$$;

-- Create trigger for unblocking
DROP TRIGGER IF EXISTS handle_unblock ON public.user_blocks;
CREATE TRIGGER handle_unblock
  BEFORE DELETE ON public.user_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.require_new_friend_request_after_unblock();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_blocked ON public.user_blocks(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_friend_status ON public.friendships(user_id, friend_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_sender ON public.notifications(user_id, sender_id);