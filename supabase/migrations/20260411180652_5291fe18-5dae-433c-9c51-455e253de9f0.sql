-- Create playlist_videos junction table
CREATE TABLE public.playlist_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, video_id)
);

-- Enable RLS
ALTER TABLE public.playlist_videos ENABLE ROW LEVEL SECURITY;

-- Users can view playlist videos if they own the playlist or it's public
CREATE POLICY "Users can view own playlist videos"
ON public.playlist_videos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_videos.playlist_id
    AND (playlists.user_id = auth.uid() OR playlists.is_public = true)
  )
);

-- Users can add videos to their own playlists
CREATE POLICY "Users can add videos to own playlists"
ON public.playlist_videos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_videos.playlist_id
    AND playlists.user_id = auth.uid()
  )
);

-- Users can update position in their own playlists
CREATE POLICY "Users can update own playlist videos"
ON public.playlist_videos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_videos.playlist_id
    AND playlists.user_id = auth.uid()
  )
);

-- Users can remove videos from their own playlists
CREATE POLICY "Users can delete from own playlists"
ON public.playlist_videos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_videos.playlist_id
    AND playlists.user_id = auth.uid()
  )
);

-- Index for fast lookups
CREATE INDEX idx_playlist_videos_playlist ON public.playlist_videos(playlist_id);
CREATE INDEX idx_playlist_videos_video ON public.playlist_videos(video_id);