-- Prevent requesters from manipulating moderation/identity fields on their own
-- join requests. Group admins/moderators (and global admins) are unaffected,
-- so the existing approve/reject flow keeps working.
CREATE OR REPLACE FUNCTION public.protect_group_join_request_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.get_group_role(auth.uid(), NEW.group_id) IN ('admin','moderator') THEN
    RETURN NEW;
  END IF;

  -- Non-privileged caller (the requester): lock moderation & identity fields
  NEW.status      := OLD.status;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.group_id    := OLD.group_id;
  NEW.user_id     := OLD.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_group_join_request_fields ON public.group_join_requests;
CREATE TRIGGER protect_group_join_request_fields
BEFORE UPDATE ON public.group_join_requests
FOR EACH ROW EXECUTE FUNCTION public.protect_group_join_request_fields();