-- Enhanced RLS policies for books table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Books are viewable by everyone" ON public.books;
DROP POLICY IF EXISTS "Users can create books" ON public.books;
DROP POLICY IF EXISTS "Users can update own books" ON public.books;
DROP POLICY IF EXISTS "Users can delete own books" ON public.books;

-- Create enhanced view policy with visibility controls
CREATE POLICY "Books are viewable based on visibility settings" 
ON public.books FOR SELECT 
USING (
  -- Public books are visible to everyone
  visibility = 'public'
  OR
  -- Authenticated users can see friends-only content
  (visibility = 'friends' AND auth.role() = 'authenticated')
  OR
  -- Owners can see their own private content
  (visibility = 'private' AND auth.uid() = (
    SELECT user_id FROM public.channels WHERE id = channel_id
  ))
  OR
  -- Admins can see all content
  auth.uid() IN (
    SELECT user_id FROM public.channels WHERE id = channel_id
  )
);

-- Create insert policy with proper ownership
CREATE POLICY "Authenticated users can create books in their channels" 
ON public.books FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated'
  AND
  EXISTS (
    SELECT 1 FROM public.channels 
    WHERE id = channel_id 
    AND user_id = auth.uid()
  )
);

-- Create update policy with ownership check
CREATE POLICY "Users can update own books" 
ON public.books FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.channels 
    WHERE id = channel_id 
    AND user_id = auth.uid()
  )
);

-- Create delete policy with ownership check
CREATE POLICY "Users can delete own books" 
ON public.books FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.channels 
    WHERE id = channel_id 
    AND user_id = auth.uid()
  )
);

-- Add policies for downloads_count updates
CREATE POLICY "Anyone can increment download count" 
ON public.books FOR UPDATE 
USING (true)
WITH CHECK (
  downloads_count = OLD.downloads_count + 1
  AND
  (OLD.downloads_count IS NULL OR downloads_count > OLD.downloads_count)
);

-- Create indexes for better RLS performance
CREATE INDEX IF NOT EXISTS idx_books_visibility ON public.books(visibility);
CREATE INDEX IF NOT EXISTS idx_books_channel_id ON public.books(channel_id);