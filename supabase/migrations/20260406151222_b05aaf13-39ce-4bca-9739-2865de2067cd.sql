
-- Create reader_bookmarks table for in-app reading bookmarks
CREATE TABLE public.reader_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  location jsonb NOT NULL, -- {page: 5} for PDF or {cfi: "epubcfi(...)"} for EPUB
  label text,
  color text DEFAULT 'yellow',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_reader_bookmarks_user_book ON public.reader_bookmarks(user_id, book_id);

-- Enable RLS
ALTER TABLE public.reader_bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own bookmarks
CREATE POLICY "Users can view own bookmarks"
  ON public.reader_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks"
  ON public.reader_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks"
  ON public.reader_bookmarks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON public.reader_bookmarks FOR DELETE
  USING (auth.uid() = user_id);
