
-- Prevent blocked users from joining groups
CREATE OR REPLACE FUNCTION public.prevent_blocked_user_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM group_blocked_users
    WHERE group_id = NEW.group_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'You are blocked from this group';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_blocked_user_join ON public.group_members;
CREATE TRIGGER trg_prevent_blocked_user_join
  BEFORE INSERT ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_blocked_user_join();

-- Also prevent blocked users from posting
CREATE OR REPLACE FUNCTION public.prevent_blocked_user_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM group_blocked_users
    WHERE group_id = NEW.group_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'You are blocked from posting in this group';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_blocked_user_post ON public.group_posts;
CREATE TRIGGER trg_prevent_blocked_user_post
  BEFORE INSERT ON public.group_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_blocked_user_post();
