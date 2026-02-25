-- Drop all existing SELECT policies on conversation_members that cause recursion
DROP POLICY IF EXISTS "Members can view conversation members" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view conversation members" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view members of their conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.conversation_members;

-- Drop duplicate INSERT policies
DROP POLICY IF EXISTS "Users can add conversation members" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can add friends to conversations they created" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON public.conversation_members;

-- Create single clean SELECT policy using security definer function
CREATE POLICY "conversation_members_select" ON public.conversation_members
FOR SELECT USING (
  user_id = auth.uid() OR public.is_conversation_member(auth.uid(), conversation_id)
);

-- Create single clean INSERT policy
CREATE POLICY "conversation_members_insert" ON public.conversation_members
FOR INSERT WITH CHECK (
  user_id = auth.uid() OR 
  (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
    AND public.are_friends(auth.uid(), user_id)
  )
);