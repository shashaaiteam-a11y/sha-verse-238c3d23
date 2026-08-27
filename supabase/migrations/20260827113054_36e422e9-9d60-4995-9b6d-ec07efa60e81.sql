REVOKE SELECT (hometown, current_city) ON public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_private_fields(_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec record;
  is_owner boolean := auth.uid() = _profile_id;
  is_friend boolean := public.are_friends(auth.uid(), _profile_id);
  result jsonb := '{}'::jsonb;
  fields text[] := ARRAY['relationship_status','phone','gender','birthdate','phone_number','hometown','current_city'];
  f text;
  vis text;
  allowed boolean;
  val text;
BEGIN
  IF _profile_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT relationship_status, phone, gender, birthdate, phone_number, hometown, current_city, privacy
    INTO rec
  FROM public.profiles
  WHERE id = _profile_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  FOREACH f IN ARRAY fields LOOP
    IF is_owner THEN
      allowed := true;
    ELSE
      SELECT visibility INTO vis
      FROM public.profile_field_privacy
      WHERE user_id = _profile_id AND field_name = f;

      IF vis IS NULL AND f IN ('hometown','current_city') THEN
        SELECT visibility INTO vis
        FROM public.profile_field_privacy
        WHERE user_id = _profile_id AND field_name = 'location';
      END IF;

      IF vis IS NULL THEN
        vis := COALESCE(
          rec.privacy ->> f,
          CASE WHEN f IN ('hometown','current_city') THEN rec.privacy ->> 'location' END,
          'public'
        );
      END IF;

      allowed := (vis = 'public') OR (vis = 'friends' AND is_friend);
    END IF;

    IF allowed THEN
      val := CASE f
        WHEN 'relationship_status' THEN rec.relationship_status
        WHEN 'phone' THEN rec.phone
        WHEN 'gender' THEN rec.gender
        WHEN 'birthdate' THEN rec.birthdate::text
        WHEN 'phone_number' THEN rec.phone_number
        WHEN 'hometown' THEN rec.hometown
        WHEN 'current_city' THEN rec.current_city
      END;
      result := result || jsonb_build_object(f, val);
    ELSE
      result := result || jsonb_build_object(f, NULL);
    END IF;
  END LOOP;

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_profile_private_fields(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_private_fields(uuid) TO authenticated;