-- 1) Lock down channel payout fields (no client write access)
CREATE OR REPLACE FUNCTION public.protect_monetization_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow service_role / admin to bypass
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.revenue_balance_cents IS DISTINCT FROM OLD.revenue_balance_cents THEN
    RAISE EXCEPTION 'revenue_balance_cents cannot be modified by client';
  END IF;
  IF NEW.total_earnings_cents IS DISTINCT FROM OLD.total_earnings_cents THEN
    RAISE EXCEPTION 'total_earnings_cents cannot be modified by client';
  END IF;
  IF NEW.is_eligible IS DISTINCT FROM OLD.is_eligible THEN
    RAISE EXCEPTION 'is_eligible cannot be modified by client';
  END IF;
  IF NEW.channel_id IS DISTINCT FROM OLD.channel_id THEN
    RAISE EXCEPTION 'channel_id cannot be modified';
  END IF;
  -- Payout fields must be changed via billing system / admins only
  IF NEW.payout_email IS DISTINCT FROM OLD.payout_email THEN
    RAISE EXCEPTION 'payout_email cannot be modified by client';
  END IF;
  IF NEW.payout_method IS DISTINCT FROM OLD.payout_method THEN
    RAISE EXCEPTION 'payout_method cannot be modified by client';
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Profile private-field gating
-- Remove direct column read access for sensitive fields
REVOKE SELECT (relationship_status, phone, gender, birthdate, phone_number)
  ON public.profiles FROM authenticated;
REVOKE SELECT (relationship_status, phone, gender, birthdate, phone_number)
  ON public.profiles FROM anon;

-- Secure accessor that applies friendship + per-field privacy gating
CREATE OR REPLACE FUNCTION public.get_profile_private_fields(_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec record;
  is_owner boolean := auth.uid() = _profile_id;
  is_friend boolean := public.are_friends(auth.uid(), _profile_id);
  result jsonb := '{}'::jsonb;
  fields text[] := ARRAY['relationship_status','phone','gender','birthdate','phone_number'];
  f text;
  vis text;
  allowed boolean;
  val text;
BEGIN
  IF _profile_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT relationship_status, phone, gender, birthdate, phone_number, privacy
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

      IF vis IS NULL THEN
        vis := COALESCE(rec.privacy ->> f, 'public');
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
      END;
      result := result || jsonb_build_object(f, val);
    ELSE
      result := result || jsonb_build_object(f, NULL);
    END IF;
  END LOOP;

  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_profile_private_fields(uuid) TO authenticated;