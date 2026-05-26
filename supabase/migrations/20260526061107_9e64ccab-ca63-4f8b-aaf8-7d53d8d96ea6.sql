
-- 1) Posts visibility RLS
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by visibility"
ON public.posts FOR SELECT
USING (
  COALESCE(visibility, 'public') = 'public'
  OR auth.uid() = user_id
  OR (
    visibility = 'friends'
    AND auth.uid() IS NOT NULL
    AND public.are_friends(auth.uid(), user_id)
  )
);

-- 2) Messages broadcast bypass
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON public.messages;

-- 3) Rewarded ad unlocks: protect fields
CREATE OR REPLACE FUNCTION public.protect_reward_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.reward_value IS DISTINCT FROM OLD.reward_value THEN
      RAISE EXCEPTION 'reward_value cannot be modified by clients';
    END IF;
    IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
      RAISE EXCEPTION 'expires_at cannot be modified by clients';
    END IF;
    IF NEW.reward_type IS DISTINCT FROM OLD.reward_type THEN
      RAISE EXCEPTION 'reward_type cannot be modified by clients';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'user_id cannot be modified';
    END IF;
    IF NEW.consumed_count < OLD.consumed_count THEN
      RAISE EXCEPTION 'consumed_count cannot be decreased';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_reward_fields_trg ON public.rewarded_ad_unlocks;
CREATE TRIGGER protect_reward_fields_trg
BEFORE UPDATE ON public.rewarded_ad_unlocks
FOR EACH ROW EXECUTE FUNCTION public.protect_reward_fields();

-- 4) Content fingerprints: owner/admin only
DROP POLICY IF EXISTS "Authenticated users can read fingerprints" ON public.content_fingerprints;
DROP POLICY IF EXISTS "Fingerprints viewable by authenticated" ON public.content_fingerprints;
DROP POLICY IF EXISTS "Content fingerprints viewable by authenticated" ON public.content_fingerprints;
CREATE POLICY "Fingerprints viewable by owner or admin"
ON public.content_fingerprints FOR SELECT
USING (
  auth.uid() = owner_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 5) Story reactions: scoped reads
DROP POLICY IF EXISTS "Story reactions are viewable by everyone" ON public.story_reactions;
DROP POLICY IF EXISTS "Authenticated users can view story reactions" ON public.story_reactions;
CREATE POLICY "Story reactions viewable by participants"
ON public.story_reactions FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = story_reactions.story_id
      AND (s.user_id = auth.uid() OR public.are_friends(auth.uid(), s.user_id))
  )
);

-- 6) Subscriptions: owner of subscription or channel owner
DROP POLICY IF EXISTS "Subscriptions are viewable by authenticated users" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions are viewable by everyone" ON public.subscriptions;
CREATE POLICY "Subscriptions viewable by subscriber or channel owner"
ON public.subscriptions FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = subscriptions.channel_id AND c.user_id = auth.uid()
  )
);
