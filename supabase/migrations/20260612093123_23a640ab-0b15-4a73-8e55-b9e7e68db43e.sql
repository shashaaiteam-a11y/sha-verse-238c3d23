-- Remove broad column read; grant explicit non-contact columns only
REVOKE SELECT ON public.pages FROM anon;
REVOKE SELECT ON public.pages FROM authenticated;

GRANT SELECT (
  id, name, slug, about, avatar_url, cover_url, category, created_by,
  created_at, updated_at, followers_count, website, location, hours, verified
) ON public.pages TO authenticated;

GRANT ALL ON public.pages TO service_role;

-- Secure per-page contact lookup for display (no bulk enumeration via plain select)
CREATE OR REPLACE FUNCTION public.get_page_contact(_page_id uuid)
RETURNS TABLE(email text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.email, p.phone
  FROM public.pages p
  WHERE p.id = _page_id
    AND auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_page_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_page_contact(uuid) TO authenticated;