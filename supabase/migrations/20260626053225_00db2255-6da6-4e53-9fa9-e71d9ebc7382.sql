-- 1. channel_memberships: remove broad self-update policy (renewals via payment/server)
DROP POLICY IF EXISTS "Users can update their memberships" ON public.channel_memberships;

-- 2. creator_badges: lock integrity-critical fields (badge_level, achievements) via trigger,
--    keep counter updates (used by the app) working.
CREATE OR REPLACE FUNCTION public.protect_creator_badge_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.is_admin(auth.uid())
     OR (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Ordinary channel owners may not self-assign badge level or achievements
  NEW.badge_level := OLD.badge_level;
  NEW.achievements := OLD.achievements;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_creator_badge_fields ON public.creator_badges;
CREATE TRIGGER trg_protect_creator_badge_fields
BEFORE UPDATE ON public.creator_badges
FOR EACH ROW EXECUTE FUNCTION public.protect_creator_badge_fields();

-- 3. poll_options: prevent direct writes to vote_count (trigger maintains it via SECURITY DEFINER)
REVOKE UPDATE (vote_count) ON public.poll_options FROM authenticated, anon;

-- 4. rewarded_ad_unlocks: lock reward fields, allow only monotonic consumed_count increases
CREATE OR REPLACE FUNCTION public.protect_rewarded_ad_unlock_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.is_admin(auth.uid())
     OR (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Lock all reward-defining fields
  NEW.reward_type := OLD.reward_type;
  NEW.reward_value := OLD.reward_value;
  NEW.expires_at := OLD.expires_at;
  NEW.resource_id := OLD.resource_id;
  NEW.user_id := OLD.user_id;
  -- consumed_count may only move forward (one consumption at a time)
  IF NEW.consumed_count < OLD.consumed_count THEN
    NEW.consumed_count := OLD.consumed_count;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_rewarded_ad_unlock_fields ON public.rewarded_ad_unlocks;
CREATE TRIGGER trg_protect_rewarded_ad_unlock_fields
BEFORE UPDATE ON public.rewarded_ad_unlocks
FOR EACH ROW EXECUTE FUNCTION public.protect_rewarded_ad_unlock_fields();

-- 5. groups: restrict private group visibility to members/creator
DROP POLICY IF EXISTS "Users can view groups" ON public.groups;
CREATE POLICY "Users can view groups"
ON public.groups
FOR SELECT
TO authenticated
USING (
  is_private = false
  OR creator_id = auth.uid()
  OR public.is_group_member(auth.uid(), id)
);

-- 6. novachat_settings: restrict policies to authenticated only (remove public/anon)
DROP POLICY IF EXISTS "novachat_settings_select_own" ON public.novachat_settings;
CREATE POLICY "novachat_settings_select_own"
ON public.novachat_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "novachat_settings_insert_own" ON public.novachat_settings;
CREATE POLICY "novachat_settings_insert_own"
ON public.novachat_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "novachat_settings_delete_own" ON public.novachat_settings;
CREATE POLICY "novachat_settings_delete_own"
ON public.novachat_settings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 7. payout_requests: owners can only create & view; admins manage updates/deletes
DROP POLICY IF EXISTS "Channel owners can manage their payouts" ON public.payout_requests;

CREATE POLICY "Channel owners can view their payouts"
ON public.payout_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.channels
    WHERE channels.id = payout_requests.channel_id
      AND channels.user_id = auth.uid()
  )
);

CREATE POLICY "Channel owners can create payouts"
ON public.payout_requests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.channels
    WHERE channels.id = payout_requests.channel_id
      AND channels.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage payouts"
ON public.payout_requests
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));