-- 1) post_media: respect parent post visibility
DROP POLICY IF EXISTS "Post media viewable by everyone" ON public.post_media;
CREATE POLICY "Post media follows post visibility"
ON public.post_media
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_media.post_id
      AND (
        COALESCE(p.visibility, 'public') = 'public'
        OR auth.uid() = p.user_id
        OR (p.visibility = 'friends' AND auth.uid() IS NOT NULL AND public.are_friends(auth.uid(), p.user_id))
      )
  )
);

-- 2) internal secret store (not exposed through the API)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.app_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.app_secrets FROM anon, authenticated;
GRANT SELECT ON private.app_secrets TO service_role;

INSERT INTO private.app_secrets (key, value)
VALUES ('push_dispatch_secret', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- 3) trigger now authenticates itself to the send-push function
CREATE OR REPLACE FUNCTION public.dispatch_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'net', 'extensions'
AS $function$
DECLARE
  dispatch_secret text;
BEGIN
  BEGIN
    SELECT value INTO dispatch_secret FROM private.app_secrets WHERE key = 'push_dispatch_secret';

    PERFORM net.http_post(
      url := 'https://plmhjuqedtkiffzhberf.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-dispatch-secret', COALESCE(dispatch_secret, '')
      ),
      body := jsonb_build_object('notification_id', NEW.id),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'push dispatch failed for notification %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

-- 4) remove anonymous execute on privileged SECURITY DEFINER routines
REVOKE EXECUTE ON FUNCTION public.increment_creator_badge_motions(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.respond_message_request(uuid, boolean) FROM anon;