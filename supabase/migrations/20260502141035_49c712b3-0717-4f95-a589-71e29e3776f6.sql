-- 1) Realtime channel authorization: require authenticated users for all
--    Broadcast/Presence subscribe + send. Without this, anonymous clients
--    could subscribe to any topic.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON realtime.messages;

CREATE POLICY "Authenticated users can receive broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can send broadcasts"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2) Poll votes: do not expose individual votes to anonymous viewers.
--    Keep authenticated visibility so existing UI (which relies on votes
--    for "did I vote?" checks) keeps working. Aggregate counts live on
--    poll_options.vote_count and are unaffected.
DROP POLICY IF EXISTS "Anyone can view poll votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Poll votes are viewable" ON public.poll_votes;
DROP POLICY IF EXISTS "Public can view poll votes" ON public.poll_votes;

CREATE POLICY "Authenticated users can view poll votes"
ON public.poll_votes
FOR SELECT
TO authenticated
USING (true);