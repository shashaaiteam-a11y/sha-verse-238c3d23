-- ============================================================
-- Migration: Create Bookshelf Comments System
-- Date: 2026-03-20
-- Purpose:
--   Creates book_comments table, comment_likes table,
--   adds comments_count to books, sets up RLS, indexes,
--   and all helper functions & triggers.
-- ============================================================

-- 1. book_comments table
CREATE TABLE IF NOT EXISTS book_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES book_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES book_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- 3. Add comments_count to books if not already there
ALTER TABLE books ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_book_comments_book_id   ON book_comments(book_id);
CREATE INDEX IF NOT EXISTS idx_book_comments_parent_id ON book_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_book_comments_created_at ON book_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);

-- 5. Enable RLS
ALTER TABLE book_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes  ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: book_comments
DROP POLICY IF EXISTS "Book comments are viewable by everyone"            ON book_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments"           ON book_comments;
DROP POLICY IF EXISTS "Users can update own comments"                     ON book_comments;
DROP POLICY IF EXISTS "Users can delete own comments"                     ON book_comments;
DROP POLICY IF EXISTS "Channel owners can delete comments on their books" ON book_comments;

CREATE POLICY "Book comments are viewable by everyone"
  ON book_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON book_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON book_comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON book_comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Channel owners can delete comments on their books"
  ON book_comments FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM books b
      JOIN channels c ON b.channel_id = c.id
      WHERE b.id = book_id AND c.user_id = auth.uid()
    )
  );

-- 7. RLS Policies: comment_likes
DROP POLICY IF EXISTS "Comment likes are viewable by everyone"  ON comment_likes;
DROP POLICY IF EXISTS "Authenticated users can like comments"   ON comment_likes;
DROP POLICY IF EXISTS "Users can unlike own likes"              ON comment_likes;

CREATE POLICY "Comment likes are viewable by everyone"
  ON comment_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like comments"
  ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own likes"
  ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- 8. Helper functions
CREATE OR REPLACE FUNCTION increment_book_comment_count(p_book_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE books SET comments_count = comments_count + 1 WHERE id = p_book_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_book_comment_count(p_book_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE books SET comments_count = GREATEST(0, comments_count - 1) WHERE id = p_book_id;
END;
$$;

CREATE OR REPLACE FUNCTION comment_likes_count(p_comment_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (SELECT COUNT(*)::int FROM comment_likes WHERE comment_id = p_comment_id);
END;
$$;

-- 9. Trigger: auto-update likes_count on book_comments
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE book_comments
    SET likes_count = comment_likes_count(NEW.comment_id)
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE book_comments
    SET likes_count = comment_likes_count(OLD.comment_id)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_comment_likes_trigger ON comment_likes;
CREATE TRIGGER update_comment_likes_trigger
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();
