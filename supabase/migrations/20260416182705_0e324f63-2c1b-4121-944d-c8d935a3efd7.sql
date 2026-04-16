-- User ad preferences (hidden ads, blocked categories)
CREATE TABLE public.user_ad_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  hidden_ad_id TEXT,
  blocked_category TEXT,
  blocked_until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_ad_preferences_user ON public.user_ad_preferences(user_id);
CREATE INDEX idx_user_ad_preferences_blocked_until ON public.user_ad_preferences(blocked_until);

ALTER TABLE public.user_ad_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ad preferences"
ON public.user_ad_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ad preferences"
ON public.user_ad_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ad preferences"
ON public.user_ad_preferences FOR DELETE
USING (auth.uid() = user_id);

-- Rewarded ad unlocks (NovaChat msgs, book access, Movion ad-free time, group boosts)
CREATE TABLE public.rewarded_ad_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value INTEGER NOT NULL DEFAULT 0,
  resource_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE,
  consumed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_rewarded_ad_unlocks_user ON public.rewarded_ad_unlocks(user_id);
CREATE INDEX idx_rewarded_ad_unlocks_type ON public.rewarded_ad_unlocks(user_id, reward_type);
CREATE INDEX idx_rewarded_ad_unlocks_expires ON public.rewarded_ad_unlocks(expires_at);

ALTER TABLE public.rewarded_ad_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rewards"
ON public.rewarded_ad_unlocks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rewards"
ON public.rewarded_ad_unlocks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rewards"
ON public.rewarded_ad_unlocks FOR UPDATE
USING (auth.uid() = user_id);

-- Add user_id and ad_unit_id to ad_impressions for frequency control
ALTER TABLE public.ad_impressions
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS ad_unit_id TEXT,
ADD COLUMN IF NOT EXISTS ad_category TEXT,
ADD COLUMN IF NOT EXISTS placement TEXT;

CREATE INDEX IF NOT EXISTS idx_ad_impressions_user_created ON public.ad_impressions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad_unit ON public.ad_impressions(user_id, ad_unit_id, created_at);

ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ad impressions" ON public.ad_impressions;
CREATE POLICY "Users can view their own ad impressions"
ON public.ad_impressions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own ad impressions" ON public.ad_impressions;
CREATE POLICY "Users can create their own ad impressions"
ON public.ad_impressions FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);