-- 1) One-time migration: approve every existing channel so current Discover content stays visible
UPDATE public.channels
SET approval_status = 'approved'
WHERE approval_status IS DISTINCT FROM 'approved';

-- 2) Enforce strict approval gating (NULL no longer counts as approved)
DROP POLICY IF EXISTS "Channels viewable when approved or owner" ON public.channels;
CREATE POLICY "Channels viewable when approved or owner"
ON public.channels FOR SELECT TO anon, authenticated
USING (
  approval_status = 'approved'
  OR user_id = auth.uid()
  OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
);

DROP POLICY IF EXISTS "Books viewable by visibility & approval" ON public.books;
CREATE POLICY "Books viewable by visibility & approval"
ON public.books FOR SELECT TO anon, authenticated
USING (
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.channels c WHERE c.id = books.channel_id AND c.user_id = auth.uid()
  ))
  OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
  OR (
    COALESCE(visibility, 'public') = 'public'
    AND EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = books.channel_id AND c.approval_status = 'approved'
    )
  )
);

DROP POLICY IF EXISTS "Videos viewable when channel approved or owner" ON public.videos;
CREATE POLICY "Videos viewable when channel approved or owner"
ON public.videos FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = videos.channel_id
      AND (c.approval_status = 'approved' OR c.user_id = auth.uid())
  )
  OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
);

-- 3) Chat attachments: only the uploader or someone sharing a conversation with them
DROP POLICY IF EXISTS "Authenticated users can read chat media" ON storage.objects;
CREATE POLICY "Chat media readable by conversation participants"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM public.conversation_members me
      JOIN public.conversation_members owner
        ON owner.conversation_id = me.conversation_id
      WHERE me.user_id = auth.uid()
        AND (owner.user_id)::text = (storage.foldername(name))[1]
    )
  )
);

-- 4) Media metadata: owner only, except entries stored in public buckets
DROP POLICY IF EXISTS "Media viewable by everyone" ON public.media;
CREATE POLICY "Media viewable by owner or in public buckets"
ON public.media FOR SELECT TO anon, authenticated
USING (
  bucket IN ('avatars', 'books', 'post-images', 'videos', 'email-assets')
  OR owner = auth.uid()
);