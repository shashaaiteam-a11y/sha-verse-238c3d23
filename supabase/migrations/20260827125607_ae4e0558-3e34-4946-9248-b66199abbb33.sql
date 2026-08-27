-- Guard: channel owners cannot self-approve
CREATE OR REPLACE FUNCTION public.guard_channel_approval_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Owner may only move their channel back to 'pending' (submit for review)
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     AND NEW.approval_status <> 'pending' THEN
    NEW.approval_status := OLD.approval_status;
  END IF;

  NEW.approved_at := OLD.approved_at;
  NEW.approved_by := OLD.approved_by;

  IF NEW.approval_status = 'pending' AND OLD.approval_status IS DISTINCT FROM 'pending' THEN
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_channel_approval_fields ON public.channels;
CREATE TRIGGER guard_channel_approval_fields
BEFORE UPDATE ON public.channels
FOR EACH ROW EXECUTE FUNCTION public.guard_channel_approval_fields();

-- Guard: channel owners cannot inflate their own revenue/eligibility
CREATE OR REPLACE FUNCTION public.guard_channel_monetization_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.revenue_balance_cents := OLD.revenue_balance_cents;
  NEW.total_earnings_cents  := OLD.total_earnings_cents;
  NEW.is_eligible           := OLD.is_eligible;
  NEW.cpm_rate_cents        := OLD.cpm_rate_cents;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_channel_monetization_fields ON public.channel_monetization;
CREATE TRIGGER guard_channel_monetization_fields
BEFORE UPDATE ON public.channel_monetization
FOR EACH ROW EXECUTE FUNCTION public.guard_channel_monetization_fields();