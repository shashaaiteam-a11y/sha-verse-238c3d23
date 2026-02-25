-- Create table for video qualities/resolutions
CREATE TABLE public.video_qualities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  resolution TEXT NOT NULL, -- '360p', '720p', '1080p', 'original'
  video_url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  bitrate INTEGER, -- in kbps
  file_size BIGINT, -- in bytes
  status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'ready', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for transcoding jobs
CREATE TABLE public.transcoding_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progress INTEGER DEFAULT 0, -- 0-100
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add HLS manifest URL to videos table
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS hls_url TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS transcoding_status TEXT DEFAULT 'pending';

-- Enable RLS
ALTER TABLE public.video_qualities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcoding_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_qualities (public read, owner write via channel)
CREATE POLICY "Video qualities are viewable by everyone"
ON public.video_qualities FOR SELECT USING (true);

CREATE POLICY "Channel owners can manage video qualities"
ON public.video_qualities FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.channels c ON v.channel_id = c.id
    WHERE v.id = video_qualities.video_id AND c.user_id = auth.uid()
  )
);

-- RLS policies for transcoding_jobs
CREATE POLICY "Transcoding jobs viewable by video owner"
ON public.transcoding_jobs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.channels c ON v.channel_id = c.id
    WHERE v.id = transcoding_jobs.video_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage transcoding jobs"
ON public.transcoding_jobs FOR ALL
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_video_qualities_video_id ON public.video_qualities(video_id);
CREATE INDEX idx_transcoding_jobs_video_id ON public.transcoding_jobs(video_id);
CREATE INDEX idx_transcoding_jobs_status ON public.transcoding_jobs(status);