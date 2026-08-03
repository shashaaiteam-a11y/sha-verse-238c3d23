
-- 1. media: owner or admin only (no bucket-name based access)
DROP POLICY IF EXISTS "Media viewable by owner or in public buckets" ON public.media;
CREATE POLICY "Media viewable by owner or admin"
ON public.media FOR SELECT TO authenticated
USING (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. split anon / authenticated policies so anon never evaluates has_role
DROP POLICY IF EXISTS "Channels viewable when approved or owner" ON public.channels;
CREATE POLICY "Channels public read approved" ON public.channels FOR SELECT TO anon
USING (approval_status = 'approved');
CREATE POLICY "Channels auth read approved owner admin" ON public.channels FOR SELECT TO authenticated
USING (
  approval_status = 'approved'
  OR user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Books viewable by visibility & approval" ON public.books;
CREATE POLICY "Books public read approved" ON public.books FOR SELECT TO anon
USING (
  COALESCE(visibility, 'public') = 'public'
  AND EXISTS (SELECT 1 FROM public.channels c WHERE c.id = books.channel_id AND c.approval_status = 'approved')
);
CREATE POLICY "Books auth read approved owner admin" ON public.books FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.channels c WHERE c.id = books.channel_id AND c.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    COALESCE(visibility, 'public') = 'public'
    AND EXISTS (SELECT 1 FROM public.channels c WHERE c.id = books.channel_id AND c.approval_status = 'approved')
  )
);

DROP POLICY IF EXISTS "Videos viewable when channel approved or owner" ON public.videos;
CREATE POLICY "Videos public read approved" ON public.videos FOR SELECT TO anon
USING (
  EXISTS (SELECT 1 FROM public.channels c WHERE c.id = videos.channel_id AND c.approval_status = 'approved')
);
CREATE POLICY "Videos auth read approved owner admin" ON public.videos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = videos.channel_id AND (c.approval_status = 'approved' OR c.user_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 3. anon no longer needs the admin helper
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
