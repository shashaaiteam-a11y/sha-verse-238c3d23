-- ============================================================
-- Migration: Fix Bookshelf Subscription RPCs & Subscriber Count Sync
-- Date: 2026-03-20
-- Purpose:
--   1. Create subscribe_to_channel(target_channel_id uuid) RPC
--   2. Create unsubscribe_from_channel(target_channel_id uuid) RPC
--   3. Create trigger on subscriptions table to keep
--      channels.subscribers_count accurate on all INSERT/DELETE ops
--   4. One-time data correction: recalculate subscribers_count for
--      all channels based on actual subscription rows
-- ============================================================


-- ============================================================
-- 1. subscribe_to_channel RPC
--    Inserts a row into subscriptions for the authenticated user
--    and atomically updates channels.subscribers_count.
--    ON CONFLICT DO NOTHING prevents duplicate-subscription errors.
-- ============================================================
CREATE OR REPLACE FUNCTION public.subscribe_to_channel(target_channel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert subscription (silently ignore if already subscribed)
  INSERT INTO public.subscriptions (user_id, channel_id)
  VALUES (auth.uid(), target_channel_id)
  ON CONFLICT DO NOTHING;

  -- Atomically recalculate subscribers_count for the channel
  UPDATE public.channels
  SET subscribers_count = (
    SELECT COUNT(*) FROM public.subscriptions
    WHERE channel_id = target_channel_id
  )
  WHERE id = target_channel_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.subscribe_to_channel(uuid) TO authenticated;


-- ============================================================
-- 2. unsubscribe_from_channel RPC
--    Deletes the subscription row for the authenticated user
--    and atomically updates channels.subscribers_count.
-- ============================================================
CREATE OR REPLACE FUNCTION public.unsubscribe_from_channel(target_channel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete subscription row
  DELETE FROM public.subscriptions
  WHERE user_id = auth.uid()
    AND channel_id = target_channel_id;

  -- Atomically recalculate subscribers_count for the channel
  UPDATE public.channels
  SET subscribers_count = (
    SELECT COUNT(*) FROM public.subscriptions
    WHERE channel_id = target_channel_id
  )
  WHERE id = target_channel_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.unsubscribe_from_channel(uuid) TO authenticated;


-- ============================================================
-- 3. Trigger function: recalculate subscribers_count on
--    INSERT or DELETE on the subscriptions table.
--    This keeps the count accurate even for direct table ops
--    (e.g., admin actions, other modules).
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_channel_subscribers_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_channel_id uuid;
BEGIN
  -- Determine which channel was affected
  IF TG_OP = 'DELETE' THEN
    affected_channel_id := OLD.channel_id;
  ELSE
    affected_channel_id := NEW.channel_id;
  END IF;

  -- Recalculate and update the count atomically
  UPDATE public.channels
  SET subscribers_count = (
    SELECT COUNT(*) FROM public.subscriptions
    WHERE channel_id = affected_channel_id
  )
  WHERE id = affected_channel_id;

  RETURN NULL; -- AFTER trigger; return value is ignored
END;
$$;

-- Drop existing trigger if any (safe idempotent re-creation)
DROP TRIGGER IF EXISTS update_channel_subscribers_count ON public.subscriptions;

-- Attach trigger to subscriptions table for INSERT and DELETE
CREATE TRIGGER update_channel_subscribers_count
AFTER INSERT OR DELETE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_channel_subscribers_count();


-- ============================================================
-- 4. One-time data correction
--    Recalculate subscribers_count for ALL channels based on
--    the actual rows currently in the subscriptions table.
--    This corrects any historical drift.
-- ============================================================
UPDATE public.channels c
SET subscribers_count = (
  SELECT COUNT(*)
  FROM public.subscriptions s
  WHERE s.channel_id = c.id
);
