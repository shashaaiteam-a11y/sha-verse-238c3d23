-- Messages: ensure broad broadcast policies are gone
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON public.messages;

-- Poll votes: restrict SELECT to the voter only
DROP POLICY IF EXISTS "Authenticated users can view poll votes" ON public.poll_votes;

CREATE POLICY "Users can view their own poll votes"
ON public.poll_votes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);