-- Fix: Allow all authenticated users to see all groups (for discover/search)
-- Private groups' content is still protected by group_members/group_posts RLS
DROP POLICY IF EXISTS "Users can view groups" ON public.groups;

CREATE POLICY "Users can view groups"
ON public.groups
FOR SELECT
TO authenticated
USING (true);