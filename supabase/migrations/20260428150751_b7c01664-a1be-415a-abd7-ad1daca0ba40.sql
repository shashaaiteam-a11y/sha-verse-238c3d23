-- Tighten chat-media storage upload policy to require user-owned folder path
DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;

CREATE POLICY "Users can upload chat media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);