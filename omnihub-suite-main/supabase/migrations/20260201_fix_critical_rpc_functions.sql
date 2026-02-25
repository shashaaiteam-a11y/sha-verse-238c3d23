-- CRITICAL FIX: Missing RPC Functions and Atomic Operations
-- This migration adds missing functions and fixes race conditions

-- ============================================
-- STEP 2: Add Missing RPC Function
-- ============================================

-- Function to decrement comment count (was missing)
CREATE OR REPLACE FUNCTION public.decrement_book_comment_count(book_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE books 
  SET comments_count = GREATEST(0, comments_count - 1)
  WHERE id = book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: Fix Race Conditions with Atomic Functions
-- ============================================

-- Atomic increment for book likes
CREATE OR REPLACE FUNCTION public.increment_book_likes(book_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE books 
  SET likes_count = likes_count + 1 
  WHERE id = book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic decrement for book likes
CREATE OR REPLACE FUNCTION public.decrement_book_likes(book_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE books 
  SET likes_count = GREATEST(0, likes_count - 1)
  WHERE id = book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic increment for book downloads
CREATE OR REPLACE FUNCTION public.increment_book_downloads(book_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE books 
  SET downloads_count = downloads_count + 1 
  WHERE id = book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic increment for book views
CREATE OR REPLACE FUNCTION public.increment_book_views(book_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE books 
  SET views_count = views_count + 1 
  WHERE id = book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Triggers for automatic rating calculation
-- ============================================

-- Function to update book rating average
CREATE OR REPLACE FUNCTION public.update_book_rating_avg()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate new average and count
  UPDATE books
  SET 
    rating_avg = (
      SELECT COALESCE(AVG(rating), 0)
      FROM book_ratings
      WHERE book_id = COALESCE(NEW.book_id, OLD.book_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM book_ratings
      WHERE book_id = COALESCE(NEW.book_id, OLD.book_id)
    )
  WHERE id = COALESCE(NEW.book_id, OLD.book_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update rating when rating is added/updated/deleted
DROP TRIGGER IF EXISTS trigger_update_book_rating ON book_ratings;
CREATE TRIGGER trigger_update_book_rating
AFTER INSERT OR UPDATE OR DELETE ON book_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_book_rating_avg();

-- ============================================
-- Grant necessary permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.decrement_book_comment_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_book_likes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_book_likes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_book_downloads(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_book_views(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_book_rating_avg() TO authenticated;

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON FUNCTION public.decrement_book_comment_count IS 'Atomically decrements comment count for a book';
COMMENT ON FUNCTION public.increment_book_likes IS 'Atomically increments like count for a book - prevents race conditions';
COMMENT ON FUNCTION public.decrement_book_likes IS 'Atomically decrements like count for a book - prevents race conditions';
COMMENT ON FUNCTION public.increment_book_downloads IS 'Atomically increments download count for a book';
COMMENT ON FUNCTION public.increment_book_views IS 'Atomically increments view count for a book';
COMMENT ON FUNCTION public.update_book_rating_avg IS 'Automatically updates book rating average when ratings change';
