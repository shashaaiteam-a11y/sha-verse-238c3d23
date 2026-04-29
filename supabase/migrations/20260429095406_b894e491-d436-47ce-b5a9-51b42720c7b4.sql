-- Fix 1: channel_monetization - prevent owners from modifying financial counters
-- Replace overly permissive UPDATE policy with a column-scoped trigger guard.

DROP POLICY IF EXISTS "monetization_update_policy" ON public.channel_monetization;
DROP POLICY IF EXISTS "Channel owners can update monetization" ON public.channel_monetization;
DROP POLICY IF EXISTS "Channel owner can update payout info" ON public.channel_monetization;

-- Allow channel owners to UPDATE their row, but a trigger blocks writes to financial columns.
CREATE POLICY "Channel owner can update payout info"
ON public.channel_monetization
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_monetization.channel_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_monetization.channel_id
      AND c.user_id = auth.uid()
  )
);

-- Trigger: block client-side changes to financial counters & eligibility flag.
CREATE OR REPLACE FUNCTION public.protect_monetization_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role / admin to bypass
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.revenue_balance_cents IS DISTINCT FROM OLD.revenue_balance_cents THEN
    RAISE EXCEPTION 'revenue_balance_cents cannot be modified by client';
  END IF;
  IF NEW.total_earnings_cents IS DISTINCT FROM OLD.total_earnings_cents THEN
    RAISE EXCEPTION 'total_earnings_cents cannot be modified by client';
  END IF;
  IF NEW.is_eligible IS DISTINCT FROM OLD.is_eligible THEN
    RAISE EXCEPTION 'is_eligible cannot be modified by client';
  END IF;
  IF NEW.channel_id IS DISTINCT FROM OLD.channel_id THEN
    RAISE EXCEPTION 'channel_id cannot be modified';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_monetization_financials_trigger ON public.channel_monetization;
CREATE TRIGGER protect_monetization_financials_trigger
BEFORE UPDATE ON public.channel_monetization
FOR EACH ROW
EXECUTE FUNCTION public.protect_monetization_financials();

-- Fix 2: poll_options - require caller to own the referenced post
DROP POLICY IF EXISTS "Authenticated users can create poll options" ON public.poll_options;
DROP POLICY IF EXISTS "Post owners can create poll options" ON public.poll_options;

CREATE POLICY "Post owners can create poll options"
ON public.poll_options
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = poll_options.post_id
      AND posts.user_id = auth.uid()
  )
);