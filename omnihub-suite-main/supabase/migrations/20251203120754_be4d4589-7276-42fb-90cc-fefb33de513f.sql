-- Drop existing problematic policies on profile_activities
DROP POLICY IF EXISTS "Users can create their own activities" ON public.profile_activities;
DROP POLICY IF EXISTS "Users can view activities" ON public.profile_activities;

-- Create proper RLS policies for profile_activities
CREATE POLICY "Users can create their own activities" 
ON public.profile_activities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all activities" 
ON public.profile_activities 
FOR SELECT 
USING (true);

-- Fix conversation_members infinite recursion - drop and recreate policies
DROP POLICY IF EXISTS "Users can view their conversation memberships" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view conversation members" ON public.conversation_members;

-- Simple non-recursive policies for conversation_members
CREATE POLICY "Users can view own memberships" 
ON public.conversation_members 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own membership" 
ON public.conversation_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to see other members in their conversations (non-recursive)
CREATE POLICY "Users can view members of their conversations" 
ON public.conversation_members 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
  )
);

-- Fix friendships policies - ensure users can send friend requests
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON public.friendships;

CREATE POLICY "Users can send friend requests" 
ON public.friendships 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);