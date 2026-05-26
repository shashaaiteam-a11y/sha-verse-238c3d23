
-- 1. Add mux_asset_id to transcoding_jobs (server-side source of truth)
ALTER TABLE public.transcoding_jobs
  ADD COLUMN IF NOT EXISTS mux_asset_id text;

CREATE INDEX IF NOT EXISTS idx_transcoding_jobs_mux_asset_id
  ON public.transcoding_jobs(mux_asset_id);

-- 2. Prevent self-grant of NovaChat Pro / Stripe identifiers
CREATE OR REPLACE FUNCTION public.prevent_novachat_pro_self_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (Stripe webhook) to update anything
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.is_pro IS DISTINCT FROM OLD.is_pro
     OR NEW.pro_expires_at IS DISTINCT FROM OLD.pro_expires_at
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
  THEN
    RAISE EXCEPTION 'Pro status and Stripe identifiers can only be changed by the billing system';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_novachat_pro_self_grant ON public.novachat_settings;
CREATE TRIGGER trg_prevent_novachat_pro_self_grant
  BEFORE UPDATE ON public.novachat_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_novachat_pro_self_grant();

-- 3. Prevent self-grant of channel_monetization.is_eligible / payout status
CREATE OR REPLACE FUNCTION public.prevent_monetization_self_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_eligible IS TRUE THEN
      RAISE EXCEPTION 'is_eligible cannot be set directly; use apply_for_partner()';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_eligible IS DISTINCT FROM OLD.is_eligible THEN
    RAISE EXCEPTION 'is_eligible can only be changed via apply_for_partner() or by the billing system';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_monetization_self_grant ON public.channel_monetization;
CREATE TRIGGER trg_prevent_monetization_self_grant
  BEFORE INSERT OR UPDATE ON public.channel_monetization
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_monetization_self_grant();

-- 4. Server-side Partner Program eligibility RPC
CREATE OR REPLACE FUNCTION public.apply_for_partner(_channel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _subs int;
  _watch_seconds bigint;
  _shorts_views bigint;
  _eligible boolean;
  PARTNER_SUBS constant int := 1000;
  PARTNER_WATCH_HOURS constant int := 4000;
  PARTNER_SHORTS_VIEWS constant bigint := 3000000;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.channels
    WHERE id = _channel_id AND user_id = _uid
  ) THEN
    RAISE EXCEPTION 'Not authorized for this channel';
  END IF;

  SELECT COALESCE(subscribers_count, 0) INTO _subs
  FROM public.channels WHERE id = _channel_id;

  SELECT COALESCE(SUM(va.watch_time_seconds), 0) INTO _watch_seconds
  FROM public.video_analytics va
  JOIN public.videos v ON v.id = va.video_id
  WHERE v.channel_id = _channel_id
    AND va.date >= (current_date - interval '30 days');

  SELECT COALESCE(SUM(views_count), 0) INTO _shorts_views
  FROM public.videos
  WHERE channel_id = _channel_id
    AND is_short = true
    AND created_at >= (now() - interval '90 days');

  _eligible := (_subs >= PARTNER_SUBS AND (_watch_seconds / 3600) >= PARTNER_WATCH_HOURS)
               OR _shorts_views >= PARTNER_SHORTS_VIEWS;

  IF NOT _eligible THEN
    RAISE EXCEPTION 'Channel does not meet Partner Program requirements';
  END IF;

  -- Bypass trigger by running as definer + setting local role
  INSERT INTO public.channel_monetization (channel_id, is_eligible)
  VALUES (_channel_id, true)
  ON CONFLICT (channel_id) DO UPDATE SET is_eligible = true;
EXCEPTION WHEN unique_violation THEN
  UPDATE public.channel_monetization SET is_eligible = true WHERE channel_id = _channel_id;
END;
$$;

-- Make sure the trigger lets the SECURITY DEFINER RPC through.
-- The trigger above blocks based on session role; SECURITY DEFINER runs as the
-- function owner (postgres) which is not 'service_role'. So we need to bypass
-- inside the RPC: set a session GUC the trigger respects.
CREATE OR REPLACE FUNCTION public.prevent_monetization_self_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR current_setting('app.allow_monetization_update', true) = 'on'
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_eligible IS TRUE THEN
      RAISE EXCEPTION 'is_eligible cannot be set directly; use apply_for_partner()';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_eligible IS DISTINCT FROM OLD.is_eligible THEN
    RAISE EXCEPTION 'is_eligible can only be changed via apply_for_partner() or by the billing system';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_for_partner(_channel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _subs int;
  _watch_seconds bigint;
  _shorts_views bigint;
  _eligible boolean;
  PARTNER_SUBS constant int := 1000;
  PARTNER_WATCH_HOURS constant int := 4000;
  PARTNER_SHORTS_VIEWS constant bigint := 3000000;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.channels
    WHERE id = _channel_id AND user_id = _uid
  ) THEN
    RAISE EXCEPTION 'Not authorized for this channel';
  END IF;

  SELECT COALESCE(subscribers_count, 0) INTO _subs
  FROM public.channels WHERE id = _channel_id;

  SELECT COALESCE(SUM(va.watch_time_seconds), 0) INTO _watch_seconds
  FROM public.video_analytics va
  JOIN public.videos v ON v.id = va.video_id
  WHERE v.channel_id = _channel_id
    AND va.date >= (current_date - interval '30 days');

  SELECT COALESCE(SUM(views_count), 0) INTO _shorts_views
  FROM public.videos
  WHERE channel_id = _channel_id
    AND is_short = true
    AND created_at >= (now() - interval '90 days');

  _eligible := (_subs >= PARTNER_SUBS AND (_watch_seconds / 3600) >= PARTNER_WATCH_HOURS)
               OR _shorts_views >= PARTNER_SHORTS_VIEWS;

  IF NOT _eligible THEN
    RAISE EXCEPTION 'Channel does not meet Partner Program requirements';
  END IF;

  PERFORM set_config('app.allow_monetization_update', 'on', true);

  INSERT INTO public.channel_monetization (channel_id, is_eligible)
  VALUES (_channel_id, true)
  ON CONFLICT (channel_id) DO UPDATE SET is_eligible = true;

  PERFORM set_config('app.allow_monetization_update', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_for_partner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_for_partner(uuid) TO authenticated;
