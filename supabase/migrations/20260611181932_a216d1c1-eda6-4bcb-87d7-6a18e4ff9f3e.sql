-- Restrict direct read access to sensitive PII columns on profiles.
-- Owner and privacy-aware access continues through the SECURITY DEFINER
-- function public.get_profile_private_fields (already privacy aware).
-- UPDATE/INSERT privileges are preserved so users can still edit their own data.

REVOKE SELECT (relationship_status, phone, gender, birthdate, phone_number)
  ON public.profiles FROM anon;

REVOKE SELECT (relationship_status, phone, gender, birthdate, phone_number)
  ON public.profiles FROM authenticated;

-- service_role retains full access for backend/admin operations (ALL already granted).