-- Create books storage bucket for book uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for books bucket
CREATE POLICY "Users can upload books" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their books" ON storage.objects
FOR UPDATE USING (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their books" ON storage.objects
FOR DELETE USING (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Books are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'books');