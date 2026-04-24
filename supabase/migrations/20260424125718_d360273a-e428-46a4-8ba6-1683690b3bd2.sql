-- Add delivered_at and read_at timestamp columns to messages for WhatsApp-style "Message Info"
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Auto-stamp delivered_at and read_at whenever flags flip true
CREATE OR REPLACE FUNCTION public.stamp_message_status_times()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_delivered = true AND (OLD.is_delivered IS DISTINCT FROM true) AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at := now();
  END IF;
  IF NEW.is_read = true AND (OLD.is_read IS DISTINCT FROM true) AND NEW.read_at IS NULL THEN
    NEW.read_at := now();
    -- if marked read before delivered ever stamped, also stamp delivered
    IF NEW.delivered_at IS NULL THEN
      NEW.delivered_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_message_status_times ON public.messages;
CREATE TRIGGER trg_stamp_message_status_times
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.stamp_message_status_times();

-- Backfill existing rows so the Info dialog has data immediately
UPDATE public.messages
SET delivered_at = COALESCE(delivered_at, created_at)
WHERE is_delivered = true AND delivered_at IS NULL;

UPDATE public.messages
SET read_at = COALESCE(read_at, created_at),
    delivered_at = COALESCE(delivered_at, created_at)
WHERE is_read = true AND read_at IS NULL;