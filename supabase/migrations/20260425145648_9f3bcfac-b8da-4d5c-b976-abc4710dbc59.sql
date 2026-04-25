
-- ============================================================
-- Groups module: Fix posts_count + ensure reports/warnings RLS
-- ============================================================

-- 1. Auto-update posts_count when group_posts inserted/deleted/approved
CREATE OR REPLACE FUNCTION public.update_group_posts_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_group_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_group_id := OLD.group_id;
  ELSE
    affected_group_id := NEW.group_id;
  END IF;

  UPDATE public.groups
  SET posts_count = (
    SELECT COUNT(*) FROM public.group_posts
    WHERE group_id = affected_group_id
      AND (approval_status = 'approved' OR approval_status IS NULL)
  )
  WHERE id = affected_group_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_group_posts_count_ins ON public.group_posts;
DROP TRIGGER IF EXISTS trg_update_group_posts_count_del ON public.group_posts;
DROP TRIGGER IF EXISTS trg_update_group_posts_count_upd ON public.group_posts;

CREATE TRIGGER trg_update_group_posts_count_ins
AFTER INSERT ON public.group_posts
FOR EACH ROW EXECUTE FUNCTION public.update_group_posts_count();

CREATE TRIGGER trg_update_group_posts_count_del
AFTER DELETE ON public.group_posts
FOR EACH ROW EXECUTE FUNCTION public.update_group_posts_count();

CREATE TRIGGER trg_update_group_posts_count_upd
AFTER UPDATE OF approval_status ON public.group_posts
FOR EACH ROW EXECUTE FUNCTION public.update_group_posts_count();

-- Sync existing counts now
UPDATE public.groups g
SET posts_count = (
  SELECT COUNT(*) FROM public.group_posts gp
  WHERE gp.group_id = g.id
    AND (gp.approval_status = 'approved' OR gp.approval_status IS NULL)
);

-- 2. Ensure RLS is enabled on group_reports + group_user_warnings
ALTER TABLE public.group_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_user_warnings ENABLE ROW LEVEL SECURITY;

-- 3. group_reports: admins/mods can update status (resolve/dismiss)
DROP POLICY IF EXISTS "Group admins can update reports" ON public.group_reports;
CREATE POLICY "Group admins can update reports"
ON public.group_reports FOR UPDATE
TO authenticated
USING (
  public.get_group_role(auth.uid(), group_id) IN ('admin', 'moderator')
)
WITH CHECK (
  public.get_group_role(auth.uid(), group_id) IN ('admin', 'moderator')
);

-- 4. group_user_warnings: split into proper select/insert policies (current uses ALL/no FOR clause)
DROP POLICY IF EXISTS "Admins can manage warnings" ON public.group_user_warnings;

CREATE POLICY "Admins can view warnings"
ON public.group_user_warnings FOR SELECT
TO authenticated
USING (
  public.get_group_role(auth.uid(), group_id) IN ('admin', 'moderator')
  OR user_id = auth.uid()
);

CREATE POLICY "Admins can insert warnings"
ON public.group_user_warnings FOR INSERT
TO authenticated
WITH CHECK (
  public.get_group_role(auth.uid(), group_id) IN ('admin', 'moderator')
  AND warned_by = auth.uid()
);

CREATE POLICY "Admins can delete warnings"
ON public.group_user_warnings FOR DELETE
TO authenticated
USING (
  public.get_group_role(auth.uid(), group_id) IN ('admin', 'moderator')
);

-- 5. Add group_reports to realtime publication for live admin updates
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_reports;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_user_warnings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
