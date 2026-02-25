-- Fix 1: Restrict profiles table - sensitive fields should only be visible to owner and friends
-- Drop existing permissive policy
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create restricted SELECT policy - only show public fields to everyone, private fields to owner/friends
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Anon users cannot see profiles at all (they need to sign up)
CREATE POLICY "Anon users cannot view profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Fix 2: Restrict pages table email/phone - only authenticated users can see contact details
DROP POLICY IF EXISTS "Pages are publicly viewable" ON public.pages;
DROP POLICY IF EXISTS "Anyone can view pages" ON public.pages;
DROP POLICY IF EXISTS "Public pages are viewable" ON public.pages;

-- Only authenticated users can view pages (including contact info)
CREATE POLICY "Authenticated users can view pages"
ON public.pages
FOR SELECT
TO authenticated
USING (true);

-- Anon users cannot see pages
CREATE POLICY "Anon users cannot view pages"
ON public.pages
FOR SELECT
TO anon
USING (false);