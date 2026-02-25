-- Motion Module: Add creator boosts table for monetization
CREATE TABLE IF NOT EXISTS public.creator_boosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  message TEXT,
  boost_tier TEXT NOT NULL DEFAULT 'standard',
  animation_type TEXT DEFAULT 'sparkle',
  is_highlighted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Creator earnings summary view data
CREATE TABLE IF NOT EXISTS public.creator_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  ad_revenue_cents BIGINT DEFAULT 0,
  boost_revenue_cents BIGINT DEFAULT 0,
  membership_revenue_cents BIGINT DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_watch_minutes BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Creator verification/badge levels
CREATE TABLE IF NOT EXISTS public.creator_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE UNIQUE,
  badge_level TEXT NOT NULL DEFAULT 'newcomer',
  badge_icon_url TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  total_followers INTEGER DEFAULT 0,
  total_boosts_received INTEGER DEFAULT 0,
  total_motions INTEGER DEFAULT 0,
  achievements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_boosts
CREATE POLICY "Anyone can view boosts" ON public.creator_boosts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send boosts" ON public.creator_boosts FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for creator_earnings
CREATE POLICY "Channel owners can view their earnings" ON public.creator_earnings FOR SELECT USING (
  EXISTS (SELECT 1 FROM channels WHERE channels.id = creator_earnings.channel_id AND channels.user_id = auth.uid())
);

-- RLS Policies for creator_badges
CREATE POLICY "Anyone can view badges" ON public.creator_badges FOR SELECT USING (true);
CREATE POLICY "Channel owners can update their badges" ON public.creator_badges FOR UPDATE USING (
  EXISTS (SELECT 1 FROM channels WHERE channels.id = creator_badges.channel_id AND channels.user_id = auth.uid())
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_boosts_channel ON public.creator_boosts(channel_id);
CREATE INDEX IF NOT EXISTS idx_creator_boosts_video ON public.creator_boosts(video_id);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_channel ON public.creator_earnings(channel_id);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_period ON public.creator_earnings(period_start, period_end);