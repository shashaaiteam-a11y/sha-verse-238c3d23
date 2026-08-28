-- 1. P0: group creator must be able to insert their own admin membership row.
--    The role value is still policed by the existing enforce_group_member_role trigger.
CREATE POLICY "Group creators can add themselves as admin"
ON public.group_members FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.creator_id = auth.uid())
);

-- 2. P1: global case-insensitive group-name uniqueness is wrong for a social product
--    (two unrelated communities may share a name, and the client pre-check cannot see
--    private groups because of RLS). Scope uniqueness to the creator, which still stops
--    double-submit / retry duplicates.
DROP INDEX IF EXISTS public.groups_name_unique_ci;
CREATE UNIQUE INDEX groups_creator_name_unique_ci
  ON public.groups (creator_id, lower(name));

-- 3. P0: payout amount must be backed by real balance.
CREATE OR REPLACE FUNCTION public.validate_payout_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  bal bigint;
  minimum integer;
BEGIN
  SELECT revenue_balance_cents, COALESCE(minimum_payout_cents, 0)
    INTO bal, minimum
  FROM public.channel_monetization
  WHERE channel_id = NEW.channel_id;

  IF bal IS NULL THEN
    RAISE EXCEPTION 'Channel has no monetization record';
  END IF;
  IF NEW.amount_cents IS NULL OR NEW.amount_cents <= 0 THEN
    RAISE EXCEPTION 'Payout amount must be positive';
  END IF;
  IF NEW.amount_cents < minimum THEN
    RAISE EXCEPTION 'Payout amount is below the minimum payout threshold';
  END IF;
  IF NEW.amount_cents > bal THEN
    RAISE EXCEPTION 'Payout amount exceeds available balance';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.payout_requests
    WHERE channel_id = NEW.channel_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending payout request already exists for this channel';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_payout_amount ON public.payout_requests;
CREATE TRIGGER trg_validate_payout_amount
BEFORE INSERT ON public.payout_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_payout_amount();

-- 4. P1: duplicated notification trigger -> two notifications per reaction.
DROP TRIGGER IF EXISTS trigger_notify_on_reaction ON public.likes;

-- 4b. duplicated recompute / guard triggers (idempotent, but wasteful double work)
DROP TRIGGER IF EXISTS update_book_rating_on_change ON public.book_ratings;
DROP TRIGGER IF EXISTS trigger_sync_video_comments_count ON public.comments;
DROP TRIGGER IF EXISTS trigger_sync_video_likes_count ON public.likes;
DROP TRIGGER IF EXISTS update_channel_subscribers_count ON public.subscriptions;
DROP TRIGGER IF EXISTS protect_payout_request_fields_trg ON public.payout_requests;

-- 5. P2: tables the client subscribes to but which were never in the realtime publication.
ALTER PUBLICATION supabase_realtime ADD TABLE public.book_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_books;
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_boosts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_badges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_dislikes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_suggestions;