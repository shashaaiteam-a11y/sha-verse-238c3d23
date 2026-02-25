-- Add more profile fields for Facebook-like functionality
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS work text,
ADD COLUMN IF NOT EXISTS education text,
ADD COLUMN IF NOT EXISTS hometown text,
ADD COLUMN IF NOT EXISTS current_city text,
ADD COLUMN IF NOT EXISTS relationship_status text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS twitter_url text,
ADD COLUMN IF NOT EXISTS hobbies text[],
ADD COLUMN IF NOT EXISTS about_me text;

-- Add profile visibility settings
CREATE TABLE IF NOT EXISTS public.profile_field_privacy (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'only_me', 'custom')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, field_name)
);

ALTER TABLE public.profile_field_privacy ENABLE ROW LEVEL SECURITY;

-- RLS for profile field privacy
CREATE POLICY "Users can view their own privacy settings"
ON public.profile_field_privacy FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own privacy settings"
ON public.profile_field_privacy FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings"
ON public.profile_field_privacy FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own privacy settings"
ON public.profile_field_privacy FOR DELETE
USING (auth.uid() = user_id);

-- Create activity/timeline events table
CREATE TABLE IF NOT EXISTS public.profile_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('post', 'photo', 'cover_change', 'profile_pic_change', 'friend_add', 'life_event')),
  content text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profile_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activities are viewable based on friendship"
ON public.profile_activities FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user_id = auth.uid() AND friend_id = profile_activities.user_id AND status = 'accepted')
    OR (friend_id = auth.uid() AND user_id = profile_activities.user_id AND status = 'accepted')
  )
);

CREATE POLICY "Users can create their own activities"
ON public.profile_activities FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for profile activities
CREATE INDEX IF NOT EXISTS idx_profile_activities_user_id ON public.profile_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_activities_created_at ON public.profile_activities(created_at DESC);

-- Add trigger for profile field privacy
CREATE TRIGGER update_profile_field_privacy_updated_at
BEFORE UPDATE ON public.profile_field_privacy
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();