-- Create book comments table
CREATE TABLE IF NOT EXISTS public.book_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.book_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create comment likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.book_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Add comments_count column to books table if not exists
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_book_comments_book_id ON public.book_comments(book_id);
CREATE INDEX IF NOT EXISTS idx_book_comments_parent_id ON public.book_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_book_comments_created_at ON public.book_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);

-- Enable RLS
ALTER TABLE public.book_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for book_comments
CREATE POLICY "Book comments are viewable by everyone" 
ON public.book_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" 
ON public.book_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" 
ON public.book_comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" 
ON public.book_comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Channel owners can delete comments on their books" 
ON public.book_comments FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.books b 
    JOIN public.channels c ON b.channel_id = c.id 
    WHERE b.id = book_id AND c.user_id = auth.uid()
  )
);

-- RLS Policies for comment_likes
CREATE POLICY "Comment likes are viewable by everyone" 
ON public.comment_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like comments" 
ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own likes" 
ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Function to increment book comment count
CREATE OR REPLACE FUNCTION public.increment_book_comment_count(book_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.books 
  SET comments_count = comments_count + 1 
  WHERE id = book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement book comment count
CREATE OR REPLACE FUNCTION public.decrement_book_comment_count(book_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.books 
  SET comments_count = GREATEST(0, comments_count - 1) 
  WHERE id = book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comment likes count
CREATE OR REPLACE FUNCTION public.comment_likes_count(comment_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM public.comment_likes 
    WHERE comment_id = comment_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update comment likes count
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.book_comments 
    SET likes_count = public.comment_likes_count(NEW.comment_id)
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.book_comments 
    SET likes_count = public.comment_likes_count(OLD.comment_id)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_likes_trigger
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();