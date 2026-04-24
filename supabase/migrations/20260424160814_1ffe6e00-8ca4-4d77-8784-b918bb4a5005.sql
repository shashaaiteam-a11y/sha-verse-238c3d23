-- Bookshelf Anti-Duplication & Copyright Reporting

-- 1. Add file_hash column with UNIQUE constraint
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS file_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_books_file_hash_unique ON public.books(file_hash) WHERE file_hash IS NOT NULL;

-- 2. Case-insensitive unique composite index on (title, author) to prevent metadata duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_books_title_author_unique ON public.books(LOWER(title), LOWER(author));

-- 3. Book reports table for copyright/abuse claims
CREATE TABLE IF NOT EXISTS public.book_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','rejected')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_reports_book_id ON public.book_reports(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reports_status ON public.book_reports(status);
CREATE INDEX IF NOT EXISTS idx_book_reports_reporter ON public.book_reports(reporter_id);

ALTER TABLE public.book_reports ENABLE ROW LEVEL SECURITY;

-- Users can submit reports
CREATE POLICY "Authenticated users can create book reports"
  ON public.book_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own submitted reports
CREATE POLICY "Users can view their own reports"
  ON public.book_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Updated_at trigger
CREATE TRIGGER trg_book_reports_updated_at
  BEFORE UPDATE ON public.book_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Enable realtime for new reports (admins can listen)
ALTER PUBLICATION supabase_realtime ADD TABLE public.book_reports;