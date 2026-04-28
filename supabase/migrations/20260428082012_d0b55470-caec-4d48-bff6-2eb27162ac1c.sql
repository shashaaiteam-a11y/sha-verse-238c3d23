-- Fix 1: Remove overly permissive activities SELECT policy
DROP POLICY IF EXISTS "Users can view all activities" ON public.profile_activities;

-- Fix 2: Restrict profiles SELECT to safe columns via view; restrict base table to owner-only
DROP POLICY IF EXISTS "Authenticated read non-owner profiles" ON public.profiles;

-- Create a public-safe view exposing only non-sensitive fields
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = true) AS
SELECT
  id,
  username,
  display_name,
  avatar_url,
  cover_url,
  bio,
  is_verified,
  created_at,
  provider
FROM public.profiles;

GRANT SELECT ON public.profiles_safe TO authenticated, anon;

-- Allow authenticated users to read profiles base table only via the safe view path.
-- Since RLS doesn't do column-level: keep an authenticated read policy but we will
-- rely on the existing get_visible_profile_fields() RPC + profiles_safe view for non-owners.
-- For backwards compatibility (many existing queries select from profiles), we re-add
-- an authenticated SELECT policy but applications should migrate to profiles_safe.
-- To enforce protection at DB level, we restrict base table SELECT to owner only.
-- Non-owners must use profiles_safe view or get_visible_profile_fields() RPC.

-- (Owner policy "Profiles owner full read" already exists for owners)

-- Fix 3: Remove user_sessions from realtime publication to prevent broadcast leakage
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_sessions;