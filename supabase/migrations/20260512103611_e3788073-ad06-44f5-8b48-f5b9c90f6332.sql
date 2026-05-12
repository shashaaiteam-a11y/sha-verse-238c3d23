
-- Replace the blanket authenticated-read policy with one that respects
-- profiles.privacy->>'profile_visibility' (default 'public'). Friends still
-- see profiles set to 'friends'. Owners always see their own row.

DROP POLICY IF EXISTS "Authenticated read profiles (compat)" ON public.profiles;

CREATE POLICY "Authenticated read profiles (privacy aware)"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR COALESCE(privacy->>'profile_visibility', 'public') = 'public'
  OR (
    COALESCE(privacy->>'profile_visibility', 'public') = 'friends'
    AND public.are_friends(auth.uid(), id)
  )
);
