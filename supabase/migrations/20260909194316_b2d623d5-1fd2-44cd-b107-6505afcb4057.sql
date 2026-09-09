CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1. Device tokens -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('android','ios','web')),
  device_id text,
  device_label text,
  app_version text,
  enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens (user_id) WHERE enabled;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push tokens" ON public.push_tokens;
CREATE POLICY "Users manage own push tokens"
ON public.push_tokens FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Delivery log (idempotency + debugging) ----------------------------------
CREATE TABLE IF NOT EXISTS public.push_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL,
  user_id uuid,
  token text NOT NULL,
  device_id text,
  status text NOT NULL CHECK (status IN ('delivered','failed','skipped')),
  error_code text,
  error_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, token)
);

CREATE INDEX IF NOT EXISTS push_delivery_log_user_idx ON public.push_delivery_log (user_id, created_at DESC);

GRANT SELECT ON public.push_delivery_log TO authenticated;
GRANT ALL ON public.push_delivery_log TO service_role;

ALTER TABLE public.push_delivery_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own push delivery log" ON public.push_delivery_log;
CREATE POLICY "Users read own push delivery log"
ON public.push_delivery_log FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 3. updated_at trigger ------------------------------------------------------
DROP TRIGGER IF EXISTS push_tokens_set_updated_at ON public.push_tokens;
CREATE TRIGGER push_tokens_set_updated_at
BEFORE UPDATE ON public.push_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Per-user push preference -----------------------------------------------
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT true;

-- 5. Dispatch trigger --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dispatch_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  BEGIN
    PERFORM extensions.net.http_post(
      url := 'https://plmhjuqedtkiffzhberf.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('notification_id', NEW.id),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- Push delivery must never block or fail the in-app notification insert.
    RAISE WARNING 'push dispatch failed for notification %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dispatch_push_notification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_dispatch_push_notification ON public.notifications;
CREATE TRIGGER trigger_dispatch_push_notification
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.dispatch_push_notification();