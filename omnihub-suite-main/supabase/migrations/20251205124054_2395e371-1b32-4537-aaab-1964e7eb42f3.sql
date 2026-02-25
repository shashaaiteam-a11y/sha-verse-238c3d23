
-- Channel membership tiers
CREATE TABLE public.channel_membership_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 499,
  benefits text[] DEFAULT '{}',
  badge_url text,
  created_at timestamptz DEFAULT now()
);

-- Channel memberships (user subscriptions to tiers)
CREATE TABLE public.channel_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  tier_id uuid REFERENCES public.channel_membership_tiers(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

-- Revenue transactions
CREATE TABLE public.revenue_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('ad_revenue', 'membership', 'superchat', 'premium_revenue')),
  amount_cents integer NOT NULL DEFAULT 0,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Payout requests
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  amount_cents integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_method text,
  payout_details jsonb DEFAULT '{}',
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Superchats (live stream tips)
CREATE TABLE public.superchats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  amount_cents integer NOT NULL,
  message text,
  color text DEFAULT 'blue',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.channel_membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superchats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for membership tiers
CREATE POLICY "Anyone can view membership tiers" ON public.channel_membership_tiers FOR SELECT USING (true);
CREATE POLICY "Channel owners can manage tiers" ON public.channel_membership_tiers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.channels WHERE id = channel_id AND user_id = auth.uid())
);

-- RLS Policies for memberships
CREATE POLICY "Users can view their memberships" ON public.channel_memberships FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Channel owners can view their channel memberships" ON public.channel_memberships FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.channels WHERE id = channel_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create memberships" ON public.channel_memberships FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their memberships" ON public.channel_memberships FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for revenue
CREATE POLICY "Channel owners can view their revenue" ON public.revenue_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.channels WHERE id = channel_id AND user_id = auth.uid())
);

-- RLS Policies for payouts
CREATE POLICY "Channel owners can manage their payouts" ON public.payout_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.channels WHERE id = channel_id AND user_id = auth.uid())
);

-- RLS Policies for superchats
CREATE POLICY "Anyone can view superchats" ON public.superchats FOR SELECT USING (true);
CREATE POLICY "Users can send superchats" ON public.superchats FOR INSERT WITH CHECK (user_id = auth.uid());

-- Add monetization fields to channel_monetization if not exists
ALTER TABLE public.channel_monetization 
  ADD COLUMN IF NOT EXISTS minimum_payout_cents integer DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS payout_email text;
