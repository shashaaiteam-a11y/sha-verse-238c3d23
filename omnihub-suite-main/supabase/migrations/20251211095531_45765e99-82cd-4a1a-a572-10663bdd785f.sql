-- Drop existing policies on books bucket if any
DROP POLICY IF EXISTS "Allow authenticated users to upload books" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view books" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own books" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own books" ON storage.objects;

-- Create policies for books storage bucket
CREATE POLICY "Anyone can view books"
ON storage.objects FOR SELECT
USING (bucket_id = 'books');

CREATE POLICY "Authenticated users can upload books"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'books' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own book files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own book files"
ON storage.objects FOR DELETE
USING (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);