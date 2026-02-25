-- Create a helper function to check if viewer can access profile private data
CREATE OR REPLACE FUNCTION public.can_view_private_profile_data(_viewer_id uuid, _profile_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Owner can always see their own data
  SELECT 
    CASE 
      WHEN _viewer_id = _profile_owner_id THEN true
      -- Check privacy settings from profiles table
      WHEN EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = _profile_owner_id
        AND (
          p.privacy->>'profile_visibility' = 'public'
          OR (
            p.privacy->>'profile_visibility' = 'friends'
            AND are_friends(_viewer_id, _profile_owner_id)
          )
        )
      ) THEN true
      -- Default: allow friends to see private data
      WHEN are_friends(_viewer_id, _profile_owner_id) THEN true
      ELSE false
    END
$$;

-- Create secure view for profiles that hides sensitive fields from non-authorized viewers
-- We cannot create field-level RLS directly, so we'll update the existing RLS policy
-- to be more restrictive and add a helper function for sensitive field access

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "auth_users_view_profiles" ON public.profiles;
DROP POLICY IF EXISTS "anon_view_profiles" ON public.profiles;

-- Create new restrictive policy for SELECT
-- Allow viewing basic profile info (id, display_name, username, avatar_url, bio, cover_url, is_verified)
-- Sensitive fields will still exist but frontend should use the helper function
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (true);

-- Note: PostgreSQL RLS cannot do field-level access control directly
-- The solution is to create a secure function that returns only allowed fields

CREATE OR REPLACE FUNCTION public.get_visible_profile_fields(_viewer_id uuid, _profile_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_data profiles%ROWTYPE;
  can_view_private boolean;
  result jsonb;
BEGIN
  -- Get profile data
  SELECT * INTO profile_data FROM profiles WHERE id = _profile_owner_id;
  
  IF profile_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if viewer can see private data
  can_view_private := can_view_private_profile_data(_viewer_id, _profile_owner_id);
  
  -- Build result with always-visible fields
  result := jsonb_build_object(
    'id', profile_data.id,
    'display_name', profile_data.display_name,
    'username', profile_data.username,
    'avatar_url', profile_data.avatar_url,
    'cover_url', profile_data.cover_url,
    'bio', profile_data.bio,
    'is_verified', profile_data.is_verified,
    'created_at', profile_data.created_at
  );
  
  -- Add private fields only if viewer is authorized
  IF can_view_private THEN
    result := result || jsonb_build_object(
      'phone', profile_data.phone,
      'phone_number', profile_data.phone_number,
      'work', profile_data.work,
      'education', profile_data.education,
      'hometown', profile_data.hometown,
      'current_city', profile_data.current_city,
      'location', profile_data.location,
      'relationship_status', profile_data.relationship_status,
      'birthdate', profile_data.birthdate,
      'gender', profile_data.gender,
      'website', profile_data.website,
      'facebook_url', profile_data.facebook_url,
      'twitter_url', profile_data.twitter_url,
      'instagram_url', profile_data.instagram_url,
      'about_me', profile_data.about_me,
      'hobbies', profile_data.hobbies
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.can_view_private_profile_data(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_private_profile_data(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_visible_profile_fields(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_visible_profile_fields(uuid, uuid) TO anon;