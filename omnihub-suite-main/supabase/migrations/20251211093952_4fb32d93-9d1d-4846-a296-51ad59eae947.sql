-- Book ratings table
CREATE TABLE public.book_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(book_id, user_id)
);

-- Book deletion requests table
CREATE TABLE public.book_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Saved books (user library)
CREATE TABLE public.saved_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(book_id, user_id)
);

-- Reading progress tracking
CREATE TABLE public.book_reading_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_page INTEGER DEFAULT 1,
  total_pages INTEGER,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed BOOLEAN DEFAULT false,
  UNIQUE(book_id, user_id)
);

-- Add category column to books if not exists
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private'));
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS age_restriction TEXT DEFAULT 'none' CHECK (age_restriction IN ('none', '13+', '18+'));
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS comments_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS ratings_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS downloads_count INTEGER DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.book_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reading_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for book_ratings
CREATE POLICY "Book ratings are viewable by everyone" ON public.book_ratings FOR SELECT USING (true);
CREATE POLICY "Users can create ratings" ON public.book_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON public.book_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ratings" ON public.book_ratings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for book_deletion_requests
CREATE POLICY "Users can view own deletion requests" ON public.book_deletion_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create deletion requests" ON public.book_deletion_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for saved_books
CREATE POLICY "Users can view own saved books" ON public.saved_books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save books" ON public.saved_books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave books" ON public.saved_books FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reading progress
CREATE POLICY "Users can view own progress" ON public.book_reading_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create progress" ON public.book_reading_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.book_reading_progress FOR UPDATE USING (auth.uid() = user_id);

-- Function to update book rating avg
CREATE OR REPLACE FUNCTION public.update_book_rating_avg()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.books
  SET 
    rating_avg = (SELECT AVG(rating)::NUMERIC(3,2) FROM public.book_ratings WHERE book_id = COALESCE(NEW.book_id, OLD.book_id)),
    rating_count = (SELECT COUNT(*) FROM public.book_ratings WHERE book_id = COALESCE(NEW.book_id, OLD.book_id))
  WHERE id = COALESCE(NEW.book_id, OLD.book_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for rating updates
CREATE TRIGGER update_book_rating_on_change
AFTER INSERT OR UPDATE OR DELETE ON public.book_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_book_rating_avg();