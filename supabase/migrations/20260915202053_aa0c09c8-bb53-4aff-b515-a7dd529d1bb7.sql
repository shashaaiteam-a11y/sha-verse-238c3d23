
-- 1) Transactional group creation with owner membership
CREATE OR REPLACE FUNCTION public.create_group_with_owner(
  _name text,
  _description text DEFAULT NULL,
  _privacy text DEFAULT 'public',
  _avatar_url text DEFAULT NULL,
  _cover_url text DEFAULT NULL,
  _category text DEFAULT 'General',
  _language text DEFAULT NULL,
  _country text DEFAULT NULL,
  _rules text DEFAULT NULL
)
RETURNS public.groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _trimmed text := btrim(coalesce(_name, ''));
  _owned int;
  _group public.groups;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF length(_trimmed) < 1 THEN
    RAISE EXCEPTION 'GROUP_NAME_REQUIRED';
  END IF;

  IF _privacy IS NULL OR _privacy NOT IN ('public', 'private', 'secret') THEN
    _privacy := 'public';
  END IF;

  -- Server-side cap: a user may own/administer at most 5 groups.
  SELECT count(*) INTO _owned
  FROM public.group_members
  WHERE user_id = _uid AND role = 'admin';

  IF _owned >= 5 THEN
    RAISE EXCEPTION 'GROUP_LIMIT_REACHED';
  END IF;

  -- Group names are intentionally NOT unique.
  INSERT INTO public.groups (
    name, description, is_private, privacy, creator_id,
    avatar_url, cover_url, category, language, country, rules
  ) VALUES (
    _trimmed, _description, _privacy <> 'public', _privacy, _uid,
    _avatar_url, _cover_url, coalesce(_category, 'General'), _language, _country, _rules
  )
  RETURNING * INTO _group;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (_group.id, _uid, 'admin');

  -- Return the freshest row (counter triggers may have updated it).
  SELECT * INTO _group FROM public.groups WHERE id = _group.id;
  RETURN _group;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_with_owner(text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_group_with_owner(text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_with_owner(text, text, text, text, text, text, text, text, text) TO service_role;

-- 2) A group creator cannot leave their own group
CREATE OR REPLACE FUNCTION public.prevent_group_owner_leave()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- During a group deletion the parent row is already gone, so this check
  -- passes and cascading member deletes still work.
  IF EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = OLD.group_id AND creator_id = OLD.user_id
  ) THEN
    RAISE EXCEPTION 'GROUP_OWNER_CANNOT_LEAVE';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_group_owner_leave ON public.group_members;
CREATE TRIGGER trg_prevent_group_owner_leave
BEFORE DELETE ON public.group_members
FOR EACH ROW EXECUTE FUNCTION public.prevent_group_owner_leave();
