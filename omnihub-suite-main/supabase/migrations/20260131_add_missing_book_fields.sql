-- Add missing required fields to books table for enhanced functionality

-- Add download tracking
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS downloads_count INTEGER DEFAULT 0;

-- Add rating system fields
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS rating_avg DECIMAL(3,2) DEFAULT 0.00;

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Add metadata fields
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add visibility and restriction controls
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' 
CHECK (visibility IN ('public', 'friends', 'private'));

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS age_restriction TEXT DEFAULT 'none' 
CHECK (age_restriction IN ('none', '13+', '16+', '18+'));

-- Add additional useful fields
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS subtitle TEXT;

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS isbn TEXT;

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS publisher TEXT;

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS publication_date DATE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_books_downloads_count ON public.books(downloads_count);
CREATE INDEX IF NOT EXISTS idx_books_rating_avg ON public.books(rating_avg);
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category);
CREATE INDEX IF NOT EXISTS idx_books_language ON public.books(language);
CREATE INDEX IF NOT EXISTS idx_books_visibility ON public.books(visibility);
CREATE INDEX IF NOT EXISTS idx_books_age_restriction ON public.books(age_restriction);

-- Update existing books with default values where needed
UPDATE public.books 
SET visibility = 'public' 
WHERE visibility IS NULL;

UPDATE public.books 
SET age_restriction = 'none' 
WHERE age_restriction IS NULL;

UPDATE public.books 
SET language = 'English' 
WHERE language IS NULL;