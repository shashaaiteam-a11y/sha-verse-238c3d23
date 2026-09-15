
-- 1) Rotate: generate a brand new secret inside the DB and store it encrypted in Vault.
DO $$
DECLARE
  new_secret text := encode(extensions.gen_random_bytes(32), 'hex');
  existing uuid;
BEGIN
  SELECT id INTO existing FROM vault.secrets WHERE name = 'push_dispatch_secret';
  IF existing IS NULL THEN
    PERFORM vault.create_secret(new_secret, 'push_dispatch_secret', 'Internal shared secret: notifications trigger -> send-push edge function');
  ELSE
    PERFORM vault.update_secret(existing, new_secret, 'push_dispatch_secret', 'Internal shared secret: notifications trigger -> send-push edge function');
  END IF;
END $$;

-- 2) Remove the compromised plaintext copy.
DELETE FROM private.app_secrets WHERE key = 'push_dispatch_secret';

-- 3) Dispatch trigger reads the encrypted secret only.
CREATE OR REPLACE FUNCTION public.dispatch_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  dispatch_secret text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO dispatch_secret
    FROM vault.decrypted_secrets
    WHERE name = 'push_dispatch_secret'
    LIMIT 1;

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
$$;

-- 4) Verifier compares against the encrypted secret; service_role only.
CREATE OR REPLACE FUNCTION public.verify_push_dispatch_secret(_secret text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  expected text;
BEGIN
  IF _secret IS NULL OR length(_secret) < 16 THEN
    RETURN false;
  END IF;

  SELECT decrypted_secret INTO expected
  FROM vault.decrypted_secrets
  WHERE name = 'push_dispatch_secret'
  LIMIT 1;

  IF expected IS NULL OR length(expected) = 0 THEN
    RETURN false;
  END IF;

  RETURN encode(extensions.digest(_secret, 'sha256'), 'hex')
       = encode(extensions.digest(expected, 'sha256'), 'hex');
END;
$$;

REVOKE ALL ON FUNCTION public.verify_push_dispatch_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_push_dispatch_secret(text) TO service_role;
