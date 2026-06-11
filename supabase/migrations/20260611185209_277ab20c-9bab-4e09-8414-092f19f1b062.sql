-- 1. Attach protective trigger for payout_requests (function already exists)
DROP TRIGGER IF EXISTS protect_payout_request_fields_trg ON public.payout_requests;
CREATE TRIGGER protect_payout_request_fields_trg
  BEFORE INSERT OR UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.protect_payout_request_fields();

-- 2. Attach protective trigger for promotions (function already exists)
DROP TRIGGER IF EXISTS protect_promotion_fields_trg ON public.promotions;
CREATE TRIGGER protect_promotion_fields_trg
  BEFORE INSERT OR UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.protect_promotion_fields();

-- 3. Protect channel_monetization financial / eligibility fields
CREATE OR REPLACE FUNCTION public.protect_channel_monetization_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- service_role and admins bypass; only restrict ordinary authenticated owners
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_eligible           := false;
    NEW.total_watch_hours     := 0;
    NEW.revenue_balance_cents := 0;
    NEW.total_earnings_cents  := 0;
    NEW.cpm_rate_cents        := COALESCE(NEW.cpm_rate_cents, 0);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Owners may only edit payout_method, payout_email, minimum_payout_cents
    NEW.is_eligible           := OLD.is_eligible;
    NEW.total_watch_hours     := OLD.total_watch_hours;
    NEW.revenue_balance_cents := OLD.revenue_balance_cents;
    NEW.total_earnings_cents  := OLD.total_earnings_cents;
    NEW.cpm_rate_cents        := OLD.cpm_rate_cents;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_channel_monetization_fields_trg ON public.channel_monetization;
CREATE TRIGGER protect_channel_monetization_fields_trg
  BEFORE INSERT OR UPDATE ON public.channel_monetization
  FOR EACH ROW EXECUTE FUNCTION public.protect_channel_monetization_fields();

-- 4. Protect novachat_settings billing / pro fields
CREATE OR REPLACE FUNCTION public.protect_novachat_settings_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_pro                 := false;
    NEW.pro_expires_at         := NULL;
    NEW.stripe_customer_id     := NULL;
    NEW.stripe_subscription_id := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.is_pro                 := OLD.is_pro;
    NEW.pro_expires_at         := OLD.pro_expires_at;
    NEW.stripe_customer_id     := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_novachat_settings_fields_trg ON public.novachat_settings;
CREATE TRIGGER protect_novachat_settings_fields_trg
  BEFORE INSERT OR UPDATE ON public.novachat_settings
  FOR EACH ROW EXECUTE FUNCTION public.protect_novachat_settings_fields();