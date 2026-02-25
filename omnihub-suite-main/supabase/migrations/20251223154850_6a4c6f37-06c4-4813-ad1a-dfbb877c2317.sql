-- Channel Approval System & Video Management Requests

-- Add approval status to channels table
ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Video management requests table for edit/delete approval
CREATE TABLE IF NOT EXISTS public.video_management_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES auth.users(id) NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('edit', 'delete')),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  -- For edit requests, store the proposed changes
  proposed_changes JSONB,
  -- Admin response
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Channel approval requests history/log
CREATE TABLE IF NOT EXISTS public.channel_approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'resubmitted')),
  performed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Watch later table (separate from saved_videos for better UX)
CREATE TABLE IF NOT EXISTS public.watch_later (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS on new tables
ALTER TABLE public.video_management_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_later ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_management_requests
CREATE POLICY "Users can view own video requests" 
ON public.video_management_requests 
FOR SELECT 
USING (requested_by = auth.uid());

CREATE POLICY "Users can create requests for own videos"
ON public.video_management_requests
FOR INSERT
WITH CHECK (
  requested_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.channels c
    JOIN public.videos v ON v.channel_id = c.id
    WHERE v.id = video_id AND c.user_id = auth.uid()
  )
);

-- RLS Policies for channel_approval_logs
CREATE POLICY "Users can view own channel logs"
ON public.channel_approval_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.channels
    WHERE id = channel_id AND user_id = auth.uid()
  )
);

-- RLS Policies for watch_later
CREATE POLICY "Users can manage own watch later"
ON public.watch_later
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_requests_video ON public.video_management_requests(video_id);
CREATE INDEX IF NOT EXISTS idx_video_requests_status ON public.video_management_requests(status);
CREATE INDEX IF NOT EXISTS idx_channel_logs_channel ON public.channel_approval_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_watch_later_user ON public.watch_later(user_id);