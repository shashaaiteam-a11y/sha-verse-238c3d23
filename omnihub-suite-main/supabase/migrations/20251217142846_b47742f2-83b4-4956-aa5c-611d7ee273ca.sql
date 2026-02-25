-- Create poll_options table
CREATE TABLE public.poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll_votes table
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Unique constraint: one vote per user per poll
  CONSTRAINT unique_user_poll_vote UNIQUE (post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for poll_options
CREATE POLICY "Poll options viewable by everyone"
ON public.poll_options FOR SELECT
USING (true);

CREATE POLICY "Post owners can create poll options"
ON public.poll_options FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = poll_options.post_id
    AND posts.user_id = auth.uid()
  )
);

CREATE POLICY "Post owners can delete poll options"
ON public.poll_options FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = poll_options.post_id
    AND posts.user_id = auth.uid()
  )
);

-- RLS policies for poll_votes
CREATE POLICY "Users can view poll votes"
ON public.poll_votes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can vote"
ON public.poll_votes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_poll_options_post_id ON public.poll_options(post_id);
CREATE INDEX idx_poll_votes_post_id ON public.poll_votes(post_id);
CREATE INDEX idx_poll_votes_user_id ON public.poll_votes(user_id);
CREATE INDEX idx_poll_votes_option_id ON public.poll_votes(option_id);

-- Enable realtime for poll tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;