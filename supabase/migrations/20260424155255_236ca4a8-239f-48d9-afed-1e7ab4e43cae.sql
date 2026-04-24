-- 1. Daily usage tracking table
CREATE TABLE IF NOT EXISTS public.novachat_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_novachat_usage_user_date 
  ON public.novachat_usage(user_id, usage_date DESC);

ALTER TABLE public.novachat_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage only
CREATE POLICY "Users read own nova usage"
  ON public.novachat_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Add Pro subscription flags to settings
ALTER TABLE public.novachat_settings
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 3. Atomic check + increment RPC (security definer so edge function can call it)
CREATE OR REPLACE FUNCTION public.check_and_increment_nova_usage(_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _daily_limit INTEGER := 10;
  _is_pro BOOLEAN := false;
  _pro_expires TIMESTAMPTZ;
  _used INTEGER := 0;
BEGIN
  -- Check pro status (treat expired pro as free)
  SELECT COALESCE(is_pro, false), pro_expires_at
  INTO _is_pro, _pro_expires
  FROM public.novachat_settings
  WHERE user_id = _user_id;

  IF _is_pro AND (_pro_expires IS NULL OR _pro_expires > now()) THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'is_pro', true,
      'used', 0,
      'limit', -1
    );
  END IF;

  -- Free tier: check today's usage
  SELECT COALESCE(message_count, 0) INTO _used
  FROM public.novachat_usage
  WHERE user_id = _user_id AND usage_date = CURRENT_DATE;

  IF _used >= _daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'is_pro', false,
      'used', _used,
      'limit', _daily_limit
    );
  END IF;

  -- Atomic increment via UPSERT
  INSERT INTO public.novachat_usage (user_id, usage_date, message_count)
  VALUES (_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET 
    message_count = public.novachat_usage.message_count + 1,
    updated_at = now()
  RETURNING message_count INTO _used;

  RETURN jsonb_build_object(
    'allowed', true,
    'is_pro', false,
    'used', _used,
    'limit', _daily_limit
  );
END;
$$;

-- 4. Read-only helper to fetch current usage without incrementing
CREATE OR REPLACE FUNCTION public.get_nova_usage_today(_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _daily_limit INTEGER := 10;
  _is_pro BOOLEAN := false;
  _pro_expires TIMESTAMPTZ;
  _used INTEGER := 0;
BEGIN
  SELECT COALESCE(is_pro, false), pro_expires_at
  INTO _is_pro, _pro_expires
  FROM public.novachat_settings
  WHERE user_id = _user_id;

  IF _is_pro AND (_pro_expires IS NULL OR _pro_expires > now()) THEN
    RETURN jsonb_build_object('is_pro', true, 'used', 0, 'limit', -1);
  END IF;

  SELECT COALESCE(message_count, 0) INTO _used
  FROM public.novachat_usage
  WHERE user_id = _user_id AND usage_date = CURRENT_DATE;

  RETURN jsonb_build_object('is_pro', false, 'used', _used, 'limit', _daily_limit);
END;
$$;

-- updated_at trigger
DROP TRIGGER IF EXISTS update_novachat_usage_updated_at ON public.novachat_usage;
CREATE TRIGGER update_novachat_usage_updated_at
  BEFORE UPDATE ON public.novachat_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();