-- 1. friendships: remove the weaker duplicate INSERT policy so every insert must be 'pending'
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;

-- 2. group_join_requests: restrict user-facing UPDATE to pending-only (no self-approval)
DROP POLICY IF EXISTS "Users can update own join requests" ON public.group_join_requests;
CREATE POLICY "Users can update own join requests"
  ON public.group_join_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 3. novachat_settings: block client-side writes to monetization/billing fields
CREATE OR REPLACE FUNCTION public.protect_novachat_pro_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- service_role (backend) and admins may change billing/pro fields freely
  IF auth.role() = 'service_role' OR auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  -- Regular users cannot modify pro / billing fields
  NEW.is_pro := OLD.is_pro;
  NEW.pro_expires_at := OLD.pro_expires_at;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_novachat_pro_fields_trigger ON public.novachat_settings;
CREATE TRIGGER protect_novachat_pro_fields_trigger
  BEFORE UPDATE ON public.novachat_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_novachat_pro_fields();