-- 1. Add scheduled_for column (when the book becomes eligible for auto-deletion)
ALTER TABLE public.book_deletion_requests
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;

-- Backfill existing pending requests
UPDATE public.book_deletion_requests
  SET scheduled_for = created_at + interval '3 hours'
  WHERE scheduled_for IS NULL;

-- Trigger to auto-populate scheduled_for on insert
CREATE OR REPLACE FUNCTION public.set_book_deletion_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.scheduled_for IS NULL THEN
    NEW.scheduled_for := COALESCE(NEW.created_at, now()) + interval '3 hours';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_book_deletion_schedule ON public.book_deletion_requests;
CREATE TRIGGER trg_set_book_deletion_schedule
  BEFORE INSERT ON public.book_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_book_deletion_schedule();

-- 2. Admin RLS policies (view + review/update any request)
DROP POLICY IF EXISTS "Admins can view all deletion requests" ON public.book_deletion_requests;
CREATE POLICY "Admins can view all deletion requests"
  ON public.book_deletion_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update deletion requests" ON public.book_deletion_requests;
CREATE POLICY "Admins can update deletion requests"
  ON public.book_deletion_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Auto-deletion processor
-- SECURITY: only deletes books whose deletion request was filed by the book's ACTUAL owner
-- (channel owner) and whose grace period (3 hours) has elapsed. Non-owner requests are
-- never auto-processed, preventing any user from deleting books they don't own.
CREATE OR REPLACE FUNCTION public.process_book_auto_deletions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
  req RECORD;
BEGIN
  FOR req IN
    SELECT dr.id AS request_id, dr.book_id
    FROM public.book_deletion_requests dr
    JOIN public.books b      ON b.id = dr.book_id
    JOIN public.channels c   ON c.id = b.channel_id
    WHERE dr.status = 'pending'
      AND COALESCE(dr.scheduled_for, dr.created_at + interval '3 hours') <= now()
      AND c.user_id = dr.user_id  -- only the real owner's request triggers auto-deletion
  LOOP
    -- Deleting the book cascades to ratings, comments, saved, progress and the request row itself
    DELETE FROM public.books WHERE id = req.book_id;
    deleted_count := deleted_count + 1;
  END LOOP;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.process_book_auto_deletions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_book_auto_deletions() TO service_role;

-- 4. Schedule it every 10 minutes via pg_cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'book-auto-deletion') THEN
    PERFORM cron.unschedule('book-auto-deletion');
  END IF;
  PERFORM cron.schedule(
    'book-auto-deletion',
    '*/10 * * * *',
    $cron$ SELECT public.process_book_auto_deletions(); $cron$
  );
END;
$$;