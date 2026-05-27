DROP POLICY IF EXISTS "Authenticated users can view fingerprints" ON public.content_fingerprints;
DROP POLICY IF EXISTS "Users can view reactions on stories they can see" ON public.story_reactions;
-- Defensive: ensure any stray broadcast policies on messages are removed
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON public.messages;