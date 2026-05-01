-- Enable pg_cron for scheduled jobs (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any prior schedule with this name (idempotent re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-stories-hourly') THEN
    PERFORM cron.unschedule('cleanup-expired-stories-hourly');
  END IF;
END $$;

-- Schedule cleanup_expired_stories() to run every hour at :05
SELECT cron.schedule(
  'cleanup-expired-stories-hourly',
  '5 * * * *',
  $$ SELECT public.cleanup_expired_stories(); $$
);