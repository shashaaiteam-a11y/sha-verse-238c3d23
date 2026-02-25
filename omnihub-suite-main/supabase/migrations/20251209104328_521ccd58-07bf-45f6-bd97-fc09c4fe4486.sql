-- Add is_verified column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Add media array support for posts (multiple images, videos, files)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS poll_data jsonb DEFAULT NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_posts_media_urls ON public.posts USING GIN (media_urls);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles (is_verified) WHERE is_verified = true;