CREATE OR REPLACE FUNCTION public.verify_push_dispatch_secret(_secret text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.app_secrets
    WHERE key = 'push_dispatch_secret'
      AND _secret IS NOT NULL
      AND length(_secret) > 0
      AND value = _secret
  );
$$;

REVOKE ALL ON FUNCTION public.verify_push_dispatch_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_push_dispatch_secret(text) TO service_role;