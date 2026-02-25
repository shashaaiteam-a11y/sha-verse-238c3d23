-- Add reaction_type column to likes table for multi-reaction support
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS reaction_type text DEFAULT 'like';

-- Update existing likes to have 'like' as default reaction type
UPDATE public.likes SET reaction_type = 'like' WHERE reaction_type IS NULL;

-- Create index for faster reaction queries
CREATE INDEX IF NOT EXISTS idx_likes_reaction_type ON public.likes(reaction_type);
CREATE INDEX IF NOT EXISTS idx_likes_post_reaction ON public.likes(post_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_likes_group_post_reaction ON public.likes(group_post_id, reaction_type);

-- Add saved_posts table for bookmarking posts
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  group_post_id UUID REFERENCES public.group_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT saved_posts_unique_post UNIQUE(user_id, post_id),
  CONSTRAINT saved_posts_unique_group_post UNIQUE(user_id, group_post_id)
);

-- Enable RLS on saved_posts
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_posts
CREATE POLICY "Users can view own saved posts" ON public.saved_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts" ON public.saved_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts" ON public.saved_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Add parent_comment_id to comments for nested replies (1-level)
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for nested comments
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_comment_id);

-- Add pinned column to posts if not exists
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;

-- Enable realtime for saved_posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_posts;