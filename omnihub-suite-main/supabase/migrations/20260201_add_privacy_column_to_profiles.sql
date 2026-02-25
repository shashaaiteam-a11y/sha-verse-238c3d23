-- Add privacy column to profiles table as JSONB for storing field-level privacy settings
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS privacy JSONB DEFAULT '{}'::jsonb;

-- Add a GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_profiles_privacy ON public.profiles USING GIN (privacy);

-- Update existing profiles to have default privacy settings
UPDATE public.profiles 
SET privacy = '{
  "email": "friends",
  "phone": "friends", 
  "birthdate": "friends",
  "location": "friends",
  "work": "friends",
  "education": "friends",
  "relationship": "friends",
  "friends_list": "friends"
}'::jsonb
WHERE privacy IS NULL OR privacy = '{}'::jsonb;

-- Update the handle_new_user function to initialize privacy settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url, phone_number, provider, last_login, privacy)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'User'
    ),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NEW.phone,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    NOW(),
    '{
      "email": "friends",
      "phone": "friends", 
      "birthdate": "friends",
      "location": "friends",
      "work": "friends",
      "education": "friends",
      "relationship": "friends",
      "friends_list": "friends"
    }'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
    provider = COALESCE(EXCLUDED.provider, profiles.provider),
    last_login = NOW(),
    privacy = COALESCE(profiles.privacy, EXCLUDED.privacy);
  RETURN NEW;
END;
$$;