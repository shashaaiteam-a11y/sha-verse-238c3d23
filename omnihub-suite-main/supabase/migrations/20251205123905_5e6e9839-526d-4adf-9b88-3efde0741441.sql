
-- Drop existing problematic policies on conversation_members
DROP POLICY IF EXISTS "Users can view conversation members" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can add members to conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_members;

-- Create a security definer function to check if user is a conversation member
CREATE OR REPLACE FUNCTION public.is_conversation_member(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE user_id = _user_id
      AND conversation_id = _conversation_id
  )
$$;

-- Create simple non-recursive RLS policies
CREATE POLICY "Users can view conversation members"
ON public.conversation_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.is_conversation_member(auth.uid(), conversation_id)
);

CREATE POLICY "Users can add conversation members"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND c.created_by = auth.uid()
  ) OR
  public.are_friends(auth.uid(), user_id)
);

CREATE POLICY "Users can update their own membership"
ON public.conversation_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own membership"
ON public.conversation_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
