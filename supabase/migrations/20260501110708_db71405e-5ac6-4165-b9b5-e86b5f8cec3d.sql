-- Enable pg_cron for scheduled jobs (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Helper that refreshes PYMK for recently-active users.
-- Runs entirely server-side; safe and bounded.
CREATE OR REPLACE FUNCTION public.refresh_friend_suggestions_for_active_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u record;
BEGIN
  FOR u IN
    SELECT id
    FROM public.profiles
    WHERE COALESCE(last_login, updated_at, created_at) > now() - interval '14 days'
      AND COALESCE(is_deactivated, false) = false
    LIMIT 5000
  LOOP
    BEGIN
      PERFORM public.calculate_friend_suggestions(u.id);
    EXCEPTION WHEN OTHERS THEN
      -- Skip individual failures so one bad user doesn't break the batch
      CONTINUE;
    END;
  END LOOP;
END;
$$;

-- Lock down execution to internal use only
REVOKE ALL ON FUNCTION public.refresh_friend_suggestions_for_active_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_friend_suggestions_for_active_users() FROM anon, authenticated;

-- Remove any prior schedule with the same name (safe re-run)
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-friend-suggestions-nightly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Schedule nightly at 03:30 UTC
SELECT cron.schedule(
  'refresh-friend-suggestions-nightly',
  '30 3 * * *',
  $cron$ SELECT public.refresh_friend_suggestions_for_active_users(); $cron$
);