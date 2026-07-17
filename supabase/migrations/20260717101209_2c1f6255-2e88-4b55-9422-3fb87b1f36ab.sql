-- Fix 1: Restore SELECT on non-sensitive profile columns that were missing column-level grants.
-- Sensitive PII columns (phone, phone_number, birthdate, gender, relationship_status) remain
-- table-level revoked and are read via the get_profile_private_fields RPC.
GRANT SELECT (work, education, hometown, current_city) ON public.profiles TO authenticated;
GRANT SELECT (work, education, hometown, current_city) ON public.profiles TO anon;

-- Fix 2: Backfill existing channels that were left in 'pending' before the strict
-- approval-based visibility policy was introduced. New channels created after this
-- migration still follow the normal approval workflow.
UPDATE public.channels
SET approval_status = 'approved'
WHERE approval_status = 'pending';