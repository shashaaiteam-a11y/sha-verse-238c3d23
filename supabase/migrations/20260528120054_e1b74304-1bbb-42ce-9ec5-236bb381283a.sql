
-- 1. Hide Stripe IDs from client (column-level revoke)
REVOKE SELECT (stripe_customer_id, stripe_subscription_id) ON public.novachat_settings FROM authenticated, anon;
REVOKE UPDATE (stripe_customer_id, stripe_subscription_id) ON public.novachat_settings FROM authenticated, anon;

-- 2. Channels: protect admin-only columns
CREATE OR REPLACE FUNCTION public.protect_channel_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.approval_status := OLD.approval_status;
    NEW.approved_at := OLD.approved_at;
    NEW.approved_by := OLD.approved_by;
    NEW.rejection_reason := OLD.rejection_reason;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_protect_channel_admin_fields ON public.channels;
CREATE TRIGGER trg_protect_channel_admin_fields
BEFORE UPDATE ON public.channels
FOR EACH ROW EXECUTE FUNCTION public.protect_channel_admin_fields();

-- 3. Friendships: only recipient can accept; sender cannot change status
CREATE OR REPLACE FUNCTION public.protect_friendship_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Only the recipient (friend_id) can change status, and only from pending
    IF auth.uid() <> OLD.friend_id THEN
      RAISE EXCEPTION 'Only the recipient can change friendship status';
    END IF;
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Can only change status from pending';
    END IF;
    IF NEW.status NOT IN ('accepted','declined','rejected','blocked') THEN
      RAISE EXCEPTION 'Invalid friendship status transition';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_protect_friendship_status ON public.friendships;
CREATE TRIGGER trg_protect_friendship_status
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.protect_friendship_status();

-- 4. Group posts: protect approval_status/pinned/is_announcement; restrict delete on pinned/announcement
CREATE OR REPLACE FUNCTION public.protect_group_post_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
  v_creator uuid;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  SELECT creator_id INTO v_creator FROM public.groups WHERE id = NEW.group_id;
  v_role := public.get_group_role(auth.uid(), NEW.group_id);
  IF v_creator = auth.uid() OR v_role IN ('admin','moderator') THEN
    RETURN NEW;
  END IF;
  NEW.approval_status := OLD.approval_status;
  NEW.pinned := OLD.pinned;
  NEW.is_announcement := OLD.is_announcement;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_protect_group_post_admin_fields ON public.group_posts;
CREATE TRIGGER trg_protect_group_post_admin_fields
BEFORE UPDATE ON public.group_posts
FOR EACH ROW EXECUTE FUNCTION public.protect_group_post_admin_fields();

CREATE OR REPLACE FUNCTION public.protect_group_post_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
  v_creator uuid;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN OLD;
  END IF;
  IF OLD.pinned = true OR OLD.is_announcement = true THEN
    SELECT creator_id INTO v_creator FROM public.groups WHERE id = OLD.group_id;
    v_role := public.get_group_role(auth.uid(), OLD.group_id);
    IF v_creator <> auth.uid() AND COALESCE(v_role,'') NOT IN ('admin','moderator') THEN
      RAISE EXCEPTION 'Only group admins/moderators can delete pinned or announcement posts';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS trg_protect_group_post_delete ON public.group_posts;
CREATE TRIGGER trg_protect_group_post_delete
BEFORE DELETE ON public.group_posts
FOR EACH ROW EXECUTE FUNCTION public.protect_group_post_delete();

-- 5. Payout requests: protect status / amount_cents / processed_at from client writes
CREATE OR REPLACE FUNCTION public.protect_payout_request_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.processed_at := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.status := OLD.status;
    NEW.amount_cents := OLD.amount_cents;
    NEW.processed_at := OLD.processed_at;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_protect_payout_request_fields ON public.payout_requests;
CREATE TRIGGER trg_protect_payout_request_fields
BEFORE INSERT OR UPDATE ON public.payout_requests
FOR EACH ROW EXECUTE FUNCTION public.protect_payout_request_fields();

-- 6. Notifications: drop unrestricted insert policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- 7. User blocks: drop weaker duplicate
DROP POLICY IF EXISTS "Users can create blocks" ON public.user_blocks;
