
REVOKE SELECT (phone, phone_number, birthdate, gender, relationship_status)
  ON public.profiles FROM authenticated, anon;
