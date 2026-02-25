-- Add website_url column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS website_url text;

-- Update existing website column to website_url for consistency
UPDATE public.profiles 
SET website_url = website 
WHERE website_url IS NULL AND website IS NOT NULL;

-- Create indexes for better performance on social links
CREATE INDEX IF NOT EXISTS idx_profiles_facebook_url ON public.profiles(facebook_url);
CREATE INDEX IF NOT EXISTS idx_profiles_instagram_url ON public.profiles(instagram_url);
CREATE INDEX IF NOT EXISTS idx_profiles_twitter_url ON public.profiles(twitter_url);
CREATE INDEX IF NOT EXISTS idx_profiles_website_url ON public.profiles(website_url);

-- Add real-time publication for profiles table to enable live updates
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
CREATE PUBLICATION supabase_realtime FOR TABLE profiles;