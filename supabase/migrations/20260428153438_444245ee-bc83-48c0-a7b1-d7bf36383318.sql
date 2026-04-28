-- ==========================================================================
-- 1. SECURITY AUDIT LOG (admin-readable, user-insertable)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_user_created
  ON public.security_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_event_created
  ON public.security_audit_log(event_type, created_at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can read everything
CREATE POLICY "Admins can read security audit log"
  ON public.security_audit_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Users can insert their own events (event_type whitelisted by RPC below)
CREATE POLICY "Users can insert own audit events"
  ON public.security_audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ==========================================================================
-- 2. AUDIT LOG RPCs (whitelisted event types only)
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type text,
  _resource_type text,
  _resource_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  IF _event_type NOT IN (
    'chat_media_upload',
    'chat_media_download',
    'page_contact_view'
  ) THEN
    RAISE EXCEPTION 'Unsupported audit event type: %', _event_type;
  END IF;
  INSERT INTO public.security_audit_log
    (user_id, event_type, resource_type, resource_id, metadata)
  VALUES
    (auth.uid(), _event_type, _resource_type, _resource_id, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.log_security_event(text, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, text, jsonb) TO authenticated;

-- ==========================================================================
-- 3. TIGHTEN chat-media BUCKET RULES
--    - Restrict allowed MIME types to safe set
--    - Enforce known file extension via a CHECK trigger on storage.objects
--      (limited to chat-media only — never touches other buckets)
-- ==========================================================================
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
      'image/jpeg','image/png','image/gif','image/webp','image/heic','image/heif',
      'video/mp4','video/webm','video/quicktime',
      'audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav',
      'application/pdf'
    ],
    file_size_limit = 52428800  -- 50 MB
WHERE id = 'chat-media';

CREATE OR REPLACE FUNCTION public.enforce_chat_media_extension()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage
AS $$
DECLARE
  ext text;
  allowed text[] := ARRAY[
    'jpg','jpeg','png','gif','webp','heic','heif',
    'mp4','webm','mov',
    'mp3','m4a','ogg','wav','oga',
    'pdf'
  ];
BEGIN
  IF NEW.bucket_id <> 'chat-media' THEN
    RETURN NEW;
  END IF;
  ext := lower(split_part(NEW.name, '.', array_length(string_to_array(NEW.name, '.'), 1)));
  IF ext IS NULL OR ext = '' OR NOT (ext = ANY(allowed)) THEN
    RAISE EXCEPTION 'File extension % not allowed in chat-media bucket', ext;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_media_extension_check ON storage.objects;
CREATE TRIGGER chat_media_extension_check
  BEFORE INSERT OR UPDATE ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_chat_media_extension();

-- ==========================================================================
-- 4. FIX: books bucket has duplicate unscoped INSERT policy
-- ==========================================================================
DROP POLICY IF EXISTS "Authenticated users can upload books" ON storage.objects;

-- ==========================================================================
-- 5. FIX: hide Stripe identifiers in novachat_settings from client
--    Column-level revoke on the two sensitive columns.
--    Existing row-level policy unchanged (owner can still read other fields).
-- ==========================================================================
REVOKE SELECT (stripe_customer_id, stripe_subscription_id)
  ON public.novachat_settings FROM authenticated, anon;
-- service_role retains access (used by Stripe webhook edge function)
