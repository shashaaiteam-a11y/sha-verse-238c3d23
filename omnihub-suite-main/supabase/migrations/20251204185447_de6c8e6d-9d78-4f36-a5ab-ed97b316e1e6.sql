-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create new policy: Authenticated users can view all profiles (basic info)
-- Users can always view their own full profile
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: Field-level privacy is enforced at the application layer using profile_field_privacy table
-- This policy ensures only logged-in users can access profile data at all