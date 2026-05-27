
-- 1) Remove broadcast bypass policies on messages
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON public.messages;

-- 2) Protect books.file_hash from public read access via column privileges.
-- Revoke column-level SELECT on file_hash from anon and authenticated.
REVOKE SELECT (file_hash) ON public.books FROM anon;
REVOKE SELECT (file_hash) ON public.books FROM authenticated;

-- Allow owners/admins to read file_hash via a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_book_file_hash(_book_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hash text;
  _owner uuid;
BEGIN
  SELECT b.file_hash, c.user_id
    INTO _hash, _owner
  FROM public.books b
  LEFT JOIN public.channels c ON c.id = b.channel_id
  WHERE b.id = _book_id;

  IF _owner IS NULL THEN
    RETURN NULL;
  END IF;

  IF auth.uid() = _owner OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN _hash;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_book_file_hash(uuid) TO authenticated;
