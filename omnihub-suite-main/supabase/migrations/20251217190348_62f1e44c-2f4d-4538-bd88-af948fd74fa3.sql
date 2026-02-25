-- Add new columns to stories table for text stories and privacy
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS text_content TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS story_type TEXT DEFAULT 'media',
ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'friends';

-- Create story_reactions table
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Enable RLS on story_reactions
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for story_reactions
CREATE POLICY "Users can create reactions on visible stories"
ON public.story_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view reactions on stories they can see"
ON public.story_reactions
FOR SELECT
USING (true);

CREATE POLICY "Users can delete own reactions"
ON public.story_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Create story_replies table (uses DM system)
CREATE TABLE IF NOT EXISTS public.story_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on story_replies
ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;

-- RLS policies for story_replies
CREATE POLICY "Users can send replies to stories"
ON public.story_replies
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Story owner and sender can view replies"
ON public.story_replies
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Add viewed_at timestamp to story_views if not exists
ALTER TABLE public.story_views 
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for faster story queries
CREATE INDEX IF NOT EXISTS idx_stories_user_expires ON public.stories(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON public.story_reactions(story_id);

-- Enable realtime for story tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_replies;