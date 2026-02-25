-- Combined migration to fix all Bookshelf module database issues
-- This addresses all schema inconsistencies and missing fields

-- 1. Fix channel_type constraint to match frontend usage
UPDATE public.channels 
SET channel_type = 'books' 
WHERE channel_type = 'book';

ALTER TABLE public.channels 
DROP CONSTRAINT IF EXISTS channels_channel_type_check;

ALTER TABLE public.channels 
ADD CONSTRAINT channels_channel_type_check 
CHECK (channel_type IN ('video', 'books'));

-- 2. Add all missing required fields to books table
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS downloads_count INTEGER DEFAULT 0;

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS rating_avg DECIMAL(3,2) DEFAULT 0.00;

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS tags TEXT[];

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' 
CHECK (visibility IN ('public', 'friends', 'private'));

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS age_restriction TEXT DEFAULT 'none' 
CHECK (age_restriction IN ('none', '13+', '16+', '18+'));

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS subtitle TEXT;

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS isbn TEXT;

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS publisher TEXT;

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS publication_date DATE;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_books_downloads_count ON public.books(downloads_count);
CREATE INDEX IF NOT EXISTS idx_books_rating_avg ON public.books(rating_avg);
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category);
CREATE INDEX IF NOT EXISTS idx_books_language ON public.books(language);
CREATE INDEX IF NOT EXISTS idx_books_visibility ON public.books(visibility);
CREATE INDEX IF NOT EXISTS idx_books_age_restriction ON public.books(age_restriction);
CREATE INDEX IF NOT EXISTS idx_channels_channel_type ON public.channels(channel_type);

-- 4. Update existing records with default values
UPDATE public.books 
SET visibility = 'public' 
WHERE visibility IS NULL;

UPDATE public.books 
SET age_restriction = 'none' 
WHERE age_restriction IS NULL;

UPDATE public.books 
SET language = 'English' 
WHERE language IS NULL;

-- 5. Enhanced RLS policies for books table
DROP POLICY IF EXISTS "Books are viewable by everyone" ON public.books;
DROP POLICY IF EXISTS "Users can create books" ON public.books;
DROP POLICY IF EXISTS "Users can update own books" ON public.books;
DROP POLICY IF EXISTS "Users can delete own books" ON public.books;

CREATE POLICY "Books are viewable based on visibility settings" 
ON public.books FOR SELECT 
USING (
  visibility = 'public'
  OR
  (visibility = 'friends' AND auth.role() = 'authenticated')
  OR
  (visibility = 'private' AND auth.uid() = (
    SELECT user_id FROM public.channels WHERE id = channel_id
  ))
  OR
  auth.uid() IN (
    SELECT user_id FROM public.channels WHERE id = channel_id
  )
);

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

CREATE POLICY "Users can update own books" 
ON public.books FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.channels 
    WHERE id = channel_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own books" 
ON public.books FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.channels 
    WHERE id = channel_id 
    AND user_id = auth.uid()
  )
);

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

-- Refresh the database types
-- Note: This will require regenerating TypeScript types after migration