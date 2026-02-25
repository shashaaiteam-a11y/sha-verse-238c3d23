-- Video Interactions for AI Recommendations
CREATE TABLE IF NOT EXISTS public.video_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'dislike', 'save', 'share', 'skip', 'watch_complete')),
  watch_duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Content Fingerprint for Copyright Detection
CREATE TABLE IF NOT EXISTS public.content_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  audio_hash TEXT,
  video_hash TEXT,
  combined_hash TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(combined_hash)
);

-- Copyright Claims
CREATE TABLE IF NOT EXISTS public.copyright_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL,
  original_video_id UUID REFERENCES public.videos(id),
  match_percentage DECIMAL(5,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disputed')),
  action TEXT CHECK (action IN ('block', 'monetize', 'share_revenue', 'mute_audio')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- Enable RLS
ALTER TABLE public.video_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copyright_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_interactions
CREATE POLICY "Users can view their own interactions"
  ON public.video_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interactions"
  ON public.video_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for content_fingerprints
CREATE POLICY "Anyone can view fingerprints"
  ON public.content_fingerprints FOR SELECT
  USING (true);

CREATE POLICY "Video owners can create fingerprints"
  ON public.content_fingerprints FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- RLS Policies for copyright_claims
CREATE POLICY "Users can view their claims"
  ON public.copyright_claims FOR SELECT
  USING (auth.uid() = claimant_id OR EXISTS (
    SELECT 1 FROM videos WHERE id = video_id AND channel_id IN (
      SELECT id FROM channels WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can create claims"
  ON public.copyright_claims FOR INSERT
  WITH CHECK (auth.uid() = claimant_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_interactions_user ON public.video_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_interactions_video ON public.video_interactions(video_id);
CREATE INDEX IF NOT EXISTS idx_video_interactions_type ON public.video_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_content_fingerprints_hash ON public.content_fingerprints(combined_hash);
CREATE INDEX IF NOT EXISTS idx_copyright_claims_status ON public.copyright_claims(status);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_later;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_interactions;