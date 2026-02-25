-- Add UPDATE policy for poll_options to allow vote count increment
CREATE POLICY "Allow vote count updates"
ON public.poll_options
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Also need to make sure poll options are being saved correctly
-- Let's verify the INSERT policy allows authenticated users
DROP POLICY IF EXISTS "Post owners can create poll options" ON public.poll_options;

CREATE POLICY "Authenticated users can create poll options"
ON public.poll_options
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);