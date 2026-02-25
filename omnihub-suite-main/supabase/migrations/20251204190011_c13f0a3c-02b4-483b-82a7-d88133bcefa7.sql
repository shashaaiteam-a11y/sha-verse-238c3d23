-- Create a security definer function to check group membership without recursion
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

-- Create a function to check if a group is public
CREATE OR REPLACE FUNCTION public.is_group_public(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups
    WHERE id = _group_id
      AND is_private = false
  )
$$;

-- Drop existing problematic policies on group_members
DROP POLICY IF EXISTS "Group members are viewable by group members" ON public.group_members;

-- Create new non-recursive policy for group_members SELECT
CREATE POLICY "Users can view group members"
ON public.group_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  public.is_group_public(group_id) OR
  public.is_group_member(auth.uid(), group_id)
);

-- Drop existing problematic policy on groups
DROP POLICY IF EXISTS "Public groups are viewable by everyone" ON public.groups;

-- Create new non-recursive policy for groups SELECT
CREATE POLICY "Users can view groups"
ON public.groups
FOR SELECT
TO authenticated
USING (
  is_private = false OR
  creator_id = auth.uid() OR
  public.is_group_member(auth.uid(), id)
);