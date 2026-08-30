CREATE OR REPLACE FUNCTION public.enforce_channel_monetization_owner_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.channel_id IS DISTINCT FROM OLD.channel_id
     OR NEW.is_eligible IS DISTINCT FROM OLD.is_eligible
     OR NEW.total_watch_hours IS DISTINCT FROM OLD.total_watch_hours
     OR NEW.revenue_balance_cents IS DISTINCT FROM OLD.revenue_balance_cents
     OR NEW.total_earnings_cents IS DISTINCT FROM OLD.total_earnings_cents
     OR NEW.cpm_rate_cents IS DISTINCT FROM OLD.cpm_rate_cents
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Channel owners may only update payout settings';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_channel_monetization_fields ON public.channel_monetization;
DROP TRIGGER IF EXISTS protect_channel_monetization_fields_trg ON public.channel_monetization;
DROP TRIGGER IF EXISTS protect_monetization_financials_trigger ON public.channel_monetization;
CREATE TRIGGER enforce_channel_monetization_owner_scope
BEFORE UPDATE ON public.channel_monetization
FOR EACH ROW EXECUTE FUNCTION public.enforce_channel_monetization_owner_scope();

REVOKE ALL ON FUNCTION public.enforce_channel_monetization_owner_scope() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_channel_monetization_owner_scope() TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_creator_badge_owner_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.channel_id IS DISTINCT FROM OLD.channel_id
     OR NEW.badge_level IS DISTINCT FROM OLD.badge_level
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.total_followers IS DISTINCT FROM OLD.total_followers
     OR NEW.total_boosts_received IS DISTINCT FROM OLD.total_boosts_received
     OR NEW.total_motions IS DISTINCT FROM OLD.total_motions
     OR NEW.achievements IS DISTINCT FROM OLD.achievements
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Channel owners may only update the badge icon';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_creator_badge_fields ON public.creator_badges;
CREATE TRIGGER enforce_creator_badge_owner_scope
BEFORE UPDATE ON public.creator_badges
FOR EACH ROW EXECUTE FUNCTION public.enforce_creator_badge_owner_scope();

REVOKE ALL ON FUNCTION public.enforce_creator_badge_owner_scope() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_creator_badge_owner_scope() TO service_role;