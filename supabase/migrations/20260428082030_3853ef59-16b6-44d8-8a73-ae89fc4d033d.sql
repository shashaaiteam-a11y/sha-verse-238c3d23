CREATE POLICY "Authenticated read non-owner profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);