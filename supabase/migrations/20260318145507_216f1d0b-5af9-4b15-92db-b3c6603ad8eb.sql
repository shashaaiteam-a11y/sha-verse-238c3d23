
-- Fix: Update all group creators who have 'member' role to 'admin'
UPDATE public.group_members gm
SET role = 'admin'
FROM public.groups g
WHERE gm.group_id = g.id
  AND gm.user_id = g.creator_id
  AND gm.role != 'admin';

-- Also update the RLS UPDATE policy to allow creators to update their own groups
DROP POLICY IF EXISTS "Group admins can update groups" ON public.groups;
CREATE POLICY "Group admins can update groups"
ON public.groups
FOR UPDATE
USING (
  auth.uid() = creator_id
  OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
  )
);
