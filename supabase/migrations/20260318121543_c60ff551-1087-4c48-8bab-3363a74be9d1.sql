
-- Create trigger function to update members_count on groups table
CREATE OR REPLACE FUNCTION public.update_group_members_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.groups
    SET members_count = (SELECT COUNT(*) FROM public.group_members WHERE group_id = NEW.group_id)
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.groups
    SET members_count = (SELECT COUNT(*) FROM public.group_members WHERE group_id = OLD.group_id)
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_update_group_members_count ON public.group_members;

CREATE TRIGGER trigger_update_group_members_count
AFTER INSERT OR DELETE ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.update_group_members_count();

-- Sync existing counts
UPDATE public.groups g
SET members_count = (SELECT COUNT(*) FROM public.group_members gm WHERE gm.group_id = g.id);
