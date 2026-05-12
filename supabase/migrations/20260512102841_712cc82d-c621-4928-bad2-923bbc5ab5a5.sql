
-- 1) story_reactions: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Users can view reactions on stories they can see" ON public.story_reactions;
CREATE POLICY "Users can view reactions on stories they can see"
ON public.story_reactions
FOR SELECT
TO authenticated
USING (true);

-- 2) poll_votes: drop the public-scoped duplicate (authenticated policy already exists)
DROP POLICY IF EXISTS "Users can view poll votes" ON public.poll_votes;

-- 3) user_presence: restrict SELECT to authenticated
DROP POLICY IF EXISTS "presence_select_all" ON public.user_presence;
CREATE POLICY "presence_select_all"
ON public.user_presence
FOR SELECT
TO authenticated
USING (true);

-- 4) subscriptions: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Subscriptions are viewable by everyone" ON public.subscriptions;
CREATE POLICY "Subscriptions are viewable by authenticated users"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (true);

-- 5) content_fingerprints: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view fingerprints" ON public.content_fingerprints;
CREATE POLICY "Authenticated users can view fingerprints"
ON public.content_fingerprints
FOR SELECT
TO authenticated
USING (true);
