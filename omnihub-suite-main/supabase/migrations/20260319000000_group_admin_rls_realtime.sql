-- ============================================================
-- GROUP ADMIN SYSTEM — RLS + REALTIME + SCHEMA FIXES
-- ============================================================

-- ── 1. SCHEMA ADDITIONS ──────────────────────────────────────

-- Ensure approval_status exists on group_posts (default 'approved' so old posts stay visible)
ALTER TABLE public.group_posts ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved'
  CHECK (approval_status IN ('pending','approved','rejected'));

-- Ensure pinned column exists on group_posts
ALTER TABLE public.group_posts ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;

-- Ensure position column exists on group_rules
ALTER TABLE public.group_rules ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- Ensure created_by column exists on group_rules
ALTER TABLE public.group_rules ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- ── 2. is_group_admin() HELPER FUNCTION ──────────────────────
-- Used inside RLS policies — avoids repeating the check everywhere.
CREATE OR REPLACE FUNCTION public.is_group_admin(gid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = gid
      AND user_id = uid
      AND role IN ('admin', 'moderator')
  )
  OR EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = gid
      AND creator_id = uid
  );
$$;

-- ── 3. ENABLE RLS ────────────────────────────────────────────
ALTER TABLE public.groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_join_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_blocked_users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_roles          ENABLE ROW LEVEL SECURITY;

-- ── 4. GROUPS POLICIES ───────────────────────────────────────

-- Anyone authenticated can view public groups; members can view private groups
DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;
CREATE POLICY "Anyone can view groups"
ON public.groups FOR SELECT TO authenticated
USING (
  is_private = false
  OR public.is_group_admin(id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = id AND gm.user_id = auth.uid()
  )
);

-- Authenticated user can create a group
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
CREATE POLICY "Authenticated users can create groups"
ON public.groups FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- Only admin/moderator can update group settings
DROP POLICY IF EXISTS "Admin can update group" ON public.groups;
CREATE POLICY "Admin can update group"
ON public.groups FOR UPDATE TO authenticated
USING (public.is_group_admin(id, auth.uid()));

-- Only creator can delete group
DROP POLICY IF EXISTS "Creator can delete group" ON public.groups;
CREATE POLICY "Creator can delete group"
ON public.groups FOR DELETE TO authenticated
USING (auth.uid() = creator_id);

-- ── 5. GROUP_MEMBERS POLICIES ────────────────────────────────

-- Members can view other members of the same group
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
  )
  OR public.is_group_admin(group_id, auth.uid())
);

-- Any authenticated user can send a join request (insert themselves)
DROP POLICY IF EXISTS "User can request join" ON public.group_members;
CREATE POLICY "User can request join"
ON public.group_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin/moderator can update member roles and status
DROP POLICY IF EXISTS "Admin manage members" ON public.group_members;
CREATE POLICY "Admin manage members"
ON public.group_members FOR UPDATE TO authenticated
USING (public.is_group_admin(group_id, auth.uid()));

-- Admin can remove members; members can remove themselves (leave)
DROP POLICY IF EXISTS "Admin or self can remove member" ON public.group_members;
CREATE POLICY "Admin or self can remove member"
ON public.group_members FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_group_admin(group_id, auth.uid())
);

-- ── 6. GROUP_POSTS POLICIES ──────────────────────────────────

-- Approved posts visible to group members; admin sees everything
DROP POLICY IF EXISTS "View approved posts" ON public.group_posts;
CREATE POLICY "View approved posts"
ON public.group_posts FOR SELECT TO authenticated
USING (
  (approval_status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_posts.group_id AND gm.user_id = auth.uid()
    )
  )
  OR public.is_group_admin(group_id, auth.uid())
  OR auth.uid() = user_id  -- post author can always see own post
);

-- Only approved members can create posts
DROP POLICY IF EXISTS "Members can create post" ON public.group_posts;
CREATE POLICY "Members can create post"
ON public.group_posts FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = group_posts.group_id AND user_id = auth.uid()
  )
);

-- Admin can approve/reject/pin; post owner can edit their own post
DROP POLICY IF EXISTS "Admin or owner can update post" ON public.group_posts;
CREATE POLICY "Admin or owner can update post"
ON public.group_posts FOR UPDATE TO authenticated
USING (
  public.is_group_admin(group_id, auth.uid())
  OR auth.uid() = user_id
);

-- Admin or post owner can delete
DROP POLICY IF EXISTS "Admin or owner can delete post" ON public.group_posts;
CREATE POLICY "Admin or owner can delete post"
ON public.group_posts FOR DELETE TO authenticated
USING (
  public.is_group_admin(group_id, auth.uid())
  OR auth.uid() = user_id
);

-- ── 7. GROUP_RULES POLICIES ──────────────────────────────────

-- Any group member can view rules
DROP POLICY IF EXISTS "Members can view rules" ON public.group_rules;
CREATE POLICY "Members can view rules"
ON public.group_rules FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_rules.group_id AND gm.user_id = auth.uid()
  )
  OR public.is_group_admin(group_id, auth.uid())
);

-- Only admin can manage (create/update/delete) rules
DROP POLICY IF EXISTS "Admin manage rules" ON public.group_rules;
CREATE POLICY "Admin manage rules"
ON public.group_rules FOR ALL TO authenticated
USING (public.is_group_admin(group_id, auth.uid()))
WITH CHECK (public.is_group_admin(group_id, auth.uid()));

-- ── 8. GROUP_JOIN_REQUESTS POLICIES ─────────────────────────

DROP POLICY IF EXISTS "Users can create join requests" ON public.group_join_requests;
CREATE POLICY "Users can create join requests"
ON public.group_join_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view join requests" ON public.group_join_requests;
CREATE POLICY "Admin can view join requests"
ON public.group_join_requests FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_group_admin(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Admin can manage join requests" ON public.group_join_requests;
CREATE POLICY "Admin can manage join requests"
ON public.group_join_requests FOR UPDATE TO authenticated
USING (public.is_group_admin(group_id, auth.uid()));

DROP POLICY IF EXISTS "Admin can delete join requests" ON public.group_join_requests;
CREATE POLICY "Admin can delete join requests"
ON public.group_join_requests FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_group_admin(group_id, auth.uid())
);

-- ── 9. GROUP_BLOCKED_USERS POLICIES ─────────────────────────

DROP POLICY IF EXISTS "Admin manage blocked users" ON public.group_blocked_users;
CREATE POLICY "Admin manage blocked users"
ON public.group_blocked_users FOR ALL TO authenticated
USING (public.is_group_admin(group_id, auth.uid()))
WITH CHECK (public.is_group_admin(group_id, auth.uid()));

-- ── 10. GROUP_ROLES POLICIES ─────────────────────────────────

DROP POLICY IF EXISTS "Admin manage group roles" ON public.group_roles;
CREATE POLICY "Admin manage group roles"
ON public.group_roles FOR ALL TO authenticated
USING (public.is_group_admin(group_id, auth.uid()))
WITH CHECK (public.is_group_admin(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view group roles" ON public.group_roles;
CREATE POLICY "Members can view group roles"
ON public.group_roles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_roles.group_id AND gm.user_id = auth.uid()
  )
);

-- ── 11. REALTIME ENABLE ──────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_posts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_rules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_rules;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_join_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_join_requests;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_blocked_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_blocked_users;
  END IF;
END $$;
