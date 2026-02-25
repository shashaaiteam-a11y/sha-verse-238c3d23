-- Add phone_number and provider fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);

-- Update the handle_new_user function to handle different providers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url, phone_number, provider, last_login)
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
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
    provider = COALESCE(EXCLUDED.provider, profiles.provider),
    last_login = NOW();
  RETURN NEW;
END;
$$;

-- Create login attempts tracking table for security
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- email or phone
  attempt_type TEXT NOT NULL, -- 'email', 'phone', 'google'
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on login_attempts
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts from authenticated and anonymous users (for tracking)
CREATE POLICY "Allow insert login attempts" ON public.login_attempts
FOR INSERT WITH CHECK (true);

-- Only allow admins/service role to read login attempts
CREATE POLICY "Service role can read login attempts" ON public.login_attempts
FOR SELECT USING (false);

-- Create index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_created 
ON public.login_attempts(identifier, created_at DESC);

-- Function to check rate limiting (max 5 attempts per 15 minutes)
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier TEXT, p_attempt_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM public.login_attempts
  WHERE identifier = p_identifier
    AND attempt_type = p_attempt_type
    AND created_at > NOW() - INTERVAL '15 minutes';
  
  RETURN attempt_count < 5;
END;
$$;