-- 1) Fix video_views: restrict reads to the viewer or the channel owner
DROP POLICY IF EXISTS "Anyone can read views" ON public.video_views;

CREATE POLICY "Viewer or channel owner can read video views"
ON public.video_views
FOR SELECT
TO authenticated
USING (
  (user_id IS NOT NULL AND auth.uid() = user_id)
  OR EXISTS (
    SELECT 1
    FROM public.videos v
    JOIN public.channels c ON c.id = v.channel_id
    WHERE v.id = video_views.video_id
      AND c.user_id = auth.uid()
  )
);

-- 2) Hide the most sensitive PII columns on profiles from direct client SELECT.
-- The blanket "Authenticated read profiles (compat)" policy stays so existing
-- public-profile features continue to work, but column-level grants stop
-- callers from reading raw phone numbers and birthdate.
-- Owners and service_role retain full access.
REVOKE SELECT (phone_number, phone, birthdate)
  ON public.profiles
  FROM anon, authenticated;