CREATE OR REPLACE FUNCTION public.guard_group_post_approval_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    IF NOT (
      public.get_group_role(auth.uid(), NEW.group_id) = ANY (ARRAY['admin','moderator'])
      OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = NEW.group_id AND g.creator_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    ) THEN
      RAISE EXCEPTION 'Only group admins or moderators can change post approval status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_group_post_approval_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_guard_group_post_approval_status ON public.group_posts;
CREATE TRIGGER trigger_guard_group_post_approval_status
BEFORE UPDATE ON public.group_posts
FOR EACH ROW EXECUTE FUNCTION public.guard_group_post_approval_status();