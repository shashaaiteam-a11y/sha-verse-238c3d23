
-- 1) PAGES
DROP POLICY IF EXISTS "Pages viewable by everyone" ON public.pages;
DROP POLICY IF EXISTS "Pages are publicly viewable" ON public.pages;
DROP POLICY IF EXISTS "Public pages are viewable" ON public.pages;
DROP POLICY IF EXISTS "Anyone can view pages" ON public.pages;

-- 2) PROFILES
DROP POLICY IF EXISTS "Authenticated read non-owner profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Keep cross-user reads working for the existing app, but expose a safe view for non-sensitive fields.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  username,
  display_name,
  avatar_url,
  cover_url,
  bio,
  is_verified,
  created_at
FROM public.profiles
WHERE COALESCE(is_deactivated, false) = false;

GRANT SELECT ON public.public_profiles TO authenticated;

-- Backward-compat: allow authenticated reads on base table to avoid breaking the app.
-- Sensitive PII columns should be filtered at the application layer or via the public_profiles view.
CREATE POLICY "Authenticated read profiles (compat)"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 3) AD_IMPRESSIONS
DROP POLICY IF EXISTS "Anyone can read ad_impressions" ON public.ad_impressions;
DROP POLICY IF EXISTS "Public can read ad_impressions" ON public.ad_impressions;
DROP POLICY IF EXISTS "ad_impressions are viewable by everyone" ON public.ad_impressions;

-- 4) TRANSCODING_JOBS
DROP POLICY IF EXISTS "System can manage transcoding jobs" ON public.transcoding_jobs;

CREATE POLICY "Channel owners can manage transcoding jobs"
ON public.transcoding_jobs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.channels c ON v.channel_id = c.id
    WHERE v.id = transcoding_jobs.video_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.channels c ON v.channel_id = c.id
    WHERE v.id = transcoding_jobs.video_id AND c.user_id = auth.uid()
  )
);
