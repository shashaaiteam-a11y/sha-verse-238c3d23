-- ============================================================
-- FIX: Groups not showing (private groups invisible to creators/admins)
-- ROOT CAUSE: Original group_members SELECT policy was recursive —
--   it checked membership by querying group_members, triggering itself,
--   causing silent failure (all rows hidden) for private groups.
-- FIX: Add `auth.uid() = user_id` as the primary non-recursive check
--      so a user can always see THEIR OWN membership row without recursion.
-- ============================================================

-- ── 1. Ensure is_group_admin SECURITY DEFINER function exists ──────────────
-- SECURITY DEFINER bypasses RLS on the tables it queries, so it is safe
-- to call from inside RLS policies without triggering infinite recursion.
CREATE OR REPLACE FUNCTION public.is_group_admin(gid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = gid AND user_id = uid AND role IN ('admin', 'moderator')
  ) OR EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = gid AND creator_id = uid
  );
$$;

-- ── 2. Fix groups SELECT policy ─────────────────────────────────────────────
-- Drop ALL existing groups SELECT policies (covers original name + our name)
DROP POLICY IF EXISTS "Public groups are viewable by everyone" ON public.groups;
DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;
DROP POLICY IF EXISTS "Groups viewable by members and public" ON public.groups;

-- New clean policy: non-recursive creator check + SECURITY DEFINER admin check
CREATE POLICY "Groups viewable by members and public"
ON public.groups FOR SELECT TO authenticated
USING (
  NOT is_private                              -- any authenticated user sees public groups
  OR auth.uid() = creator_id                  -- creator always sees own group (non-recursive)
  OR public.is_group_admin(id, auth.uid())    -- admin/mod via SECURITY DEFINER (bypasses RLS)
  OR EXISTS (                                 -- member check
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
  )
);

-- ── 3. Fix group_members SELECT policy ──────────────────────────────────────
-- Drop ALL existing group_members SELECT policies (covers original name + our name)
DROP POLICY IF EXISTS "Group members are viewable by group members" ON public.group_members;
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Group members visible to self and admin" ON public.group_members;

-- New clean policy: `auth.uid() = user_id` is the PRIMARY check — it short-circuits
-- and returns TRUE for the user's OWN row without touching group_members again.
-- This breaks the recursion cycle that caused private group memberships to be invisible.
CREATE POLICY "Group members visible to self and admin"
ON public.group_members FOR SELECT TO authenticated
USING (
  auth.uid() = user_id                              -- own row always visible (NO recursion)
  OR public.is_group_admin(group_id, auth.uid())    -- admin/mod via SECURITY DEFINER
  OR EXISTS (                                       -- see other members of same group
    SELECT 1 FROM public.group_members self_m
    WHERE self_m.group_id = group_members.group_id
      AND self_m.user_id = auth.uid()
    -- Safe: evaluating self_m row where user_id = auth.uid() hits the first check → TRUE → no loop
  )
);
