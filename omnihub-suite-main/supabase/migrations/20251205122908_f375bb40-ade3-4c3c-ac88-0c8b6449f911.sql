-- Fix conversation_members RLS policies to prevent adding users without consent
-- Users should only be able to add others to conversations if they are friends

-- Drop the problematic policy that allows adding any user
DROP POLICY IF EXISTS "Users can add members to conversations they created" ON public.conversation_members;

-- Create a helper function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(_user1 uuid, _user2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (user_id = _user1 AND friend_id = _user2)
        OR (user_id = _user2 AND friend_id = _user1)
      )
  )
$$;

-- New policy: Users can add members to conversations only if they are friends with the new member
-- OR if they are adding themselves
CREATE POLICY "Users can add friends to conversations they created"
ON public.conversation_members
FOR INSERT
WITH CHECK (
  -- Case 1: User adding themselves to a conversation
  (auth.uid() = user_id)
  OR
  -- Case 2: Conversation creator can add users they are friends with
  (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_members.conversation_id
        AND c.created_by = auth.uid()
    )
    AND are_friends(auth.uid(), conversation_members.user_id)
  )
);